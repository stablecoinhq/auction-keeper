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

### テスト用

Vow アドレス: `0xA950524441892A31ebddF91d3cEEFa04Bf454466`
Dog アドレス: `0x0E801D84Fa97b50751Dbf25036d067dCf18858bF`
Vat アドレス: `0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B`

### Dog.bark

ブロック 12317310 からフォークする

#### Flap

ブロック 9656038 からフォークして 6277547639945879759772735476619734373953489175 heal する

#### Flop

ブロック 9702726 からフォークして 43182088423581837831814105867170163957827142136124 heal する
