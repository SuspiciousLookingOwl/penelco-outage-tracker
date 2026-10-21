FROM node:24-alpine AS build

WORKDIR /app

RUN npm i -g pnpm@11.9.0

COPY package.json pnpm-lock.yaml ./
RUN pnpm i --frozen-lockfile

COPY . .
RUN pnpm build

FROM alpine:3.20

COPY --from=build /app/build/client /app/dist

CMD ["sh", "-c", "rm -rf /export/* && cp -r /app/dist/. /export/"]
