const crypto = require('crypto');
module.exports = async function (context, req) {
  const traceId = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  const spanId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const traceparent = req.headers?.traceparent || `00-${traceId}-${spanId}-01`;
  context.res = { status: 200, headers: { traceparent }, body: { traceparent, correlationId: req.headers?.['x-correlation-id'] || context.invocationId } };
};
