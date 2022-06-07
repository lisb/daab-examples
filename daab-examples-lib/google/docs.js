class Document {
  #docs;

  constructor(docs) {
    this.#docs = docs;
  }

  async replace(documentId, replaceRequests) {
    const requiests = replaceRequests.map((r) => ({
      replaceAllText: {
        replaceText: r.text,
        containsText: {
          text: r.location,
          matchCase: true,
        },
      },
    }));
    await this.#docs.batchUpdate({
      documentId,
      requestBody: { requiests },
    });
  }
}

module.exports = {
  Document,
};
