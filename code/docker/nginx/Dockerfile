ARG BUILD_TYPE=prod

FROM nginx:alpine AS base

FROM base AS if-prod
COPY default.conf /etc/nginx/conf.d/default.conf

FROM base AS if-dev
COPY default.dev.conf /etc/nginx/conf.d/default.conf

FROM if-${BUILD_TYPE} AS end-if
FROM end-if