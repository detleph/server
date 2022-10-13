# Detleph / Server

> **Warning** **Uncharted territories ahead ⛵**
> This repostiory is part of the [Detleph](https://github.com/detleph) event management sytsem. If you want to deal with the server in isolation, this is the place for you. Otherwise, for **installation instructions, guides and other general information**, please visit the [parent repository](https://github.com/detleph/detleph).

## About 📑

Detleph is a modern event management system built with extensibility, scalability and ease-of-use in mind. This repository contains _all_ of the backend code, collectively called the _Detleph server_. It is the backbone of the system for storing, providing and managing all data related to your upcoming event(s).

### Technology ⚙

The server is build as a monolithic app with cutting-edge technologies, using Node.js:
Tech | Description
------------------- | --------
[![NodeJS](https://img.shields.io/badge/Node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/en/about/) | Fast JavaScript runtime
[![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)](https://expressjs.com/) | Simple, extensible web framework
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) | JavaScript with syntax for types
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io/) | Fully type-safe ORM
[![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/) | Relational database management system (main database)
[![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/) | Fast in-memory database (side database for OTPs, ...)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/) | Docker for fast and reproducible deployments
[![GitHub](https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white)](https://github.com/features) | For code hosting, collaboration, project planning and CI/CD
[REST](https://www.ibm.com/cloud/learn/rest-apis) | The whole API is designed around the REST principles

## Getting started 🆕

> **Note**
> As this repository only contains the server, this guide is only concerned with setting up the server and the API (which cannot, or rather should not, be used by _normal_ users)

> For instrcutions on how to set up a fully working system, see the [parent repository](https://github.com/detleph/detleph).

### Dependencies

Going furhter, we will assume that you have access to a UNIX-like OS and bash, Git and Docker. If you do not have access to any of these, please see:

- Bash, for _windows_: [WSL](https://docs.microsoft.com/en-us/windows/wsl/install) (Please make sure to install version 2)
- Docker: [Official website](https://docs.docker.com/get-docker/)
- Git: [Official website](https://git-scm.com/) (For Windows, please make sure to install Git in the WSL distro)

### Set up

#### Clone the repository:

```sh
git clone --recursive https://github.com/detleph/server.git
```

#### Create a file called `.env` with the following contents 📁

Please replace the text in angle braces (eg. `<password>`) with your own values (eg. `good?password`)

```
DATABASE_PASSWORD="<strong database password>"
PORT="3000"
DOMAIN="<server domain name>"
MAILPASSWORD="<strong mail server password>"
ALLOW_ORIGIN="*"
FRONTEND_MAIL_ENDPOINT="<link to be in verification email>"
```

For a detailed explanation of all these options (and some more), please visit the wiki (coming soon) 🧠

#### Start the databases, email server and detleph server 🌐

```sh
docker-compose up
```

#### Finished ✨

The server should now be running on port 3000 (`http://localhost:3000`)

## Usage 🏃

For detailed API documentation and usage guides, please see the wiki (coming soon)

## Development & Contributing 👩‍💻

Firstly, we are very excited to welcome any contributions to our projects and help prospective open-sourcerers! 👥
To get started with developing for the server (along with references for all the tooling, configuration and development modes), please take a look at the [CONTRIBUTING.md](https://github.com/detleph/server/blob/main/CONTRIBUTING.md) file in the repository

If you want to develop a feature and contribute it to the project, please check out our contributing guidelines and workflows in the CONTRIBUTING.md file

If you have any questions or issues, do not refrain from reaching out to us by opening an issue or reaching out to one of us (@stephan418, @Stefan-5422 or @Flexla54) directly 📫

## Issues ⚠

If you have any issues, questions or impulses relating to the server, feel free to open an issue on this repository or by [clicking here](https://github.com/detleph/server/issues/new)

## License 👩‍⚖️

The license for the server (most likely MIT) can be found in the `LICENSE` file

## Acknowledgements

We lots of amazing resources and projects graciously shared by the community in the development of this project:

- The [StackOverflow](https://stackoverflow.com/) community and site helped massively with their answers 🥇
