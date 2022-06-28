// Description:
//   Google Drive の日報フォルダに日報を作成します。
//
// Dependencies:
//   None
//
// Configuration:
//   GWS_CLIENT_SECRET_FILE 案件ボット用の OAuth2.0 クライアント認証情報ファイル (.json)
//   DAILY_REPORT_FOLDER_NAME 日報を保存する Google Drive 上のフォルダ名
//   DAILY_REPORT_TEMPLATE_NAME 日報のテンプレートファイル名
//   DAILY_REPORT_API_KEY 日報 API (Google Apps Script) の API キー
//   DAILY_REPORT_API_URL 日報 API (Google Apps Script) のエンドポイント URL
//
// Commands:
//
// Author:
//   L is B Corp.

const { google } = require('googleapis');
const lib = require('daab-examples-lib/google');
const fetch = require('node-fetch');

const GWS_CLIENT_SECRET_FILE = process.env.GWS_CLIENT_SECRET_FILE;
const GWS_CREDENTIAL_STORE_FILE = process.env.GWS_CREDENTIAL_STORE_FILE;
const DAILY_REPORT_FOLDER_NAME = process.env.DAILY_REPORT_FOLDER_NAME || '日報ボット';
const DAILY_REPORT_TEMPLATE_NAME = process.env.DAILY_REPORT_TEMPLATE_NAME || '日報テンプレート';
const DAILY_REPORT_API_KEY = process.env.DAILY_REPORT_API_KEY || 'your API key';
const DAILY_REPORT_API_URL = process.env.DAILY_REPORT_API_URL;

let drive = null;

async function setupGoogleClients() {
  if (drive) {
    return;
  }

  const auth = await lib.authorize(
    GWS_CLIENT_SECRET_FILE,
    ['https://www.googleapis.com/auth/drive'],
    GWS_CREDENTIAL_STORE_FILE
  );
  google.options({ auth });

  drive = new lib.drive.Client(google.drive('v3'));
}

const notifyBotError = (res) => (err) => {
  res.robot.logger.error(err);
  res.send('ボットでエラーが発生しました。ログを確認してください。');
};

module.exports = (robot) => {
  setupGoogleClients()
    .then(() => robot.logger.info('setup:', 'bot authorized'))
    .catch((err) => robot.logger.error('setup:', err));

  const brain = robot.brain;

  robot.join((res) => {
    const [userA, userB] = res.message.roomUsers;
    res.message.user = res.message.user.id === userA.id ? userB : userA; // ! FIXME
    setState(brain, getUserCode(res), BotStates.IDLE);
    runBotStateAction(brain, res, '').catch(notifyBotError(res));
  });

  robot.respond(/日報$/i, (res) => {
    findDailyReports(drive)
      .then((reports) => {
        if (reports && reports.length > 0) {
          res.send(messageDailyReports(reports));
        } else {
          res.send(messageDailyReportNotFound());
        }
      })
      .catch(notifyBotError(res));
  });

  robot.respond(/((.|[\n\r])*)/, (res) => {
    const text = res.match[1];
    if (!isTextMessage(text) || text === '日報') {
      return;
    }
    runBotStateAction(brain, res, text).catch(notifyBotError(res));
  });

  robot.respond('select', (res) => {
    if (res.json.response !== undefined && res.json.response !== null) {
      const selected = res.json.options[res.json.response];
      runBotStateAction(brain, res, selected).catch(notifyBotError(res));
    }
    res.finish();
  });
};

// helper functions

function isTextMessage(m) {
  try {
    return JSON.parse(m)['in_reply_to'] === undefined;
  } catch (_) {
    return true;
  }
}

function getUserName(res) {
  return res.message.user.name;
}

