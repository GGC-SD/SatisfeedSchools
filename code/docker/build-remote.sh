#!/bin/sh
# Build on another Docker server, then load the images here.
# Use an SSH address, such as ssh://user@server:22, with SSH key access.
set -eu
cd "$(dirname "$0")"

export DOCKER_HOST="${1:?Use an SSH address: ssh://user@server:22}"
npm run build
docker save -o satisfeed-nginx.tar satisfeed-nginx:latest
docker save -o satisfeed-schools.tar satisfeed-schools:latest
unset DOCKER_HOST
sudo docker load -i satisfeed-nginx.tar
sudo docker load -i satisfeed-schools.tar
rm satisfeed-nginx.tar satisfeed-schools.tar
