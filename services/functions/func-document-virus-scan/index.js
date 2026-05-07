module.exports = async function (context, event) {
  const traceparent = event?.traceparent || context.traceContext?.traceparent;
  context.log('Defender for Storage scan requested', { traceparent, blobUrl: event?.data?.url });
  context.bindings.lineage = { eventType: 'DocumentVirusScanRequested', subject: event?.subject, data: { traceparent, lineageSystem: 'Purview', scanStatus: 'requested' }, dataVersion: '1.0' };
};
