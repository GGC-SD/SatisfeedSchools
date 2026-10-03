# SatisfeedSchools Docker

## Requirements

- Docker Desktop
- Node.js and npm
- A valid `code/.env` file

## DuckDNS and HTTPS

Create certificate folder:

```bash
mkdir -p certbot/conf
```

Request the certificate:

```bash
docker run --rm -it -p 80:80 \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  certbot/certbot certonly \
  --standalone \
  --email YOUR_EMAIL_ADDRESS \
  --agree-tos \
  --no-eff-email \
  -d ${SERVER_NAME}
```

## Run the application

Build and start from `code/docker`:

```bash
npm run build
npm run start
```

## Renew the certificate

```bash
docker run --rm -it -p 80:80 \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  certbot/certbot renew
```
