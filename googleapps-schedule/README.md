# スケジュールボット G Suite 版

## はじめに

このドキュメントは、direct と Google Apps を連携させたスケジュールボット(以下、ボット)について、各種設定から実行するまでの手順書となっています。そのため、direct および Google Apps の両サービスをご契約・ご利用中のものとしています。

まだ、ご利用でない方は、[direct](https://direct4b.com/ja/) および [Google Apps](https://www.google.co.jp/intx/ja/work/apps/business/) のそれぞれに無料トライアルがありますので、そちらをご参照ください。

## ボット用アカウントの取得

ボット用に、新しくメールアドレスを用意します。例えば、スケジュールボット用に用意したアドレスが `hubot-schedule@gmail.com` だとすると、`hubot-schedule@gmail.com` が direct のログインID、`hubot-schedule@gmail.com`が Google Apps のログインIDになるように登録します。

### direct 

通常のユーザと同じように、ボット用アカウントを作成します。

組織の管理ツールから、ボット用メールアドレスに招待メールを送信します。
管理ツールのご利用には権限が必要です。お持ちでない方は、契約者もしくは管理者にご連絡下さい。

組織に招待されると、ボット用メールアドレスにメールが届きます。
メールに記載されているURLをクリックしてアカウント登録手続きをしてください。

[ログインページ](https://direct4b.com/signin)からボット用メールアドレスでログインします。
招待を承認する画面が開きますので、その画面で「承認」を選択してください。
次に、設定＞プロフィール編集より、表示名とプロフィール画像をボット用に変更します。

### Google Apps

連携アプリケーションの作成と同じように、ボット用プロジェクトを作成します。

[Google Developer Console](https://console.developers.google.com/) からプロジェクトを追加します。Google Developer Consoleのご利用方法については、[こちらのヘルプページ](https://developers.google.com/console/help/new/#creatingdeletingprojects)をご参照ください。

メニュー「APIと認証」の API で Calendar API を有効にします。API の有効方法については、[こちらのヘルプページ](https://developers.google.com/console/help/new/#activatingapis)をご参照ください。

メニュー「APIと認証」の認証情報で、OAuth用に「新しいクライアントIDを作成」します。「インストールされているアプリケーション」「その他」の組み合わせで作成してください。認証情報の設定する方法については、[こちらのヘルプページ](https://developers.google.com/console/help/new/#generatingoauth2)をご参照ください。

## Node.js のインストール

[https://nodejs.org/](https://nodejs.org/) から LTS 版をインストールします。

## サンプルプログラムの設定

このリポジトリを `git clone` して `googleapps-schedule` ディレクトリに移動します。
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

Google Apps へのアクセスには、[OAuth2](https://developers.google.com/accounts/docs/OAuth2/)が利用されます。

以下の環境変数に、取得したアプリケーションIDおよびシークレットを設定します。

```sh
$ export GAPPS_CLIENT_ID=...
$ export GAPPS_CLIENT_SECRET=...
```

ボットに初めて話しかけたとき、コンソールにURLが表示されて処理が停止します。

```sh
$ bin/hubot
...
https://accounts.google.com/o/oauth2/auth?....
code? 
```

この URL をブラウザで開き、Google Apps の案件ボット用アカウントでログインします。ログインが成功すると認可画面が表示されますので承認してください。その後、コードが表示される画面になるので、コマンドラインに戻ってそのコードを入力します。

```sh
code? 4/aBcDeF...
```

トークンの情報は起動したディレクトリの ``.gdrive`` ファイルに保存されます。次回起動時はこの内容が読み込まれます。

### カレンダーの共有

ボットが書き込むカレンダーは、direct アカウントのメールアドレスと同じGoogle Apps上のカレンダーになります。例えば、``user1@gmail.com`` で direct にログインしている場合、Google Apps 上の ``user1@gmail.com`` のカレンダーが読み書きの対象となります。

上記のカレンダーに対して、スケジュールボットが読み書きできるように共有の設定をします。「カレンダー設定」の「このカレンダーを共有」のタブにおいて、スケジュールボットのメールアドレス(例えば ``hubot-schedule@gmail.com``) を「変更および共有の管理権限」で追加します。

## サンプルプログラムの実行

以下のコマンドを実行します。

```sh
$ bin/hubot
```
