#!/bin/bash

if ! test -f INITIALIZED; then
    touch INITIALIZED

    cd /app
    mkdir media

    npm i -g ts-node nodemon
    npm i
    npx prisma db push
fi

nodemon --watch /app /app/src/app.ts
