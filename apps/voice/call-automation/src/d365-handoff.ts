// Warm-transfer logic to the D365 Customer Service voice workstream.
// When GPT Realtime invokes the `escalate_to_human` tool, the orchestrator
// asks the ACS Call Automation API to transfer the participant leg to the
// D365 voice queue's communication identifier. The transfer is "warm"
// because we attach the conversation summary as custom context, which the
// D365 caseworker sees in the Omnichannel agent surface.

import { CallAutomationClient } from '@azure/communication-call-automation';
import type { Config } from './config.js';
import type { LogContext } from './logger.js';
import { logEvent, logError } from './logger.js';

export interface EscalationRequest {
  callConnectionId: string;
  reason: string;
  summary?: string;
}

export async function transferToD365Caseworker(
  client: CallAutomationClient,
  cfg: Config,
  req: EscalationRequest,
  ctx: LogContext,
): Promise<void> {
  const targetId = cfg.d365.transferTargetCommunicationId;
  if (!targetId) {
    logError(new Error('D365 transfer target identifier is not configured; cannot escalate'), ctx);
    return;
  }
  logEvent('escalation.transfer.start', ctx, {
    reason: req.reason,
    queueId: cfg.d365.voiceWorkstreamQueueId,
    summaryLength: req.summary?.length ?? 0,
  });
  try {
    const callConnection = client.getCallConnection(req.callConnectionId);
    await callConnection.transferCallToParticipant(
      { communicationUserId: targetId },
      {
        transferee: undefined,
        operationContext: JSON.stringify({
          udcspEscalation: {
            reason: req.reason,
            summary: req.summary ?? '',
            queueId: cfg.d365.voiceWorkstreamQueueId,
            country: cfg.country,
          },
        }),
      },
    );
    logEvent('escalation.transfer.requested', ctx, { reason: req.reason });
  } catch (err) {
    logError(err, ctx);
    throw err;
  }
}
