FROM node:lts AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM node:lts-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --production

COPY ./bin ./bin
COPY ./public ./public
COPY --from=builder /usr/src/app/build ./build

ENV STUBIDP_SERVE_STATIC='public'

EXPOSE 8484

CMD [ "node", "bin/run.js" ]
