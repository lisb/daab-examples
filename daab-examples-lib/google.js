
const { existsSync } = require('fs');
const fs = require('fs').promises;
const { isAbsolute, resolve } = require('path');
const { authenticate } = require('@google-cloud/local-auth');
const { OAuth2Client } = require('google-auth-library');

function absolutePath(path) {
  if (isAbsolute(path)) {
    return path;
  }
  return resolve(process.cwd(), path);
}

async function authorize(keyfilePath, scopes, storefilePath = './.credentials.json') {
  const absKeyfilePath = absolutePath(keyfilePath);
  const absStorefilePath = absolutePath(storefilePath);
  if (existsSync(absStorefilePath)) {
    const keyFile = require(absKeyfilePath);
    const keys = keyFile.installed || keyFile.web;
    const client = new OAuth2Client({
      clientId: keys.client_id,
      clientSecret: keys.client_secret,
      redirectUri: keys.redirect_uris[keys.redirect_uris.length - 1],
    });
    client.credentials = require(absStorefilePath);
    return client;
  } else {
    const client = await authenticate({ keyfilePath: absKeyfilePath, scopes });
    await fs.writeFile(absStorefilePath, JSON.stringify(client.credentials));
    return client;
  }
}

module.exports = {
  authorize,
  drive: require('./google/drive'),
  sheets: require('./google/sheets'),
};
