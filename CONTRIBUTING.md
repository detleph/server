# Developing for the Detleph Server 👷‍♂️

The Detleph Server comes with configuration and scripts for easy local development and hot reloading. This files describes how to set up your local system to get the best experience when developing.

> **Warning**
> The development script starts the server in a very insecure mode, exposes sensitive information stored in the database and disables a bunch of security features (such as **password requirements** for the databases), so it should **never** be used in any live environment accessible by untrusted actors.

## Setup

### Dependencies

Make sure you have all the prerequisites listed under the Dependencies section of the REAMDE.md file installed locally.

### Clone the server repository and its submodules

> **Note**
> This step assumes that you just want to experiment with the server locally (without merging the changes into the upstream branch). If you want to submit a contribution, please create a fork as described in the CONTRIBUTING.md file under "Create a fork" and then proceed to the next step here.

```sh
git clone --recursive https://github.com/detleph/server.git
```

### Start the server

The server comes with a simple development script which sets up the docker environment for hot reloading: 🔥

```sh
./dev.sh
```

This should set up the local environment and restart the server when changes are detected.

## Development script - Usage

### Container recreation prompts

If you start the `./dev.sh` script again after the server already has initialized once, it will ask you if you would like to recreate the server again. Genererally, you do not have to do this if the current configuration is working. If you, however, update the database schema or something similar, you will need to recreate both the server container _and_ the other services if prompted.

### CLI options

- `-s`: Remove all prompts and start the server with the default settings (eg. without recreating the containers
