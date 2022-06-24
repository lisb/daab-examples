// Copyright (c) 2022 L is B Corp.
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

class Client {
  #drive;

  constructor(drive) {
    this.#drive = drive;
  }

  async getFileByName(name) {
    const q = [`name = '${name}'`, 'trashed = false'];
    const res = await this.#drive.files.list({
      q: q.join(' and '),
      orderBy: 'modifiedTime',
      maxResults: 1,
    });

    const dfs = (res.data.files || []).map((file) => new DriveFile(file));
    return dfs.length > 0 ? dfs[0] : null;
  }

  async getFiles(folderId, pageSize = 10) {
    const res = await this.#drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files/id,files/name,files/mimeType,files/webViewLink',
      orderBy: 'createdTime desc',
      pageSize,
    });
    return (res.data.files || []).map((file) => new DriveFile(file));
  }

  async getFolder(name) {
    const res = await this.#drive.files.list({
      q: `name = '${name}' and mimeType = 'application/vnd.google-apps.folder'`,
      maxResults: 1,
    });
    const dfs = (res.data.files || []).map((file) => new DriveFile(file));
    return dfs.length > 0 ? dfs[0] : null;
  }

  async copyFile(fileId, name) {
    const res = await this.#drive.files.copy({
      fileId,
      requestBody: { name },
    });
    return new DriveFile(res.data);
  }
}

class DriveFile {
  #id;
  #name;
  #webViewLink;

  constructor(file) {
    this.#id = file.id;
    this.#name = file.name;
    this.#webViewLink = file.webViewLink;
  }

  get id() {
    return this.#id;
  }
  get name() {
    return this.#name;
  }
  get webViewLink() {
    return this.#webViewLink;
  }
}

module.exports = {
  Client,
  DriveFile,
};
