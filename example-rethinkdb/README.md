# Compose Grand Tour - Node.js - RethinkDB

This Compose Grand Tour application shows you how to connect to a RethinkDB deployment using Node.js.

## Build notes

1. Install Node.js, using Homebrew:

    ```shell
    brew install node
    ```

2. Install Node.js modules specified in manifest.yml:

    ```shell
    npm install
    ```

## Run notes

Set the `COMPOSE_RETHINKDB_URL` environment variable to the Compose connection string for the RethinkDB database. Remember to create a user for RethinkDB and include that user's credentials in the URL.

If you have a self-signed Compose database, you'll need to save the certificate file somewhere and set the `PATH_TO_RETHINKDB_CERT` environment variable with a path that points at that file.

To run the application:

1. `node server`
2. Open a browser tab and navigate to `http://localhost:8080`
