# Compose Grand Tour - Node.js - Elasticsearch

## Build notes

1. Install Node.js, using Homebrew:

    ```
    brew install node
    ```

2. Install Node modules specified in manifest.yml:

    ```
    npm install
    ```

The following environment variables need to be set:

* `COMPOSE_ELASTICSEARCH_URL` -  set to a comma delimited list of HTTPS URLs for Elasticsearch

## Example:

```
export COMPOSE_ELASTICSEARCH_URL=https://user:password@portal164-7.node-gt-elasticsearch.rrp.composedb.com:15646/,https://user:password@portal851-2.node-gt-elasticsearch.rrp.composedb.com:15646/
```


