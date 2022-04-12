// Description:
//   Google Workspace 上の案件管理スプレッドシートのデータを参照します。
// 
// Dependencies:
//   None
//
// Configuration:
//   ANKEN_WORKSHEET_NAME 案件管理ワークシートファイル名
//   GWS_CLIENT_SECRET_FILE 案件ボット用の OAuth2.0 クライアント認証情報ファイル (.json)
//
// Commands:
//   hubot 案件 - 最新5件の案件を表示します。
//   hubot <会社名>の件 - <会社名>の案件を表示します。(最新5件)
//   hubot <担当者名>さんの担当 - 先方担当者が<担当者名>の案件を表示します。(最新5件)
//   hubot 売上 - 今月と先月の売り上げを表示します。
//
// Author:
//   L is B corp.

const { google } = require('googleapis');
const lib = require('daab-examples-lib/google');

const GWS_CLIENT_SECRET_FILE = process.env.GWS_CLIENT_SECRET_FILE;
const GWS_CREDENTIAL_STORE_FILE = process.env.GWS_CREDENTIAL_STORE_FILE;
const ANKEN_WORKSHEET_NAME = process.env.ANKEN_WORKSHEET_NAME || '案件管理';
const ANKEN_FIELD = '会社名';
const ASSIGN_FIELD = '先方担当者名';

const sheets = google.sheets('v4');
const scopes = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets'
];
let driveFile = null;

module.exports = (robot) => {
  robot.hear(/準備開始[。．.]$/i, (res) => {
    lib.authorize(GWS_CLIENT_SECRET_FILE, scopes, GWS_CREDENTIAL_STORE_FILE)
      .then((auth) => {
        google.options({ auth });
        const drive = new lib.drive.Client(google.drive('v3'));
        res.send(`認可処理に成功しました。続いて「${ANKEN_WORKSHEET_NAME}」を探します...`);
        return drive.findDriveFileByName(ANKEN_WORKSHEET_NAME);
      })
      .then((file) => {
        driveFile = file;
        res.send(`スプレッドシートがみつかりました。${file.id}\n準備完了です。`);
      })
      .catch((err) => {
        robot.logger.error(err);
        res.send(`準備に失敗しました。設定を確認してください。`);
      });
  });

  robot.hear(/案件/i, (res) => {
    findAnken(driveFile, '', '')
      .then((records) => formatAnken(records))
      .then((text) => res.send(text))
      .catch(onError(res));
  });

  robot.hear(/([^。、.,]{2,})(の案?件).*/i, (res) => {
    findAnken(driveFile, ANKEN_FIELD, res.match[1])
      .then((records) => formatAnken(records))
      .then((text) => res.send(text))
      .catch(onError(res));
  });

  robot.hear(/([^。、.,]{1,5})(さん|くん|君).*/i, (res) => {
    findAnken(driveFile, ASSIGN_FIELD, res.match[1])
      .then((records) => formatAnken(records))
      .then((text) => res.send(text))
      .catch(onError(res));
  });

  const onError = (res) =>
    (err) => {
      res.robot.logger.error(err);
      res.send('エラーが発生しました。ボットのログを確認してください。');
    };
};

async function findAnken(file, field, value) {
  if (!file) {
    throw new Error(`invalid file: ${file}`);
  }
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: file.id,
    range: '案件管理!A1:H100', // NOTE: 大きめにとってもレスポンスには値を持つ範囲しか含まれない
  });
  return new lib.sheets.SheetTable(res.data.values).search(field, value);
}

function formatAnken(records) {
  if (!records || records.length < 1) {
    return 'みつかりませんでした。'
  } else {
    return records.map(r => formatRecord(r)).join("\n");
  }
}

function formatRecord(record) {
  return [
    `${record.value(ANKEN_FIELD)} (担当: ${record.value(ASSIGN_FIELD)})`,
    ` 見込み時期: ${record.value('見込み時期')}`,
    ` 確度: ${record.value('確度')}`,
    ` 製品名: ${record.value('製品名')} (単価: ${record.value('単価')}円)`,
    ` 小計: ${record.value('小計')}円 (ユーザー数: ${record.value('ユーザー数')}人)`,
    '',
  ].join("\n");
}
