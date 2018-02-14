# Compose Grand Tour - Node.js - Redis

This Compose Grand Tour application shows you how to connect to a Redis deployment using Node.js.

## Build notes

1. Install Node.js, using Homebrew:

    ```shell
    brew install node
    ```

2. Install Node.js modules specified in package.json:

    ```shell
    npm install
    ```

## Run notes

Set the `COMPOSE_REDIS_URL` environment variable to the Compose connection string for the Redis database. Remember to create a user for Redis and include that user's credentials in the URL.

To run the application:

1. `node server`
2. Open a browser tab and navigate to `http://localhost:8080`