function getUserCode(res) {
  const [local] = res.message.user.email.split('@');
  return local;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}/${month}/${day}`;
}

function createDailyReportName(res) {
  const instant = new Date();
  return `${formatDate(instant).replace(/\//g, '')}-${getUserName(res)}`;
}

// brain ops

function setState(brain, key, state) {
  const instant = Date.now();
  brain.set(key, `${state}@${instant}`);
}

function getState(brain, key) {
  return brain.get(key);
}

function currentState(brain, key) {
  const saved = getState(brain, key);
  if (!saved) {
    return BotStates.IDLE;
  }
  const [state, time] = saved.split('@');

  const currentTime = Date.now();
  const stateTime = Number(time);
  if (currentTime - stateTime > 3600 * 1000) {
    return BotStates.IDLE;
  } else {
    return state;
  }
}

async function runBotStateAction(brain, res, text) {
  const key = getUserCode(res);
  const state = currentState(brain, key);

  const action = botStateActions[state];
  if (action) {
    const nextState = await action(res, text);
    if (nextState) {
      setState(brain, key, nextState);
      return;
    }
  }
  res.send(messageStatusError());
  setState(brain, key, BotStates.IDLE);
}

// state actions

const ReportFields = {
  NAME: 'name',
  DATE: 'date',
  WORK: 'work',
  SCORE: 'score',
  MEMO: 'memo',
};

const BotStates = {
  IDLE: 'idle',
  INPUT_DONE: 'input_done',
  INPUT_SCORE: 'input_score',
  INPUT_MEMO: 'input_memo',
};

const botStateActions = {};

botStateActions[BotStates.IDLE] = async (res /*, text */) => {
  const report = await getOrCreateTodayReport(drive, createDailyReportName(res));
  res.robot.logger.info('prepared:', report.id);

  const text = messageBeginReport(getUserName(res), formatDate(new Date()));
  res.send({ stamp_set: 3, stamp_index: '1152921507291203590', text });
  return BotStates.INPUT_DONE;
};

botStateActions[BotStates.INPUT_DONE] = async (res, text) => {
  if (text.match(/^(\.|．|。|次へ)$/)) {
    res.send(messageInputScore());
    return BotStates.INPUT_SCORE;
  } else {
    const report = await getOrCreateTodayReport(drive, createDailyReportName(res));
    await updateTodayReport(res, report.id, ReportFields.WORK, text);
    res.send(messageInputOngoing('業務'));
    return BotStates.INPUT_DONE;
  }
};

function formatScore(score) {
  if (0 < score && score < 100) {
    return `${score}%`;
  } else if (score === 0) {
    return '着手直後';
  } else if (score === 100) {
    return '達成';
  } else {
    return null;
  }
}

botStateActions[BotStates.INPUT_SCORE] = async (res, text) => {
  const score = Number(text);
  if (0 <= score && score <= 100) {
    const formatted = formatScore(score);
    const report = await getOrCreateTodayReport(drive, createDailyReportName(res));
    await updateTodayReport(res, report.id, ReportFields.SCORE, formatted);
    res.send(messageInputMemo());
    return BotStates.INPUT_MEMO;
  } else {
    res.send(messageInputScore());
    return BotStates.INPUT_SCORE;
  }
};

botStateActions[BotStates.INPUT_MEMO] = async (res, text) => {
  const report = await getOrCreateTodayReport(drive, createDailyReportName(res));
  if (text.match(/^(.|．|。|次へ)$/)) {
    const text = messageEndReport(getUserName(res), report);
    res.send({ stamp_set: 3, stamp_index: '1152921507291204249', text });
    return BotStates.IDLE;
  } else {
    let content;
    if (text.match(/^今ココ/)) {
      content = text.replace(/[\r\n]/g, ' ').replace(/http/, '\nhttp');
    } else {
      content = text;
    }
    await updateTodayReport(res, report.id, ReportFields.MEMO, content);
    res.send(messageInputOngoing('所感・学び'));
    return BotStates.INPUT_MEMO;
  }
};

// Drive and Docs ops

let reportFolderId = null;
let reportTemplateFileId = null;
let reports = new Map();

async function getReportFolderId(drive) {
  if (reportFolderId) {
    return reportFolderId;
  }

  const folder = await drive.getFolder(DAILY_REPORT_FOLDER_NAME);
  if (!folder) {
    throw new Error(`folder not found: ${DAILY_REPORT_FOLDER_NAME}`);
  }
  return (reportFolderId = folder.id);
}

async function getReportTemplateFileId(drive) {
  if (reportTemplateFileId) {
    return reportTemplateFileId;
  }

  const folderId = await getReportFolderId(drive);
  const template = await drive.getFileByName(DAILY_REPORT_TEMPLATE_NAME, folderId);
  if (!template) {
    throw new Error(`template file not found: ${DAILY_REPORT_TEMPLATE_NAME}`);
  }
  return (reportTemplateFileId = template.id);
}

async function findDailyReports(drive) {
  const folderId = await getReportFolderId(drive);
  return await drive.getFiles(folderId);
}

async function getOrCreateTodayReport(drive, name) {
  if (reports.has(name)) {
    return reports.get(name);
  }

  const folderId = await getReportFolderId(drive);
  const report = await drive.getFileByName(name, folderId);
  if (report) {
    reports.set(name, report);
    return report;
  }

  const templateId = await getReportTemplateFileId(drive);
  const newReport = await drive.copyFile(templateId, name);
  reports.set(name, newReport);
  return newReport;
}

async function updateTodayReport(res, docId, field, text) {
  const data = {
    reportFileId: docId,
    requests: [
      { location: ReportFields.NAME, text: getUserName(res) },
      { location: ReportFields.DATE, text: formatDate(new Date()) },
      { location: field, text },
    ],
  };

  const options = {
    method: 'POST',
    body: JSON.stringify({ apiKey: DAILY_REPORT_API_KEY, data }),
  };
  const response = await (await fetch(DAILY_REPORT_API_URL, options)).json();
  res.robot.logger.info('updateTodayReport:', response);
}

// response messages

const messageDailyReports = (files) => files.map(messageDailyReport).join('\n\n');
const messageDailyReport = (file) => [file.name, file.webViewLink].join('\n');

const messageBeginReport = (username, today) =>
  [
    `${username}さん、お疲れ様です。`,
    `本日(${today})はどんな業務をしましたか？`,
    `1件1メッセージでお願いします。`,
  ].join('\n');

const messageInputOngoing = (title) => ({
  question: `他にも${title}があれば教えて下さい。\nなければ「。」もしくは「次へ」を選んで下さい。`,
  options: ['次へ'],
});

const messageInputScore = () => ({
  question: `目標達成度はどのくらいですか？\n数値で教えて下さい。`,
  options: ['0', '30', '50', '80', '100'],
});

const messageInputMemo = () =>
  [
    '所感・学びを教えて下さい。',
    '画像や動画、今ココスタンプも使えます。',
    'メッセージを分けることで複数の報告ができます。',
  ].join('\n');

const messageEndReport = (username, report) =>
  [
    '業務報告を書き込みました。',
    report.webViewLink,
    `${username}さん、本日の業務、お疲れ様でした。`,
  ].join('\n');

const messageStatusError = () =>
  ['申し訳ありません。状態がおかしくなりました。', 'もういちど始めからやり直して下さい。'].join(
    '\n'
  );

const messageDailyReportNotFound = () => '日報がみつかりませんでした。';
