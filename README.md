# Auction keeper

MakerDAOのオークションに関する操作を自動化するソフトウェア

## 機能

- Vatコントラクトを監視し、精算が必要なVaultを見つけた場合にはDogコントラクトを使って精算オークションを開始する。
- Clipperコントラクトから入札可能なオークション一覧を取得し、入札を行う。

## セットアップ

ディレクトリのrootに以下の`.envs`ファイルを用意する

```
RPC_HOST="JSON-RPCのURL"
VAT_ADDRESS="Vatコントラクトアドレス"
DOG_ADDRESS="Dogコントラクトアドレス"
CLIP_ADDRESS="Clipコントラクトアドレス"
MNEMONIC="ニーモニック"
```

## 実行

### docker

1. ビルド

```
docker build . --target=application --tag=auction-keeper:latest
```

2. 実行

```
docker run --rm --name=auction-keeper -v $(pwd)/.env:/app/.env auction-keeper:latest
```