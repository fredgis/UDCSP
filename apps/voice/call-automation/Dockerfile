FROM node:22-alpine AS build
WORKDIR /app
COPY apps/voice/call-automation/package.json apps/voice/call-automation/tsconfig.json ./
RUN npm install --no-audit --no-fund
COPY apps/voice/call-automation/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
# Runtime assets resolved by src/ivr-loader.ts relative to repoRoot. The
# code does path.resolve(__dirname, '..', '..', '..', '..') from
# /app/dist/ivr-loader.js, which lands at '/'. So we mirror the repo layout
# under '/apps/voice/...' so readFileSync finds the YAMLs and the
# recording-disclosure markdown without code changes.
COPY apps/voice/recording-consent /apps/voice/recording-consent
COPY apps/voice/ivr               /apps/voice/ivr
COPY apps/voice/escalation        /apps/voice/escalation
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
