#!/bin/bash

DATABASE_PASSWORD=server docker-compose up -d mail postgres redis

if [ ! "$(docker ps -a | grep server_dev)" ]; then
    echo Creating "server_dev" container
    
    docker run -it \
        --name server_dev \
        --mount type=bind,source="$(pwd)",target=/app \
        --network server_default \
        -p 3000:3000 -e PORT=3000 \
        -e DATABASE_URL="postgresql://server:server@postgres:5432/management?schema=public" \
        -e DATABASE_USER=server \
        -e DATABASE_PASSWORD=server \
        --entrypoint "/app/scripts/docker-entrypoint.dev.sh" \
        node
else
    echo "Container \"server_dev\" already exists; Starting container"

    docker start -ia server_dev
fi

# After container termination

docker-compose stop
