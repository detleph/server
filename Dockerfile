# Dockerfile for the event management server

FROM node:17-alpine3.12

# Create directory for the app
RUN mkdir /home/server

# Selectively copy the required files and directories
ADD prisma/ /home/app/prisma/
ADD scripts/ /home/app/scripts/
ADD src/ /home/app/src/
COPY package-lock.json /home/app
COPY package.json /home/app
COPY tsconfig.json /home/app

# Change directory into the container
WORKDIR /home/app

# Install dependencies
RUN npm i -g typescript
RUN npm i

# Generate the prisma client
RUN npx prisma generate

# Compile TypeScript to JavaScript
RUN tsc

CMD ["sh", "scripts/docker-entrypoint.sh"]
