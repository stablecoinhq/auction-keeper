#!/bin/sh -eu
DOCKER_BUILDKIT=1

docker build . --target=application -t=auction-keeper:latest

## save image on .artifact
docker image save auction-keeper:latest > ./.artifacts/auction-keeper.tar

## scp image to aws instance
scp ./.artifacts/auction-keeper.tar ${KEEPER_DEPLOY_USER}@${KEEPER_DEPLOY_SERVER}:/tmp

## ssh into remote instance and start keeper
cat <<EOF | ssh ${KEEPER_DEPLOY_USER}@${KEEPER_DEPLOY_SERVER} 'bash -es'
sudo su
cd /tmp
docker load -i auction-keeper.tar
docker image prune -f
(sudo systemctl restart auction-keeper) || echo "Skip"
EOF
