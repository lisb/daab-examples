//----------------------------------------------------
// GET
//----------------------------------------------------
function doGet (req) {

  var result = {};

  if (req.parameters.apiKey == 'XXX') {
    var talkInfo = JSON.parse(req.parameters.talkInfo);
    if (talkInfo.type != 2 || talkInfo.param._stampId != 7) {
      result.responseCode = executeBot(talkInfo);
    }
    else {
      result.responseCode = 200;
    }
    Logger.log('executeBot');
  }
  else {
    Logger.log('error: 401');
    result.responseCode = 401;
  }
  
  result.type = 0;
  result.responser = 'meeting-bot';
  
  return ContentService.createTextOutput(
    req.parameters.callback + '(' + JSON.stringify(result) + ')')
    .setMimeType(ContentService.MimeType.JSON);
}

function test() {
  var talkInfo = {
    roomName: '(名前なし)',
    gmails: [Session.getEffectiveUser().getEmail()],
    names: ['ダーブ'],
    posttime: parseInt(new Date() / 1000),
    poster: 'ダーブ',
    message: 'テストです'
  };
  executeBot(talkInfo);
}

//----------------------------------------------------
// botの実行
//----------------------------------------------------
function executeBot(talkInfo) {
  
  var lock = LockService.getPublicLock();
  try {
    
    // 30秒間ロック
    lock.waitLock(30000);
    
    //------------------------------------------------
    // 前処理
    // トークルーム名が付いていなければ、参加者の名前に置き換え
    if (talkInfo.roomName == '(名前なし)') {
      talkInfo.roomName = '';
      var separator = '';
      for (var i = 0; i < talkInfo.names.length; i++) {
        talkInfo.roomName += separator + talkInfo.names[i];
        separator = 'と';
      }
    }
    
    // メッセージの改行をなくす
    talkInfo.message = talkInfo.message.replace(/(\n|\r)/g, '');
    
    //------------------------------------------------
    // ドキュメントの取得
    var doc = openDoc(talkInfo.roomName);
    var paragraphs;
    if (doc == null) {
      if (talkInfo.message == ''){
        return 200;
      }
      doc = createDoc(talkInfo.roomName, talkInfo.gmails);
      paragraphs = doc.getParagraphs();
      
      // ドキュメントの初期情報
      setTitle(paragraphs, talkInfo.roomName);
      setDate(paragraphs, talkInfo.posttime);
      setPlace(paragraphs, 'via direct');
      setMember(paragraphs, talkInfo.names);      
    }

    else {
      paragraphs = doc.getParagraphs();
      
      // 日付の更新
      updateDate(paragraphs, talkInfo.posttime);
    }
    
    //------------------------------------------------
    // direct連携コード
    var stampStrings = [
        {id: 1, name: '会議名'},
        {id: 2, name: '場所'},
        {id: 3, name: '議題'},
        {id: 4, name: '重要'},
        {id: 5, name: '決定'},
        {id: 6, name: '宿題'},
        {id: 7, name: 'オフレコ'}
    ];

    for(var i = 0; i < stampStrings.length; i++) {
        var regexp = new RegExp('^' + stampStrings[i].name + '($|[:：](.+)$)');
        if(talkInfo.message.match(regexp) !== null) {
            talkInfo.type = 2;
            talkInfo.param = { '_stampId' : stampStrings[i].id };
            talkInfo.message = RegExp.$2;
            break;
        }
    }

    //  オフレコ処理
    if(talkInfo.type == 2 && talkInfo.param._stampId == 7) {
        if(talkInfo.message != '') {
            talkInfo.message = '';
        }
        else {
            removeLatestMessage(paragraphs);
        }
    }

    //------------------------------------------------
    // 議事録ボタンの押下
    if (talkInfo.type == 2) {

      // メッセージの取得
      var message = talkInfo.message;
      if (message == '') {
        message = getLatestMessage(paragraphs);
      }
      
      // 各ボタンの処理
      switch (talkInfo.param._stampId) {
          
        // 会議名
        case 1:
          setTitle(paragraphs, message);
          break;
          
        // 場所
        case 2:
          setPlace(paragraphs, message);
          break;
          
        // 議題
        case 3:
          setAgenda(doc, paragraphs, message);
          break;
          
        // 重要事項
        case 4:
          setImportant(doc, paragraphs, message);
          break;
          
        // 決定事項
        case 5:
          setConclusion(doc, paragraphs, message);
          break;
          
        // 宿題
        case 6:
          setTodo(doc, paragraphs, message);
          break;
      }
    }
    
    //------------------------------------------------
    // 会話履歴の追加
    if(talkInfo.message != ''){
//      talkInfo.message = JSON.stringify(talkInfo);  // for debug
      appendMessage(doc, talkInfo.poster, talkInfo.posttime, talkInfo.message);
    }
    
    // ロックを解除
    lock.releaseLock();
    return 200;  // レスポンスコード
  }
  
  // エラー
  
  catch(e) {
    if(e.message.indexOf('another process was holding the lock')>0){
      return 409;
    } else {
      return 400;
    }
  }
}

