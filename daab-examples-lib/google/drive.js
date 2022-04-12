
class Client {
  #drive;

  constructor(drive) {
    this.#drive = drive;
  }

  async findDriveFileByName(name) {
    const q = [`name = '${name}'`, 'trashed = false'];
    const res = await this.#drive.files.list({
      q: q.join(" and "),
      orderBy: 'modifiedTime',
      maxResults: 1,
    });

    const dfs = (res.data.files || []).map(file => new DriveFile(file));
    return dfs.length > 0 ? dfs[0] : null;
  }
}

class DriveFile {
  #id;
  #name;
  constructor(file) {
    this.#id = file.id;
    this.#name = file.name;
  }
  get id() { return this.#id; }
  get name() { return this.#name; }
}

module.exports = {
  Client,
  DriveFile,
};
