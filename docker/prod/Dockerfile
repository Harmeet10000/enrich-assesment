# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm ci

COPY src ./src
COPY docs ./docs
COPY webpack.config.js ./
COPY prometheus.yml ./
COPY .env.dev ./

RUN npm run build

# Stage 2: Production runtime
FROM node:22-alpine AS runtime

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN mkdir -p /app/logs /app/backups && chown -R appuser:appgroup /app

ENV NODE_ENV=production
ENV PORT=8000
ENV TZ=UTC

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/docs ./docs

COPY --from=builder /app/.env.dev ./.env.dev

COPY --from=builder /app/webpack.config.js ./webpack.config.js
COPY --from=builder /app/prometheus.yml ./prometheus.yml

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); const options = { hostname: 'localhost', port: process.env.PORT || 8000, path: '/api/health', timeout: 2000 }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => { process.exit(1); }); req.end();"

EXPOSE 8000

USER appuser

CMD ["node", "dist/index.cjs"]