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
COPY --from=builder /usr/src/app/build ./build

EXPOSE 3000

CMD [ "node", "bin/run.js" ]
