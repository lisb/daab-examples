# Description:
#   メッセージ内容を議事録として記録します。
# 
# Dependencies:
#   None
#
# Configuration:
#   GAPPS_URL 議事録ボット用のGoogle Apps ScriptのURL
#
# Commands:
#
# Author:
#   masataka.takeuchi

BOT_URL = process.env.GAPPS_URL

module.exports = (robot) ->

  robot.hear /^終了$/, (msg) ->
    msg.leave()
  
  robot.hear /((.|[\n\r])*)/i, (msg) ->
    room = msg.message.user.rooms[msg.message.room]
    
    talkInfo =
      roomName: room.topic || "(名前なし)"
      names: (user.name for user in room.users)
      gmails: (user.email for user in room.users)
      message: msg.message.text.replace(/^[^ ]* /, "").replace(/[\n\r]/g, " ") # remove bot name and new line
      poster: msg.message.user.name
      posttime: parseInt(new Date() / 1000)

    console.log talkInfo
      
    msg.http(BOT_URL)
        .query(
          apiKey: "XXX"
          talkInfo: JSON.stringify(talkInfo)
        )
        .get() (err, res, body) ->
          if err?
            console.log err
          else
            console.log "talkInfo post successed."
