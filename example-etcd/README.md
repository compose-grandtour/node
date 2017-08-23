# Compose Grand Tour - Node.js - etcd

## Build notes

1. Install Node.js, using Homebrew:

    ```
    brew install node
    ```

2. Install Node modules specified in manifest.yml:

    ```
    npm install
    ```

## Run notes

The following environment variable needs to be set:

* `COMPOSE_ETCD_URL` -  set to an HTTPS URL for Etcd

## Example:

```
export COMPOSE_ETCD_URL=https://user:password@portal561-3.node-gt-etcd.rrp.composedb.com:15208/v2/keys
```


