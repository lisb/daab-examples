# 議事録ボット G Suite 版

## はじめに

このドキュメントは、direct と Google Apps を連携させた議事録ボット(以下、ボット)について、各種設定から実行するまでの手順書となっています。そのため、direct および Google Apps の両サービスをご契約・ご利用中のものとしています。

まだ、ご利用でない方は、[direct](https://direct4b.com/ja/) および [Google Apps](https://www.google.co.jp/intx/ja/work/apps/business/) のそれぞれに無料トライアルがありますので、そちらをご参照ください。

## ボット用アカウントの取得

ボット用に、新しくメールアドレスを用意します。

### direct 

通常のユーザと同じように、ボット用アカウントを作成します。

組織の管理ツールから、ボット用メールアドレスに招待メールを送信します。
管理ツールのご利用には権限が必要です。お持ちでない方は、契約者もしくは管理者にご連絡下さい。

組織に招待されると、ボット用メールアドレスにメールが届きます。
メールに記載されているURLをクリックしてアカウント登録手続きをしてください。

[ログインページ](https://direct4b.com/signin)からボット用メールアドレスでログインします。
招待を承認する画面が開きますので、その画面で「承認」を選択してください。
次に、設定＞プロフィール編集より、表示名とプロフィール画像をボット用に変更します。


## Node.js のインストール

[https://nodejs.org/](https://nodejs.org/) から LTS 版をインストールします。

## サンプルプログラムの設定

このリポジトリを `git clone` して `googleapps-minutes` ディレクトリに移動します。
以降はこのディレクトリにて、コマンドライン (コマンドプロンプト) で作業することになります。

### direct

direct へのアクセスには、アクセストークンが利用されます。アクセストークンの取得には、アクセストークンを環境変数に設定していない状態で、以下のコマンドを実行し、ボット用のメールアドレスとパスワードを入力します。

```sh
$ bin/hubot
Email: loginid@bot.email.com
Password: *****
0123456789ABCDEF_your_direct_access_token
```

以下の環境変数に、アクセストークンを設定します。

```sh
$ export HUBOT_DIRECT_TOKEN=0123456789ABCDEF_your_direct_access_token
```

### Google Apps

Google Apps へのアクセスには、Google Apps Script の「Webアプリケーションとして導入」が利用されます。

Google Drive で新しいGoogle Apps Script を作成します。テンプレートとしては「ウェブアプリケーションとしてのスクリプ」を選択します。次に、議事録ボット用の Google Apps Script を[ダウンロード](googleapps-minutes.gs)して、テキストファイルで開いてその内容で置換します。

メニューから、公開 > 「Webアプリケーションとして導入」し、議事録ボットからアクセスできるように適切に権限を設定して公開します。このとき表示される「現在のウェブ アプリケーションの URL」を以下の環境変数に設定します。

```sh
$ export GAPPS_URL=https://script.google.com/a/macros/...
```

### 議事録テンプレート

Google Drive に ``議事録ひな形``というファイル名でテンプレートファイルを置きます。

[テンプレートファイルのサンプル](議事録ひな形.docx)をダウンロードできます。このファイルは Word 形式になっていますので、Google Driveにアップロードするときは Google document に変換してください。

## サンプルプログラムの実行

以下のコマンドを実行します。

```sh
$ bin/hubot
```
