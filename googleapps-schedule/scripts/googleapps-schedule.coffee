
fs = require('fs')
path = require('path')
office = require('office-js')

CLIENT_INFO =
    clientId: process.env.GAPPS_CLIENT_ID
    clientSecret: process.env.GAPPS_CLIENT_SECRET
    redirectUrl: "urn:ietf:wg:oauth:2.0:oob"

module.exports = (robot) ->

  robot.respond /(.*)[?？]/, (msg) ->
    getItem msg, msg.message.user.email, msg.match[1]
    msg.finish()
  
  robot.respond /(.*)/, (msg) ->
    addItem msg, msg.message.user.email, msg.match[1]
    msg.finish()

  addItem = (msg, id, text) ->
    office.gcalendar.getClient CLIENT_INFO, (client) ->
      client.quickAdd id, text, (err, event) ->
        if err?
          console.log err
          msg.send "追加に失敗しました。"
        else
          msg.send "追加しました。\n#{event.htmlLink}"
      
  getItem = (msg, id, query, min, max) ->
    if not min? then min = new Date(new Date().getTime() - 24 * 60 * 60 * 1000 * 7).toISOString()
    if not max? then max = new Date(new Date().getTime() + 24 * 60 * 60 * 1000 * 8).toISOString()
    office.gcalendar.getClient CLIENT_INFO, (client) ->
      client.getItems id, query, min, max, (err, list) ->
        if err? or list.items.length == 0
          console.log err
          msg.send "すみません、見つかりませんでした"
        else
          console.log list.items
          texts = "";
          texts += "#{time2str(item)} #{item.summary}\n#{item.htmlLink}\n\n" for item in list.items
          msg.send texts

  time2str = (item) ->
    st = new Date(item.start.dateTime)
    en = new Date(item.end.dateTime)
    
    y = st.getFullYear()
    m = st.getMonth() + 1
    d = st.getDate()
    h = st.getHours()
    mi= st.getMinutes()
    h2= en.getHours()
    m2= en.getMinutes()
    
    h = ('0' + h).slice(-2)
    mi= ('0' + mi).slice(-2)
    h2= ('0' + h2).slice(-2)
    m2= ('0' + m2).slice(-2)
    
    # TODO: 終日とか連続とか
    return "#{m}月#{d}日 #{h}:#{mi}-#{h2}:#{m2}"

