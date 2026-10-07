# SatisfeedSchools Docker

## Requirements

- Docker Desktop
- Node.js and npm
- A valid `code/.env` file

## Localhost

1. Set this value in `code/.env`:

```text
SERVER_NAME=localhost
```

2. From `code/docker`, build and start the application:

```bash
npm run build-local
npm run start
```

3. Open `http://localhost`.

## Certbot/HTTPS

1. Set your domain in `code/.env`:

```text
SERVER_NAME=domain.com
```

2. From `code/docker`, load the environment variable and create the certificate folder:

```bash
source ../.env
mkdir -p certbot/conf
docker compose stop frontend
```

3. Request the certificate and check:

```bash
MSYS_NO_PATHCONV=1 docker run --rm -it -p 80:80 \
  --mount "type=bind,source=$(pwd)/certbot/conf,target=/etc/letsencrypt" \
  certbot/certbot certonly \
  --standalone \
  --email YOUR_EMAIL_ADDRESS \
  --agree-tos \
  -d "$SERVER_NAME"

ls certbot/conf/live/"$SERVER_NAME"
ls certbot/conf/archive/"$SERVER_NAME"
```

4. Build and start the application:

```bash
npm run build
npm run start
```

## Renew the certificate

From `code/docker`, run:

```bash
source ../.env
docker run --rm -it -p 80:80 \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  certbot/certbot renew
```
