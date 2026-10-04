ARG BUILD_TYPE=prod

FROM nginx:alpine AS base

FROM base AS if-prod
RUN --mount=type=secret,id=app_env,required=true \
    --mount=type=bind,from=certs,target=/certbot,ro \
    . /run/secrets/app_env && test -s "/certbot/conf/live/$SERVER_NAME/fullchain.pem" \
    && test -s "/certbot/conf/live/$SERVER_NAME/privkey.pem" \
    || (echo "ERROR: SSL certificate files are missing." && exit 1)
COPY default.conf /etc/nginx/conf.d/default.conf

FROM base AS if-dev
COPY default.dev.conf /etc/nginx/conf.d/default.conf

FROM if-${BUILD_TYPE} AS end-if
FROM end-if