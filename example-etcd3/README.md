# Compose Grand Tour - Node.js - etcd

This Compose Grand Tour application shows you how to connect to an etcd deployment using Node.js.

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

There are three environment variables to set:

### COMPOSE_ETCD_ENDPOINTS

`COMPOSE_ETCD_ENDPOINTS=https://sub1.host.1.composedb.com:port,https://sub2.host2.composedb.com:port`

This is a comma delimited list of endpoints available to the application. It is shown as the **Connection String** in the Comopose Console in this format:

```text
https://[username]:[password]@portal1324-25.dazzling-etcd-63.compose-3.composedb.com:23930
https://[username]:[password]@portal2349-4.dazzling-etcd-63.compose-3.composedb.com:23930
```

This would become

`COMPOSE_ETCD_ENDPOINTS=https://portal1324-25.dazzling-etcd-63.compose-3.composedb.com:23930,https://@portal2349-4.dazzling-etcd-63.compose-3.composedb.com:23930`

### COMPOSE_ETCD_USER

COMPOSE_ETCD_USER=root

This is the username to be used when connecting.

### COMPOSE_ETCD_PASS

COMPOSE_ETCD_PASS=SECRETPASSWORD

This is the password for the user.

To run the application:

1. `node server`
2. Open a browser tab and navigate to `http://localhost:8080`
