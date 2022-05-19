#!/bin/bash
D_SERVICES="mail postgres redis"

DATABASE_PASSWORD=server COMPOSE_PROJECT_NAME=detleph_server docker-compose up -d $D_SERVICES

# Flag: Should the container be deleted and created again?
RECREATE=true
D_PORT="${PORT:-3000}"

if [ "$(docker ps -a | grep detleph_server_dev)" ]; then
    echo "The dev server is already on the system!"

    RECREATE=false

    # Use -s flag to skip any prompts
    if [ "$1" != "-s" ]; then
        echo "Do you want to recreate it? [y/n]"
        read input

        if [ "$input" = "y" ]; then
            RECREATE=true
        fi
    fi

    if [ "$RECREATE" = true ]; then
        echo "Removing container"
        docker rm detleph_server_dev
        rm -f INITIALIZED # Flag has to be reset

        echo "Do you also want to reset the other services? [y/n]"
        read input

        if [ "$input" = "y" ]; then
            COMPOSE_PROJECT_NAME=detleph_server docker-compose down
            DATABASE_PASSWORD=server COMPOSE_PROJECT_NAME=detleph_server docker-compose up -d $D_SERVICES
        fi

    else
        echo "Starting existing container"
        docker start -ia detleph_server_dev
    fi
fi

if [ "$RECREATE" = true ]; then
    echo "Creating the dev container"

    docker run -it \
        --name detleph_server_dev \
        --mount type=bind,source="$(pwd)",target=/app \
        --network detleph_server_default \
        -e DATABASE_PASSWORD=server \
        -e DATABASE_URL="postgresql://server:server@postgres:5432/management?schema=public" \
        -e NODE_ENV="development" \
        --entrypoint "/app/scripts/docker-entrypoint.dev.sh" \
        node
fi
COMPOSE_PROJECT_NAME=detleph_server docker-compose stop
