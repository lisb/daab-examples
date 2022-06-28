// Description:
//   メッセージ内容を議事録として記録します。
// 
// Dependencies:
//   None
//
// Configuration:
//   MINUTES_BOT_URL - 議事録ボット Google Apps Script の URL
//   MINUTES_BOT_API_KEY - Apps Script の認証用 API キー
//
// Commands:
//
// Author:
//   L is B corp.

const fetch = require('node-fetch');

const BOT_URL = process.env.MINUTES_BOT_URL;
const API_KEY = process.env.MINUTES_BOT_API_KEY || "your API key";

module.exports = (robot) => {
  robot.hear(/^終了$/, (res) => {
    res.leave();
  });

  robot.hear(/((.|[\n\r])*)/i, (res) => {
    const room = res.message.user.rooms[res.message.room];
    const talkInfo = {
      roomName: room.topic || "(名前なし)",
      names: room.users.map(u => u.name),
      gmails: room.users.map(u => u.email),
      message: res.message.text.replace(/[\n\r]/g, " "),
      poster: res.message.user.name,
      posttime: parseInt(new Date() / 1000),
    };

    const options = {
      method: 'POST',
      body: JSON.stringify({ apiKey: API_KEY, talkInfo }),
    };
    fetch(BOT_URL, options)
      .then((botres) => botres.json())
      .then((data) => console.info('bot response:', data))
      .catch((err) => console.error('post failed:', `posttime = ${talkInfo.posttime}, `, err));
  });
};
