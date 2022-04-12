const { SheetTable, SheetTableRecord } = require('./google/sheets');

test('SheetTable', () => {
  const header = ['名前', '住所'];
  const row1 = ['東京本社', '東京都'];
  const row2 = ['大阪支社', '大阪府'];

  const table = new SheetTable([header, row1, row2]);

  expect(table.search('名前', '大阪')).toEqual([new SheetTableRecord(header, row2)]);
  expect(table.search('住所', '九州')).toEqual([]);
  expect(table.search('?', '東京')).toBeNull();
});

test('SheetTableRecord', () => {
  const header = ['名前', '住所'];
  const row = ['L is B', '東京都'];

  const tr = new SheetTableRecord(header, row);

  expect(tr.value('名前')).toBe('L is B');
  expect(tr.value('住所')).toBe('東京都');
  expect(tr.value('?')).toBeNull();
});
