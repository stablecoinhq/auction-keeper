# auction-keeper

This application watches auction contracts

## Functionalities

- Monitor Vat contracts and initiate settlement auctions with Dog contracts if they find Vaults that need to be settled.
- Get list of auctions that's being held, bid them is possible.
- Listen to Vow contract and start auction if needed
- Bid on surplus/debt auction

## Setup

Prepare the following `.envs` files in the root of the directory

| Key         | Value                                     |
| ----------- | ----------------------------------------- |
| RPC_HOST    | mysql                                     |
| ILKS        | jdbc:mysql:                               |
| MNEMONIC    | Mnemonic                                  |
| FROM_BLOCK  | (For dog) Block to fetch from             |
| TO_BLOCK    | (For dog) Block to end                    |
| DOG_ADDRESS | Contract address of a dog contract        |
| VOW_ADDRESS | Contract address of a vow contract        |
| RUN_CLIP    | Flag indicate whether to participate clip |

## Executing

You can execute the keeper via docker

### docker

1. build

```
docker build . --target=application --tag=auction-keeper:latest
```

2. run

```
docker run --rm --name=auction-keeper -v $(pwd)/.env:/app/.env auction-keeper:latest
```