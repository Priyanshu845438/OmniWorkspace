# Multi-stage production container for OmniWorkspace Universal AI Platform
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production runtime
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV OMNI_WORKSPACE_ROOT=/app/workspace

RUN apk add --no-cache dumb-init git

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist-client ./dist-client
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/plugins ./plugins

RUN mkdir -p /app/workspace/.omni-data && chown -R node:node /app

EXPOSE 3001

USER node

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist-server/index.js"]
