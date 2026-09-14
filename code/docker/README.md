# SatisfeedSchools Docker

This folder runs the Next.js app and Nginx together:

```text
Nginx :80/:443 -> app:3000
```

Build and start from `code/docker`:

```sh
npm run build
npm run start
```

The app build uses `../.env.local` as a BuildKit secret. For local HTTPS,
place `localhost.crt` and `localhost.key` in `nginx/certs`.
