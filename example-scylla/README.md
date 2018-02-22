# Compose Grand Tour - Node.js - ScyllaDB

This Compose Grand Tour application shows you how to connect to a ScyllaDB deployment using Node.js.

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

The following environment variables need to be set

* COMPOSE_SCYLLADB_URL - the Compose connection string for the ScyllaDB database. Remember to create a user for ScyllaDB and include that user's credentials in the URL.
* COMPOSE_SCYLLADB_MAPS - the Address Translation Map for the ScyllaDB database. Copy the full contents as shown on your deployment's overview page.

### Examples

```
export COMPOSE_SCYLLADB_URL=https://scylla:password@aws-eu-west-1-portal7.dblayer.com:15678/node-gt-scylladb
export COMPOSE_SCYLLADB_MAPS='{"10.82.25.133:9042":"aws-eu-west-1-portal.7.dblayer.com:15678"','"10.82.25.134:9042":"aws-eu-west-1-portal.2.dblayer.com:15679","10.82.25.135:9042":"aws-eu-west-1-portal.1.dblayer.com:15680"}'
```

To run the application:

1. `node server`
2. Open a browser tab and navigate to `http://localhost:8080`


