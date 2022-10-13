# Auction keeper

MakerDAO のオークションに関する操作を自動化するソフトウェア

## 機能

- Vat コントラクトを監視し、精算が必要な Vault を見つけた場合には Dog コントラクトを使って精算オークションを開始する。
- Clipper コントラクトから入札可能なオークション一覧を取得し、入札を行う。

## セットアップ

ディレクトリの root に以下の`.envs`ファイルを用意する

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

TODO:

- Jug が`drip`を読んだ際に担保率が変動した通貨に関する Vault が精算されるか調べる
- Spot が`poke`を読んだ際に価格が変動した通貨に関する Vault が精算されるか調べる

### テスト用

### Flap

ブロック 9656038 からフォークして 6277547639945879759772735476619734373953489175 heal する

### Flop

ブロック 9702726 からフォークして 43182088423581837831814105867170163957827142136124 heal する
