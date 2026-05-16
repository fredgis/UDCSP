// HTTP + WebSocket entry point for the voice orchestrator.
//
// Routes:
//   GET  /healthz                        liveness/readiness probe (Container App + AKS)
//   POST /api/acs/eventgrid              Event Grid webhook for IncomingCall (and validation handshake)
//   POST /api/acs/callbacks              ACS Call Automation lifecycle events
//   WS   /api/acs/media?callConnectionId ACS bidirectional Media Streaming socket
//
// The same process exposes Express HTTP and an upgrade-handler for the
// media WebSocket so ACS can open it inline.

import express from 'express';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { loadConfig, isLiveMode } from './config.js';
import { startTelemetry, logEvent, logError } from './logger.js';
import { CallHandler } from './call-handler.js';

async function main(): Promise<void> {
  const cfg = loadConfig();
  startTelemetry(cfg);
  logEvent('boot', { country: cfg.country }, { liveMode: isLiveMode(cfg), publicBaseUrl: cfg.publicBaseUrl });

  const handler = new CallHandler(cfg);
  handler.startOrphanCleanup();
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true, country: cfg.country, liveMode: isLiveMode(cfg), service: cfg.trace.serviceName });
  });

  app.post('/api/acs/eventgrid', async (req, res) => {
    try {
      await handler.handleEventGrid(req, res);
    } catch (err) {
      logError(err, {});
      if (!res.headersSent) res.sendStatus(500);
    }
  });

  app.post('/api/acs/callbacks', async (req, res) => {
    try {
      await handler.handleAcsCallback(req, res);
    } catch (err) {
      logError(err, {});
      if (!res.headersSent) res.sendStatus(500);
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    if (url.pathname !== '/api/acs/media') {
      socket.destroy();
      return;
    }
    // ACS Call Automation does not append a callConnectionId to the media
    // streaming URL. Prefer an explicit query parameter when present (so
    // future ACS versions or test harnesses can scope the connection
    // deterministically), otherwise fall back to the most-recent orphan
    // session that just answered a call and is waiting for its media WS.
    let callConnectionId = url.searchParams.get('callConnectionId') ?? '';
    if (!callConnectionId) {
      callConnectionId = handler.findOrphanSessionId() ?? '';
    }
    if (!callConnectionId) {
      logEvent('media.upgrade_rejected', {}, { reason: 'no_orphan_session', url: req.url ?? '' });
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, async (ws) => {
      try {
        logEvent('media.upgrade_accepted', { callConnectionId }, {});
        await handler.attachMediaSocket(callConnectionId, ws);
      } catch (err) {
        logError(err, { callConnectionId });
        ws.close();
      }
    });
  });

  server.listen(cfg.port, () => {
    logEvent('listen', {}, { port: cfg.port });
  });

  const shutdown = (signal: string) => {
    logEvent('shutdown', {}, { signal });
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logError(err, {});
  process.exit(1);
});
