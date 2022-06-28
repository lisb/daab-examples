// Copyright (c) 2022 L is B Corp.
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

function doPost(e) {
  const { apiKey, data } = JSON.parse(e.postData.contents);

  let result;
  if (apiKey === 'your API key') {
    result = updateReport(data);
  } else {
    result = { statusCode: 401, message: 'unauthorized' };
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
    ContentService.MimeType.JSON
  );
}

const LOCATION_REGEXP_STRINGS = {
  name: '^(作成者：)(.*)?$',
  date: '^(日付：)(.*)?$',
  score: '^(目標達成度：)(.*)?$',
  work: '^(・)$',
  memo: '^(#)$',
};

function findParagraph(elem) {
  if (elem.getType() === DocumentApp.ElementType.PARAGRAPH) {
    return elem;
  }

  const parent = elem.getParent();
  if (parent.getType() === DocumentApp.ElementType.PARAGRAPH) {
    return parent;
  }
  return null;
}

function updateReport(data) {
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(10 * 1000)) {
      return { statusCode: 409, message: 'failed to acquire the script lock' };
    }

    console.info('updateReport:', `doc = ${data.reportFileId}`);
    const body = DocumentApp.openById(data.reportFileId).getBody();

    for (const request of data.requests) {
      const pattern = LOCATION_REGEXP_STRINGS[request.location];
      if (!pattern) {
        console.info('updateReport:', `invalid location: ${request.location}`);
        continue;
      }

      const found = body.findText(pattern);
      if (!found) {
        console.info('updateReport:', `'${pattern}' was not found in the report body.`);
        continue;
      }
      const elem = findParagraph(found.getElement());
      if (elem === null) {
        const elemType = found.getElement().getType();
        console.info(
          'updateReport:',
          `The element found in the report body is not a paragraph. It's ${elemType}`
        );
        continue;
      }

      const paragraph = elem.asParagraph();
      const source = paragraph.getText();
      const patternRegexp = new RegExp(pattern);

      const match = source.match(patternRegexp);
      paragraph.setText(`${match[1]}${request.text}`);
      if (request.location === 'work' || request.location === 'memo') {
        const index = body.getChildIndex(paragraph);
        body.insertParagraph(index + 1, match[1]);
      }
    }

    return { statusCode: 200, message: 'updated' };
  } catch (err) {
    console.error('report:', err);
    return { statusCode: 500, message: 'internal error' };
  } finally {
    lock.releaseLock();
  }
}
