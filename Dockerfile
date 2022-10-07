ARG NODE_VERSION=16.17.0

FROM node:${NODE_VERSION}-buster-slim AS builder

WORKDIR "/app"
COPY package.json .
COPY package-lock.json .
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:${NODE_VERSION}-buster-slim AS application

WORKDIR "/app"
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

CMD [ "node", "./dist/src/index.js"]