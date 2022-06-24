// Description:
//   Google Calendar 上の予定を追加・検索します。
//
// Dependencies:
//   None
//
// Configuration:
//   GWS_CLIENT_SECRET_FILE 案件ボット用の OAuth2.0 クライアント認証情報ファイル (.json)
//
// Commands:
//
// Author:
//   L is B corp.

const { google } = require('googleapis');
const { parseISO, format, addDays, subDays } = require('date-fns');
const lib = require('daab-examples-lib/google');

const GWS_CLIENT_SECRET_FILE = process.env.GWS_CLIENT_SECRET_FILE;
const GWS_CREDENTIAL_STORE_FILE = process.env.GWS_CREDENTIAL_STORE_FILE;

const calendar = google.calendar('v3');
const scopes = ['https://www.googleapis.com/auth/calendar'];

async function setup() {
  const auth = await lib.authorize(GWS_CLIENT_SECRET_FILE, scopes, GWS_CREDENTIAL_STORE_FILE);
  google.options({ auth });
}

module.exports = (robot) => {
  setup()
    .then(() => robot.logger.info('setup:', 'bot authorized'))
    .catch((err) => robot.logger.error('setup:', err));

  robot.respond(/(.*[^?？])$/, (res) => {
    addEvent(res.message.user.email, res.match[1])
      .then((event) => formatEvent(event))
      .then((text) => res.send(`追加しました。\n${text}`))
      .catch((err) => {
        robot.logger.error(err);
        res.send('追加に失敗しました。ボットのログを確認してください。');
      });
  });

  robot.respond(/(.*)[?？]$/, (res) => {
    const now = new Date();
    const timeMin = subDays(now, 7).toISOString();
    const timeMax = addDays(now, 8).toISOString();
    findEventsBy(res.message.user.email, res.match[1], timeMin, timeMax)
      .then((events) => formatEvents(events))
      .then((text) => res.send(text))
      .catch((err) => {
        robot.logger.error(err);
        res.send('みつかりませんでした。');
      });
  });
};

async function addEvent(id, text) {
  const res = await calendar.events.quickAdd({
    calendarId: id,
    text,
  });
  return res.data;
}

async function findEventsBy(id, query, timeMin, timeMax, maxResults = 10) {
  const res = await calendar.events.list({
    calendarId: id,
    q: query,
    timeMin,
    timeMax,
    maxResults,
  });
  console.info(res);
  return res.data.items;
}

function formatEvents(events) {
  if (!events || events.length < 1) {
    return 'みつかりませんでした。';
  }
  return events
    .filter((e) => e.status !== 'cancelled')
    .map((e) => formatEvent(e))
    .join('\n\n');
}

function formatEvent(event) {
  return [
    `${formatDateTime(event.start.dateTime)} - ${formatDateTime(event.end.dateTime)} ${
      event.summary
    }`,
    `${event.htmlLink}`,
  ].join('\n');
}

function formatDateTime(datetime) {
  return format(parseISO(datetime), 'MM月dd日 HH:mm');
}
