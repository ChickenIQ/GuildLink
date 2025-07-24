FROM oven/bun:latest AS base
WORKDIR /app

FROM base AS install
COPY package.json bun.lock .
RUN bun install --frozen-lockfile --production

FROM base AS release
COPY --from=install /app/node_modules .
COPY . .

ENTRYPOINT ["bun", "run", "start"]