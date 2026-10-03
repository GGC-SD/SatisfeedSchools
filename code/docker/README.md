# SatisfeedSchools Docker

## Requirements

- Docker Desktop
- Node.js and npm
- A valid `code/.env` file

## DuckDNS and HTTPS

The test hostname is (`Replace satisfeed.duckdns.org in the Nginx config and certbot commands.`):

```text
satisfeed.duckdns.org
```

Create certificate folder:

```powershell
New-Item -ItemType Directory -Force certbot\conf
```

Request the certificate:

```powershell
docker run --rm -it -p 80:80 `
  -v "${PWD}\certbot\conf:/etc/letsencrypt" `
  certbot/certbot certonly `
  --standalone `
  --email YOUR_EMAIL_ADDRESS `
  --agree-tos `
  --no-eff-email `
  -d satisfeed.duckdns.org
```

Replace `YOUR_EMAIL_ADDRESS` with a valid email address.

## Run the application

This folder runs the Next.js app and nginx together:

```text
Nginx :80/:443 -> app:3000
```

Build and start from `code/docker`:

```powershell
npm run build
npm run start
```

## Renew the certificate

```powershell
docker run --rm -it -p 80:80 `
  -v "${PWD}\certbot\conf:/etc/letsencrypt" `
  certbot/certbot renew
```
