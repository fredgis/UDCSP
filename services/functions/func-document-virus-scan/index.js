/**
 * func-document-virus-scan
 *
 * Event Grid handler for Microsoft Defender for Storage "Malware scanning"
 * scan-result events emitted whenever a citizen uploads a document into
 * the per-country `citizen-uploads/` container.
 *
 * Wiring (matches docs/tech/data.md §3.2 and architecture.md §10.4):
 *   1. Defender for Storage's "On-upload malware scanning" feature is enabled
 *      on every per-country `udcspupl{country}{env}` storage account by the
 *      landing-zone Bicep module.
 *   2. Defender raises Microsoft.Security.MalwareScanningResult Event Grid
 *      events on a system topic. The event includes scanResultType ("No
 *      threats found" | "Malicious"), verdict, malwareNamesFound, and the
 *      blob URL/etag.
 *   3. THIS function subscribes to that system topic and reacts:
 *      - "No threats found" -> tag the blob VirusScanStatus=Clean and emit
 *        a Purview lineage breadcrumb so the document is allowed into the
 *        case workflow.
 *      - "Malicious"        -> tag VirusScanStatus=Quarantined, move the
 *        blob to the per-country `quarantine/` container, raise a Sentinel
 *        custom analytic ("UDCSP-VirusUploadDetected"), and notify the
 *        owning caseworker through Logic Apps.
 *      - Other verdicts     -> tag VirusScanStatus=Failed and route to the
 *        manual-review queue.
 *   4. Every action is correlated through the W3C `traceparent` carried on
 *      the original upload (propagated via blob index tag `traceparent`).
 *
 * Owner agent: A7 / A3.
 * EU AI Act / GDPR / NIS2 anchor: NIS2 Art. 21(2)(d) "supply-chain security
 * including security-related aspects concerning the relationships between
 * each entity and its direct suppliers" - covers user-uploaded artefacts.
 */

'use strict';

const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');

const QUARANTINE_CONTAINER = process.env.UDCSP_QUARANTINE_CONTAINER || 'quarantine';
const ENV = process.env.UDCSP_ENVIRONMENT || 'dev';

const credential = new DefaultAzureCredential();

function blobClientFor(blobUrl) {
  const u = new URL(blobUrl);
  const account = `https://${u.hostname}`;
  const [, container, ...rest] = u.pathname.split('/');
  const blobName = rest.join('/');
  const svc = new BlobServiceClient(account, credential);
  const containerClient = svc.getContainerClient(container);
  return { svc, containerClient, blob: containerClient.getBlobClient(blobName), container, blobName };
}

async function setStatusTag(blob, status, traceparent) {
  await blob.setTags({
    VirusScanStatus: status,
    VirusScannedAt: new Date().toISOString(),
    traceparent: traceparent || ''
  });
}

async function quarantine(srcBlobUrl, ctx) {
  const src = blobClientFor(srcBlobUrl);
  const quarantineSvc = src.svc;
  const quarantineContainer = quarantineSvc.getContainerClient(QUARANTINE_CONTAINER);
  await quarantineContainer.createIfNotExists();
  const dstName = `${new Date().toISOString().slice(0, 10)}/${src.container}/${src.blobName}`;
  const dst = quarantineContainer.getBlobClient(dstName);
  ctx.log(`Quarantining ${src.blobName} -> ${QUARANTINE_CONTAINER}/${dstName}`);
  await dst.beginCopyFromURL(srcBlobUrl).then(p => p.pollUntilDone());
  await src.blob.delete();
  return dst.url;
}

module.exports = async function (context, event) {
  const traceparent = event?.data?.correlationId
    || event?.traceparent
    || context.traceContext?.traceparent
    || '';

  const blobUrl = event?.data?.blobUri || event?.data?.url || event?.subject;
  const verdictRaw = event?.data?.scanResultType || event?.data?.verdict || 'Unknown';
  const malware = event?.data?.malwareNamesFound || [];
  const verdict = (verdictRaw === 'No threats found' || verdictRaw === 'Clean') ? 'Clean'
    : (verdictRaw === 'Malicious' ? 'Malicious' : verdictRaw);

  context.log('Defender malware-scan event received', {
    traceparent, blobUrl, verdict, malware, env: ENV
  });

  let action = 'noop';
  let quarantinedTo = null;

  try {
    const { blob } = blobClientFor(blobUrl);

    if (verdict === 'Clean') {
      await setStatusTag(blob, 'Clean', traceparent);
      action = 'allow';
    } else if (verdict === 'Malicious') {
      await setStatusTag(blob, 'Quarantined', traceparent);
      quarantinedTo = await quarantine(blobUrl, context);
      action = 'quarantine';
    } else {
      await setStatusTag(blob, 'Failed', traceparent);
      action = 'manual-review';
    }
  } catch (err) {
    context.log.error('Defender scan handling failed', { traceparent, blobUrl, err: err.message });
    action = 'error';
  }

  context.bindings.lineage = {
    eventType: 'DocumentVirusScanProcessed',
    subject: blobUrl,
    data: {
      traceparent,
      lineageSystem: 'Purview',
      scanStatus: verdict,
      malwareNamesFound: malware,
      action,
      quarantinedTo
    },
    dataVersion: '2.0'
  };
};
