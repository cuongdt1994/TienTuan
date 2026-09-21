FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY . .
RUN npx prisma generate && npm run build

FROM deps AS prod-deps
RUN npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/generated ./generated
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
