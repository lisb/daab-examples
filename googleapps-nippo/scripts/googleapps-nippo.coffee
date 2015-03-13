# Description:
#   Google Appsの日報フォルダにデータを投稿します。
# 
# Dependencies:
#   None
#
# Configuration:
#   NIPPO_FOLDER_NAME 日報を保存するGoogle Apps上の共有フォルダ
#   NIPPO_TEMPLATE_NAME 日報フォルダ内のテンプレートファイル
#   GAPPS_CLIENT_ID 日報ボット用のGoogle AppsアプリClientId
#   GAPPS_CLIENT_SECRET 日報ボット用のGoogle AppsアプリClientSecret 
#
# Commands:
#   hubot 日報 - 今日作成された日報を一覧します。
#   hubot <お疲れさまなど> - 今日の日報を作成する.
#
# Author:
#   masataka.takeuchi

NIPPO_FOLDER_NAME = process.env.NIPPO_FOLDER_NAME or "日報"
NIPPO_TEMPLATE_NAME = process.env.NIPPO_TEMPLATE_NAME or "日報テンプレ.docx"

CLIENT_INFO =
    clientId: process.env.GAPPS_CLIENT_ID
    clientSecret: process.env.GAPPS_CLIENT_SECRET
    redirectUrl: "urn:ietf:wg:oauth:2.0:oob"

nameField  = "<名前>"
dateField  = "<日付>"
workField  = /^・$/
scoreField = /^(達成|着手直後|[0-9]+%)$/
memoField  = /^#$/
fileField  = "添付ファイル"

module.exports = (robot) ->
  brain = robot.brain
    
  robot.hear /^日報$/i, (msg) ->
    findTodayNippo msg, "", (records) ->
      if records?
        msg.send (msgNippo record for record in records).join("\n")
      else
        msg.send msgNotFound

  robot.respond "file", (msg) ->
    msg.download msg.json, (path) ->
      stateAction brain, msg, path
    msg.finish()

  robot.respond "select", (msg) ->
    if msg.json.response?
      stateAction brain, msg, msg.json.options[msg.json.response]
    msg.finish()

  robot.respond /((.|[\n\r])*)/, (msg) ->
    return if msg.match[1] == "日報"
    stateAction brain, msg, msg.match[1]

  robot.join (msg) ->
    # 自分自身ではなく、会話相手のユーザ情報に変換。
    [userA, userB] = msg.message.roomUsers
    msg.message.user = if msg.message.user.id == userA.id then userB else userA
    
    setState brain, msg, "idle"
    stateAction brain, msg, ""

## State Pattern

currentState = (brain, msg) ->
  st = brain.get userCode(msg)
  if not st? or (new Date().getTime() - parseInt(st.split("@")[1]) > 3600 * 1000)
    "idle" # 一定時間を過ぎたら状態を戻す。
  else
    st.split("@")[0]

setState = (brain, msg, st) ->
  brain.set userCode(msg), st + "@" + (new Date().getTime())

stateAction = (brain, msg, text) ->
  console.log "text: " + text
  st = currentState(brain, msg)
  console.log "state:" + st
  act = statuses[st]
  if act?
    next = act(msg, text)
    if next?
      setState brain, msg, next
  else
    msg.send msgStatusError
    setState brain, msg, "idle"


## Nippo Statues

statuses = {
  idle : (msg) ->
    getTodayNippo msg, ->
      msg.send
        stamp_set: 3
        stamp_index: "1152921507291203590"
        text: msgStartNippo msg
    "input_done"
  input_done : (msg, text) ->
    if text.match(/^(\.|．|。|次へ)$/)
      msg.send msgInputScore
      "input_score"
    else
      addTodayNippo msg, workField, "・" + text + "\n・", (record) ->
        if record?
          msg.send msgInputContinue "業務"
        else
          msg.send msgUpdateFailed
      "input_done"
  input_score: (msg, text) ->
    score = parseInt(text)
    if 0 <= score and score <= 100
      console.log score
      v = switch
        when score == 0  then "着手直後"
        when score < 100 then score + "%"
        else "達成"
      console.log v
      addTodayNippo msg, scoreField, v
      , (record) ->
        if record?
          msg.send msgInputMemo
        else
          msg.send msgUpdateFailed
      "input_memo"
    else
      msg.send msgInputScore
      "input_score"
  input_memo : (msg, text) ->
    if text.match(/^(.|．|。|次へ)$/)
      uploadTodayNippo msg, "日付", (record) ->
        if record?
          msg.send
            stamp_set: 3
            stamp_index: "1152921507291204249"
            text: msgEndNippo msg, record
          msg.leave()
        else
          msg.send msgUpdateFailed
      "idle"
    else
      field = if msg.json?.url? then fileField else memoField
      if field == memoField
        if text.match /^今ココ/    # iOS版は改行が入るので削除しておく
          text = text.replace(/[\r\n]/g, " ").replace(/http/, "\nhttp")
        text = text + "\n\n#"  # 段落毎に改行
      addTodayNippo msg, field, text, (record) ->
        if record?
          msg.send msgInputContinue "所感・学び"
        else
          msg.send msgUpdateFailed
      "input_memo"
}


## Messages

msgStartNippo = (msg) ->
  d = new Date()
  y = d.getYear()
  if y < 2000 then y += 1900
  today = "#{y}/#{d.getMonth() + 1}/#{d.getDate()}"
  [
    "#{userName(msg)}さん、お疲れ様です。",
    "本日(#{today})はどんな業務をしましたか？",
    "1件1メッセージでお願いします。"
  ].join("\n")

msgInputContinue = (title) ->
  question: "他にも#{title}があれば教えて下さい。\nなければ「。」もしくは「次へ」を選んで下さい。"
  options: ["次へ"]

