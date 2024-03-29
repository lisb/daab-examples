# 議事録ボット for Google Workspace

## はじめに
このドキュメントは direct と Google Workspace を連携させた議事録ボット (以下、ボット) について、各種設定から実行するまでの手順書となっています。

direct および Google Workspace の両サービスをご利用中であることを前提としています。

## ボット用アカウントと認証情報の準備
### direct
ボット用アカウントを通常のユーザと同じように作成します。

所属する組織の管理ツールからボット用メールアドレスに招待を送信します。
管理ツールのご利用には権限が必要です。お持ちでない方は、契約者もしくは管理者にご連絡下さい。

招待メールを受信したらメールに記載されている URL をクリックしてアカウント登録をしてください。

登録が完了したらボットアカウントで direct にログインし、組織一覧画面から先ほど送信した招待を「承認」します。
ボットのプロフィール情報は右上のドロップダウンメニューにある「プロフィール編集」から変更可能です。

### Google Workspace
ボット用の Google アカウントを用意してください。

## 実行環境の準備
[このリポジトリ全体に対する README](../README.md) に従って準備してください。

## サンプルプログラムの準備
このリポジトリを `git clone` して `googleapps-schedule` ディレクトリに移動します。以降はこのディレクトリ内で作業します。

### direct
direct へのアクセスにはアクセストークンが必要です。以下のコマンドを実行し、ボット用のメールアドレスとパスワードを入力します。
```sh
$ daab login
...

Email: bot@example.com
Password: # no echo back
logged in.
```

`.env` ファイルが作成され、その中に `HUBOT_DIRECT_TOKEN` が保存されていれば成功です。

### Google Apps Script
このサンプルでは Workspace へのアクセスに Google Apps Script を利用します。

ボット用の Google アカウントでログイン後、[Apps Script のコンソール](https://script.google.com/home) から新しいプロジェクトを作成し、`"コード.gs"` の内容として `googleapps-minutes.gs` の内容をコピー & ペーストします。

次に API キーを作成 (※ パスワードを決めるときと同様に強力なキーを生成してください) し、先ほど作成したプロジェクトの `"コード.gs"` の 5 行目にある `"your API key"` の部分をそのキーに置換します。
```javascript
  if (req.parameters.apiKey == 'your API key') { // ここの your API key を生成したキーに変更する
```

Apps Script コンソールに戻り、右上の「デプロイ」ボタンから「新しいデプロイ」を選択します。
表示されたダイアログの左上にある「種類の選択」のギアアイコンをクリックし、「ウェブアプリ」を選択します。

そして「次のユーザーとして実行」を "自分" に、「アクセスできるユーザー」を "全員" とします。
(**注意！：これはサンプル向けの設定です。サンプルコードではリクエストに含まれた API キーを検証することで任意のアクセスをブロックしています。実運用される場合は所属する組織のポリシーに合わせて変更してください。**)

最後に「デプロイ」をクリックするとアクセス用の URL が発行されます。
この URL と先ほど生成した API キーを以下のように環境変数に設定します。
```sh
$ export MINUTES_BOT_URL=https://script.google.com/macros/s/.../exec # 発行された URL を指定してください
$ export MINUTES_BOT_API_KEY=Bei1Ha... # 実際に Apps Script へ設定した値と同じ値を指定してください
```

### Google Drive
サンプルに含まれている `議事録ひな形.docx` を Google Drive にアップロードし、一度 Dirve 上で開いて Google ドキュメントとして保存します。このときドキュメント名が「`議事録ひな形`」(拡張子無し) になっていることを確認してください。

## サンプルプログラムの実行
はじめに direct 上でボットが参加するグループトークを作成します。ペアトークでは正常に動作しません。

次に以下のコマンドで依存パッケージを準備します。
```sh
$ npm ci
```

最後に以下のコマンドでボットを起動します。
```sh
$ npm start
```

## ボットの利用方法
### 議事録を開始する
議事録ボットをグループトークに招待してください。

### 議事録を終了する
ユーザーが「終了」とメッセージを送ることで議事録ボットはトークから退出します。

### 議事録を設定する
`項目名: 値` というフォーマットでメッセージを送信すると、議事録ファイル内の項目に値を設定できます。

例えば「会議名」を設定する場合は以下のようにメッセージします。
```
会議名: 商品企画
```

「項目名」として使用できる文字列は以下の通りです。
- 会議名
- 場所
- 議題
- 重要
- 決定
- 宿題

### 議事録に記録しないメッセージを送る
`オフレコ: ` を先頭に付けてメッセージを送った場合、このメッセージは議事録に記録されません。
