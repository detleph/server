#!/bin/bash

DATABASE_PASSWORD=server COMPOSE_PROJECT_NAME=detleph_server docker-compose up -d mail postgres redis

if [ ! "$(docker ps -a | grep detleph_server_dev)" ]; then
    echo "Creating the server container"
    
    docker run -it \
        --name detleph_server_dev \
        --mount type=bind,source="$(pwd)",target=/app \
        --network detleph_server_default \
        -p 3000:3000 -e PORT=3000 \
        -e DATABASE_URL="postgresql://server:server@postgres:5432/management?schema=public" \
        -e DATABASE_USER=server \
        -e DATABASE_PASSWORD=server \
        --entrypoint "/app/scripts/docker-entrypoint.dev.sh" \
        node
else
    echo "The server container already exists; Starting..."

    docker start -ia detleph_server_dev
fi

# After container termination

COMPOSE_PROJECT_NAME=detleph_server docker-compose stop
