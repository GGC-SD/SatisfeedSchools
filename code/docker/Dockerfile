FROM node:22-alpine
WORKDIR /app

COPY --chown=1001:1001 . .
RUN npm ci
RUN --mount=type=secret,id=app_env,target=/app/.env.local,required=true npm run build && chown -R 1001:1001 .next

ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
USER 1001:1001
EXPOSE 3000

CMD ["npm", "start"]