msgInputScore = 
  question: "目標達成度はどのくらいですか？\n数値で教えて下さい。"
  options: ["0", "30", "50", "80", "100"]

msgInputMemo = 
  [
    "所感・学びを教えて下さい。"
    "画像や動画、今ココスタンプも使えます。"
    "メッセージを分けることで複数の報告ができます。"
  ].join("\n")

msgEndNippo = (msg, record) ->
  [
    "業務報告を書き込みました。"
    record.alternateLink
    "#{userName(msg)}さん、本日の業務、お疲れ様でした。"
  ].join("\n")

msgStatusError = 
  [
    "申し訳ありません。状態がおかしくなりました。",
    "もういちど始めからやり直して下さい。"
  ].join("\n")

msgNotFound = 
  "今日の日報はまだ報告されていません。"

msgUpdateFailed = 
  "更新に失敗しました。"

msgNippo = (record) ->
  [ record.title
    record.alternateLink
    ""
  ].join("\n")

msgNotFolderFound =
  "日報フォルダが見つかりません。"

msgNotTemplateFound =
  "テンプレートファイルが見つかりません。"

msgNotSupported =
  "対応していないファイルフォーマットです。"

## user object

userName = (msg) ->
  msg.message.user.name

userCode = (msg) ->
  [name, domain] = msg.message.user.email.split "@"
  name


## Google drive Access

office = require('office-js')
fs = require('fs')
basename = require('path').basename
extname  = require('path').extname
shortname = (name) ->
  basename(name, extname(name))

today = () ->
  dd = new Date()
  yy = dd.getFullYear()
  mm = dd.getMonth() + 1
  dd = dd.getDate()
  mm = "0" + mm if mm < 10
  dd = "0" + dd if dd < 10
  "#{yy}/#{mm}/#{dd}"
  
nippoName = (msg) ->
  "#{today().replace(/\//g, '')}-#{userName(msg)}" + extname(NIPPO_TEMPLATE_NAME)

nippoDir = "./nippo-files"

nippoFolderId = null
findNippoFolder = (msg, cb) ->
  office.gdrive.getClient CLIENT_INFO, (client) ->
    if nippoFolderId? then cb client, nippoFolderId
    else
      client.getFileByName NIPPO_FOLDER_NAME, (err, item) ->
        if err? or item.mimeType.indexOf('folder') == -1
          msg.send msgNotFolderFound
        else
          cb client, nippoFolderId = item.id

findTodayNippo = (msg, query, cb) ->  # all
  findNippoFolder msg, (client, folderId) ->
    client.getFiles folderId, (err, files) ->
      cb files

searchNippoFile = (msg, name, cb) ->  # any
  findNippoFolder msg, (client, folderId) ->
    client.getFileByName name, folderId, (err, file) ->
      cb file

addTodayNippo = (msg, field, text, cb) ->
  updateNippo msg, field, text, cb

getTodayNippo = (msg, cb) ->
  nippoPath = nippoDir + "/" + nippoName(msg)

  setup = ->
    fs.exists nippoDir, (exists) ->
      if exists then check() else fs.mkdir nippoDir, check

  check = ->
    fs.exists nippoPath, (exists) ->
      searchNippoFile msg, shortname(nippoName(msg)), (file) ->
        if exists and file? and file.etag == fs.readFileSync(nippoPath + ".etag", "utf8")
          cb()
        else
          if file? then download file
          else
            searchNippoFile msg, shortname(NIPPO_TEMPLATE_NAME), (file) ->
              if file? then download file, true
              else
                msg.send msgNotTemplateFound

  download = (file, templ) ->
    office.gdrive.getClient CLIENT_INFO, (client) ->
      client.downloadFile file, nippoPath, ->
        if not templ
          fs.writeFileSync nippoPath + ".id", file.id
          fs.writeFileSync nippoPath + ".etag", file.etag
        cb()

  setup()

updateNippo = (msg, field, text, cb) ->
  if msg.json?.url?
    uploadFile msg, field, text, cb   # 先にファイルをアップロードする
    return

  nippoPath = nippoDir + "/" + nippoName(msg)

  editor = null
  switch extname(NIPPO_TEMPLATE_NAME)
    when ".docx" then editor = new office.Word()
    when ".xlsx" then editor = new office.Excel()
    else
      msg.send msgNotSupported
      return

  try
    editor
    .open(nippoPath)
    .replaceText(nameField, userName(msg))
    .replaceText(dateField, today())
    .replaceText(field, text)
    .save(nippoPath)

    console.log "update: " + nippoPath
    cb(true)

  catch ex
    console.log "update error: ", ex
    cb(false)

uploadTodayNippo = (msg, field, cb) ->
  nippoPath = nippoDir + "/" + nippoName(msg)

  fs.readFile nippoPath + ".id", "utf8", (err, fileId) ->
    findNippoFolder msg, (client, folderId) ->
      if not fileId?
        client.createFile shortname(nippoName(msg)), folderId, (err, file) ->
          if err? then cb null
          else
            client.uploadContent nippoPath, file.id, file.etag, (err, file) ->
              if file?
                fs.writeFileSync nippoPath + ".id", file.id
                fs.writeFileSync nippoPath + ".etag", file.etag
              cb file
      else
        etag = fs.readFileSync(nippoPath + ".etag", "utf8")
        client.uploadContent nippoPath, fileId, etag, (err, file) ->
          if file? then fs.writeFileSync nippoPath + ".etag", file.etag
          cb file


uploadFile = (msg, field, path, cb) ->
  msg.send "申し訳ありません。ファイル添付はまだ未対応です。"
