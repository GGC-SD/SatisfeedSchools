ARG BUILD_TYPE=prod

FROM nginx:alpine AS base

FROM base AS if-prod
COPY default.conf /etc/nginx/conf.d/default.conf
RUN --mount=type=secret,id=app_env,required=true \
    --mount=type=bind,from=certs,target=/certs,ro \
    . /run/secrets/app_env \
    && cd "/certs/$SERVER_NAME" \
    && cert="$(ls fullchain*.pem | sort -V | tail -n 1)" \
    && test -s "$cert" && test -s "privkey${cert#fullchain}" \
    && sed -i "s|\${SERVER_NAME}|$SERVER_NAME|g" /etc/nginx/conf.d/default.conf \
    || (echo "ERROR: Check SERVER_NAME and certificates." && exit 1)

FROM base AS if-dev
COPY default.dev.conf /etc/nginx/conf.d/default.conf

FROM if-${BUILD_TYPE} AS end-if
FROM end-if