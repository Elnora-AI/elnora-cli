FROM node:20-slim AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod

FROM base AS build
COPY . .
RUN pnpm build

FROM node:20-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

EXPOSE 3000
CMD ["node", "dist/cli.js", "mcp", "serve", "--http"]
