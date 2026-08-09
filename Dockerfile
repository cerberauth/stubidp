FROM node:lts AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM node:lts-slim AS deps

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --production

FROM node:lts-slim

ENV NODE_ENV=production
ENV STUBIDP_SERVE_STATIC='public'

WORKDIR /usr/src/app

COPY --chown=node:node --from=deps /usr/src/app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node ./bin ./bin
COPY --chown=node:node --from=builder /usr/src/app/public ./public
COPY --chown=node:node --from=builder /usr/src/app/build ./build

USER node

EXPOSE 8484

HEALTHCHECK --interval=30s --timeout=3s CMD node -e "require('http').get('http://localhost:8484/', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD [ "node", "bin/run.js" ]
