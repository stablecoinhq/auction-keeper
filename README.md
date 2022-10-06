# Auction keeper

MakerDAOのオークションに関する操作を自動化するソフトウェア

## 機能

- Vatコントラクトを監視し、精算が必要なVaultを見つけた場合にはDogコントラクトを使って精算オークションを開始する。
- Clipperコントラクトから入札可能なオークション一覧を取得し、入札を行う。

## セットアップ

ディレクトリのrootに以下の`.envs`ファイルを用意する

```
RPC_HOST="GethのRPC URL"
VAT_ADDRESS="Vatコントラクトのアドレス"
DOG_ADDRESS="DogコントラクトのアドレスÏ"
```