//----------------------------------------------------
// 会議名の設定
//----------------------------------------------------
function setTitle(paragraphs, title) {
  for (var i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].findText('^会議名：') != null) {
      paragraphs[i].replaceText('^会議名：.*$', '会議名：' + title);
      return;
    }
  }
}

//----------------------------------------------------
// 日時の設定
//----------------------------------------------------
function setDate(paragraphs, ts) {
  
  // unixtimeをDate型に変換
  var date = unixtimeToDate(ts);
  var dateString = Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy年MM月dd日 HH:mm〜HH:mm');  
  
  for (var i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].findText('^日時：') != null) {
      paragraphs[i].replaceText('^日時：.*$', '日時：' + dateString);
      return;
    }
  }
}

function updateDate(paragraphs, ts) {
  
  // unixtimeをDate型に変換
  var date = unixtimeToDate(ts);
  var dateString = Utilities.formatDate(date, 'Asia/Tokyo', 'HH:mm');  
  
  for (var i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].findText('^日時：') != null) {
      paragraphs[i].replaceText('..:..$', dateString);
      return;
    }
  }
}

//----------------------------------------------------
// 場所の設定
//----------------------------------------------------
function setPlace(paragraphs, place) {
  for (var i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].findText('^場所：') != null) {
      paragraphs[i].replaceText('^場所：.*$', '場所：' + place);
      return;
    }
  }
}

//----------------------------------------------------
// 出席者の設定
//----------------------------------------------------
function setMember(paragraphs, member) {
  
  var memberString = '';
  var separator = '';
  for (var i = 0; i < member.length; i++) {
    memberString += separator + member[i];
    separator = '、';
  }
    
  for (var i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].findText('^出席者：') != null) {
      paragraphs[i].replaceText('^出席者：.*$', '出席者：' + memberString);
      return;
    }
  }
}

//----------------------------------------------------
// 議題の追加
//----------------------------------------------------
function setAgenda(doc, paragraphs, agenda) {
  for (var i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].findText('^議題一覧') != null) {
      var idx = 0;
      for (var j = i+1; j < paragraphs.length; j++) {
        idx++;
        if(paragraphs[j].getText() == '') {
          doc.insertParagraph(j, idx + '. ' + agenda)
            .setSpacingAfter(0);
          return;
        }
      }
    }
  }
}

//----------------------------------------------------
// 決定事項の追加
//----------------------------------------------------
function setConclusion(doc, paragraphs, conclusion) {
  for (var i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].findText('^決定事項') != null) {
      var idx = 0;
      for (var j = i+1; j < paragraphs.length; j++) {
        idx++;
        if(paragraphs[j].getText() == '') {
          doc.insertParagraph(j, idx + '. ' + conclusion)
            .setSpacingAfter(0);
          return;
        }
      }
    }
  }
}

//----------------------------------------------------
// 重要事項の追加
//----------------------------------------------------
function setImportant(doc, paragraphs, important) {
  for (var i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].findText('^重要事項') != null) {
      for (var j = i+1; j < paragraphs.length; j++) {
        if(paragraphs[j].getText() == '') {
          doc.insertParagraph(j, '・' + important)
            .setSpacingAfter(0);
          return;
        }
      }
    }
  }
}

//----------------------------------------------------
// 重要事項の追加
//----------------------------------------------------
function setTodo(doc, paragraphs, todo) {
  for (var i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].findText('^宿題') != null) {
      for (var j = i+1; j < paragraphs.length; j++) {
        if(paragraphs[j].getText() == '') {
          doc.insertParagraph(j, '・' + todo)
            .setSpacingAfter(0);
          return;
        }
      }
    }
  }
}

