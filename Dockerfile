ARG NODE_VERSION=16.17.0

FROM node:${NODE_VERSION}-buster-slim AS builder

WORKDIR "/app"
COPY package.json .
COPY package-lock.json .
COPY tsconfig.json .
COPY tsconfig.base.json .
COPY core core
COPY keeper keeper
RUN --mount=type=cache,target=/root/.npm \
    npm ci
RUN npm run build
RUN npm prune --omit=dev

FROM node:${NODE_VERSION}-buster-slim AS application

WORKDIR "/app"
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/core core
COPY --from=builder /app/keeper keeper
COPY --from=builder /app/node_modules ./node_modules

CMD [ "node", "./keeper/dist/src/index.js"]