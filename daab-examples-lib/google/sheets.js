// Copyright (c) 2022 L is B Corp.
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

class SheetTable {
  #header;
  #rows;

  constructor(values) {
    const [header, ...rows] = values; // NOTE: string[][]
    this.#header = header;
    this.#rows = rows;
  }

  search(field, value) {
    if (!field || !value) {
      return null;
    }
    const c = this.#header.indexOf(field);
    if (c < 0) {
      return null;
    }
    return this.#rows
      .filter((row) => row[c].includes(value))
      .map((row) => new SheetTableRecord(this.#header, row));
  }
}

class SheetTableRecord {
  #cells;

  constructor(header, row) {
    this.#cells = header.map((n, i) => ({ name: n, value: row[i] }));
  }

  value(name) {
    const res = this.#cells.find((c) => c.name === name);
    return res ? res.value : null;
  }
}

module.exports = {
  SheetTable,
  SheetTableRecord,
};
