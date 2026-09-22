# SatisfeedSchools Docker

## Requirements

- Docker Desktop
- Node.js and npm
- A valid `code/.env.local` file

The environment file and certificate files are not included in Git.

## Run the application

This folder runs the Next.js application and Nginx together:

```text
Nginx :80/:443 -> app:3000
```

Build and start from `code/docker`:

```powershell
npm run build
npm run start
```

Check the containers:

```powershell
docker compose ps
```

Stop the application:

```powershell
docker compose down
```

The application build uses `../.env.local` as a BuildKit secret.

## DuckDNS and HTTPS

The test hostname is:

```text
satisfeed.duckdns.org
```

Create the certificate folders:

```powershell
New-Item -ItemType Directory -Force certbot\conf
New-Item -ItemType Directory -Force certbot\www
```

Request the certificate:

```powershell
docker run --rm -it `
  -v "${PWD}\certbot\conf:/etc/letsencrypt" `
  -v "${PWD}\certbot\www:/var/www/certbot" `
  certbot/certbot certonly `
  --webroot `
  --webroot-path /var/www/certbot `
  --email YOUR_EMAIL_ADDRESS `
  --agree-tos `
  --no-eff-email `
  -d satisfeed.duckdns.org
```
