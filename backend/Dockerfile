FROM node:24.15-alpine

WORKDIR /usr/src/app

RUN npm i -g pnpm@11.9.0

COPY package.json pnpm-lock.yaml ./

RUN pnpm approve-builds --all
RUN pnpm i --dangerously-allow-all-builds

COPY . .
RUN pnpm build

CMD ["npm", "run", "start:prod"]