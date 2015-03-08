# Description:
#   Google Appsの案件管理ワークシートのデータを参照します。
# 
# Dependencies:
#   None
#
# Configuration:
#   ANKEN_WORKSHEET_NAME 案件管理ワークシートファイル名
#   GAPPS_CLIENT_ID 案件ボット用のGoogle AppsアプリClientId
#   GAPPS_CLIENT_SECRET 案件ボット用のGoogle AppsアプリClientSecret 
#
# Commands:
#   hubot 案件 - 最新5件の案件を表示します。
#   hubot <会社名>の件 - <会社名>の案件を表示します。(最新5件)
#   hubot <担当者名>さんの担当 - 先方担当者が<担当者名>の案件を表示します。(最新5件)
#   hubot 売上 - 今月と先月の売り上げを表示します。
#
# Author:
#   masataka.takeuchi

ANKEN_WORKSHEET_NAME = process.env.ANKEN_WORKSHEET_NAME or "案件管理.xlsx"

CLIENT_INFO =
    clientId: process.env.GAPPS_CLIENT_ID
    clientSecret: process.env.GAPPS_CLIENT_SECRET
    redirectUrl: "urn:ietf:wg:oauth:2.0:oob"

ankenField  = "会社名"
assignField = "先方担当者名"

module.exports = (robot) ->
  robot.hear /案件/i, (msg) ->
    findAnken msg, "", "", (text) ->
      msg.send text

  robot.hear /([^。、.,]{2,})(の案?件).*/i, (msg) ->
    findAnken msg, ankenField, msg.match[1], (text) ->
      msg.send text

  robot.hear /([^。、.,]{2,5})(さん|くん|君).*/i, (msg) ->
    findAnken msg, assignField, msg.match[1], (text) ->
      msg.send text

# Services

fs = require('fs')
office = require("office-js")
colRegEx = /^([a-zA-Z]+)([0-9]+)$/

basename = require('path').basename
extname  = require('path').extname
shortname = (name) ->
  basename(name, extname(name))

findAnken = (msg, field, value, cb) ->
  ankenPath = "./" + ANKEN_WORKSHEET_NAME
  fs.exists ankenPath, (exists) ->
    #if exists then find()
    # update anken file
    office.gdrive.getClient CLIENT_INFO, (client) ->
      client.getFileByName shortname(ANKEN_WORKSHEET_NAME), (err, file) ->
        if err?
          console.log err
        else
          if exists and file? and file.eTag == fs.readFileSync(ankenPath + ".etag", "utf8")
            # already sync
            find()
          else
            client.downloadFile file, ankenPath, (err) ->
              if err?
                console.log err
              else
                fs.writeFile ankenPath + ".etag", file.eTag, ->
                  #if not exists
                  find()

  find = ->
    cols = {}
    result = []
    editor = new office.Excel()
    editor.open(ankenPath)
    editor.forEachSheet (sheet) ->
      rowNum = 0
      targetCol = null
      editor.forEachRow sheet, (row) ->
        values = {}
        editor.forEachCell row, (cell) ->
          txt = editor.textOfCell(cell)
          col = colRegEx.exec(editor.rowOfCell(cell))[1]
          if rowNum == 0
            cols[txt] = col
            if txt == field then targetCol = col
          else
            values[col] = if editor.typeOfCell(cell) == 's' then txt else editor.valueOfCell(cell)
            if col == targetCol and txt.indexOf(value) >= 0
              result.push values
        rowNum++

    cb (formatAnken cols, record for record in result).join("\n")

formatAnken = (cols, record) ->
  [ record[cols[ankenField]] + " (担当: " + record[cols[assignField]] + ")",
    " 見込み時期: " + formatDate(record[cols["見込み時期"]]),
    " 確度: "      + record[cols["確度"]],
    " 製品名: "    + record[cols["製品名"]] + " (単価: " + formatNum(record[cols["単価"]]) + "円)",
    " 小計: "      + formatNum(record[cols["小計"]]) + "円 (ユーザー数: " + formatNum(record[cols["ユーザー数"]]) + "人)",
    ""
  ].join("\n")

formatNum = (num) ->
  Number(num).toFixed()

formatDate = (days) ->
  # The default implementation in Excel is 1900 backward compatibility
  adj = new Date(1899,12,31).getTime() - new Date(1970,1,1).getTime();
  days--; # Excel implemented the bug in Lotus 123
  dd = new Date(days * 24 * 3600 * 1000 + adj)
  yy = dd.getFullYear()
  mm = dd.getMonth() + 1
  dd = dd.getDate()
  mm = "0" + mm if mm < 10
  dd = "0" + dd if dd < 10
  "#{yy}/#{mm}/#{dd}"
