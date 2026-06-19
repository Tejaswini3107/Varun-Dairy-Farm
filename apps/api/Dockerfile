FROM node:20-alpine
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app
COPY .npmrc package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --no-frozen-lockfile
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm --filter @varun/database generate
WORKDIR /app/apps/api
RUN pnpm run build

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/apps/api/src/index.js"]
