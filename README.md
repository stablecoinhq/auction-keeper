# auction-keeper

This application watches auction contracts

## Functionalities

- Monitor Vat contracts and initiate settlement auctions with Dog contracts if they find Vaults that need to be settled.
- Get list of auctions that's being held, bid them is possible.
- Listen to Vow contract and start debt/surplus auction if needed
- Bid on surplus/debt auction

## Setup

Prepare the following `.envs` files in the root of the directory

| Key              | Value                                             |
| ---------------- | ------------------------------------------------- |
| RPC_HOST         | Websocket rpc url                                 |
| ILKS             | List of ilks to participate in collateral auction |
| MNEMONIC         | Mnemonic                                          |
| FROM_BLOCK       | Block to fetch past events from                   |
| TO_BLOCK         | Block to end                                      |
| CHAINLOG_ADDRESS | Address of a chainlog contract                    |
| RUN_CLIP         | Flag indicate whether to participate clip         |
| SLACK_TOKEN      | Slack token                                       |
| SLACK_CHANNEL    | Slack channel                                     |

## Executing

You can execute the keeper via docker

### docker

1. build

```
docker build . --target=application --tag=auction-keeper:latest
```

2. run

```
docker run --rm --name=auction-keeper -v $(pwd)/.env:/app/.env -v $(pwd)/database:/app/database $(pwd)/logs:/app/logs auction-keeper:latest
```

or with docker-compose

```
docker-compose up
```

### Deploying to AWS EC2 instance

```
bash scripts/deploy-keeper.sh
```
