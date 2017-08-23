# Compose Grand Tour - Node.js - Elasticsearch

This Compose Grand Tour application shows you how to connect to an Elasticsearch deployment using Node.js.

## Build notes

1. Install Node.js, using Homebrew:

    ```
    brew install node
    ```

2. Install Node.js modules specified in manifest.yml:

    ```
    npm install
    ```

## Run notes

Set the `COMPOSE_ELASTICSEARCH_URL` environment variable to the Compose connection string for the Elasticsearch database. Remember to create a user for Elasticsearch and include that user's credentials in the URL.

To run the application:

1. `node server`
2. Open a browser tab and navigate to `http://localhost:8080`