//----------------------------------------------------
// 会話履歴の追加
// ※最終段落は削除できないため、あえて空白行を追加しておく
//----------------------------------------------------
function appendMessage(doc, poster, posttime, message) {
  
  // unixtimeをDate型に変換
  var date = unixtimeToDate(posttime);
  var dateString = Utilities.formatDate(date, 'Asia/Tokyo', 'HH:mm');  

  doc.appendParagraph(poster + ' (' + dateString + ')').setSpacingAfter(0);
  doc.appendParagraph(message).setSpacingAfter(0);
  doc.appendParagraph('').setSpacingAfter(0);
}

//----------------------------------------------------
// 最新の会話の取得
// ※最終段落は空白行のため、その一つ前が最新の会話
//----------------------------------------------------
function getLatestMessage(paragraphs) {
  return paragraphs[paragraphs.length - 2].getText();
}

//----------------------------------------------------
// 最新の会話の削除
// ※前のメッセージとの区切り行、投句者行、メッセージ行の3行を削除
//----------------------------------------------------
function removeLatestMessage(paragraphs) {
    if(paragraphs[paragraphs.length - 2].findText('^ここから下は、会話の履歴です。') != null) {
        return;
    }
     
    paragraphs[paragraphs.length - 2].removeFromParent();
    paragraphs[paragraphs.length - 3].removeFromParent();
    paragraphs[paragraphs.length - 4].removeFromParent();
}

//----------------------------------------------------
// ドキュメント
//----------------------------------------------------
/**
 * ドキュメントの取得
 * ドキュメント名は、<トークルーム名> + '_' + YYYYMMDD
 * 'ミーティング'フォルダ下で管理
 * @param {string} roomName トークルーム名
 * @return {?Document} ドキュメント
 */
function openDoc(roomName) {

  // ドキュメントの取得
  var docName = roomName + '_' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd');
  var files = DriveApp.searchFiles('title = "' + docName + '"');
  if (! files.hasNext()) {
    return null;
  }
  var file = files.next();
  return DocumentApp.openById(file.getId());
}

/**
 * ドキュメントの生成
 * ドキュメント名は、<トークルーム名> + '_' + YYYYMMDD
 * 'ミーティング'フォルダ下で管理
 * @param {string} roomName トークルーム名
 * @param {Array.<string>} members トーク参加者
 * @return {Document} ドキュメント
 */
function createDoc(roomName, members) {
  
  // フォルダの取得
  // 存在しなければ、生成
  var folderName = '生成議事録';
  var folder;
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    folder = folders.next();
  }
  else {
    folder = DriveApp.createFolder(folderName);
  }
 
  // ドキュメントの生成
  var docName = roomName + '_' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd');
  var owner = Session.getEffectiveUser().getEmail();
  var files = DriveApp.searchFiles('title = "議事録ひな形" and "' + owner + '" in owners');
  if (! files.hasNext()) {
    return null;
  }
  var file = files.next().makeCopy(docName, folder);

  // ドキュメントの共有化
  // 自分以外を共同編集者にする
  for(var i=0; i<members.length; i++){
    if(members[i] != owner) {
      try {
        file.addEditor(members[i]);
      }
      catch(e) {
        // no operation
      }
    }
  }
  
  return DocumentApp.openById(file.getId());
}

//----------------------------------------------------
// 汎用ルーチン
//----------------------------------------------------
/**
 * Date型をunixtimeに変換
 * @param {Date} d
 * @returm {int}
 */
function dateToUnixtime(d) {
  return parseInt(d / 1000);
}

/**
 * unixtimeをDate型に変換
 * @param {int} ts
 * @return {Date}
 */
function unixtimeToDate(ts) {
  return new Date(ts * 1000);
}

/**
 * 指定のブロックの先頭段落の取得
 * @param {Paragraph} pars ドキュメントの全ての段落
 * @param {string} blockName ブロック名
 * @return {?Paragraph} 先頭段落
 */
function searchFirstParagraph(pars, blockName) {
  for(var i=0; i<(pars.length-1); i++) {
    if(pars[i].getHeading() != DocumentApp.ParagraphHeading.HEADING3) continue;
    if(pars[i].getText() == blockName) {
      return pars[i+1];
    }
  }
  return null;
}

//--------------- 以下、未使用 -----------------
/**
 * 配列から指定の要素を削除
 * 配列は参照渡しなので、引数の配列から要素が削除される
 * @param {Array.<*>} array 配列
 * @param {*} target 削除対象
 */
function removeFromArray(array, target) {
  for(var i=array.length-1; 0<=i; i--){
    if(array[i] == target){
      array.splice(i, 1);
    }
  }
  return array;
}
