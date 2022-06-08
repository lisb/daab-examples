# daab Examples
このリポジトリは daab SDK を使ったボットのサンプルプロジェクトを含んでいます。

## 必須要件
これらのプロジェクトを実行するためには以下のソフトウェアが必要です。
- Node.js (LTS ver.)
- Redis
- [daab CLI](https://github.com/lisb/daab)

### Node.js
daab SDK は Node.js を使っています。インストールするバージョンは LTS 版を推奨します。

Node.js のインストール方法については [nodejs.org](https://nodejs.org/) をご覧ください。

### Redis
daab SDK を使って作成したボットはデフォルトで Redis を使います。Redis をインストールしなくても動作しますが、その場合は `robot.brain` にセットした情報がメモリ上にのみ保持されることになります。

Redis のインストール方法と設定については [redis.io](https://redis.io/) をご覧ください。

### daab CLI
daab CLI は daab SDK を使ったボット開発をサポートするためのコマンドラインツールです。

Node.js をインストールした後、以下のコマンドでインストールします。
```sh
$ npm install -g daab
```

daab CLI の最新版がインストールされていることを確認してください。

## 実行方法
各サンプルプロジェクトの README をご覧ください。
