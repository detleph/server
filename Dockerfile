# Dockerfile for the event management server

FROM node:17-alpine3.12

# Create directory for the app
RUN mkdir /app

# Copy dependency files
COPY package.json package-lock.json /app/

# Change directory into the container
WORKDIR /app

RUN mkdir /app/media

# Install dependencies
RUN npm i -g typescript
RUN npm i

# Selectively copy the required files and directories
ADD prisma/ /app/prisma/
ADD scripts/ /app/scripts/
ADD src/ /app/src/
ADD resources/ /app/resources
COPY tsconfig.json /app/

# Generate the prisma client
RUN npx prisma generate

# Compile TypeScript to JavaScript
RUN tsc

CMD ["sh", "scripts/docker-entrypoint.sh"]
