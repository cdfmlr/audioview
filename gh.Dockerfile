# Dockerfile for GitHub Action CI

FROM node:18.14.2-alpine3.17 as builder

WORKDIR /app

RUN npm install -g pnpm@7.29.0 

# pnpm fetch does require only lockfile
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .

RUN pnpm run build

# runtime
FROM nginx:1.23.3-alpine-slim

COPY --from=builder /app/dist/ /usr/share/nginx/html
# COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# nginx 不用 entrypoint
# ENTRYPOINT ["cat", "/etc/nginx/conf.d/default.conf"]
