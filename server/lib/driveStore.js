const { google } = require('googleapis');

function getClient(accessToken) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

async function findFileId(drive, name) {
  const res = await drive.files.list({
    q: `name='${name}' and trashed=false`,
    spaces: 'drive',
    fields: 'files(id)',
    pageSize: 1,
  });
  return res.data.files[0]?.id ?? null;
}

async function readJSON(accessToken, name, fallback) {
  const drive = getClient(accessToken);
  const fileId = await findFileId(drive, name);
  if (!fileId) return fallback;
  try {
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    return new Promise((resolve) => {
      let raw = '';
      res.data.on('data', chunk => { raw += chunk; });
      res.data.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch { resolve(fallback); }
      });
      res.data.on('error', () => resolve(fallback));
    });
  } catch {
    return fallback;
  }
}

async function writeJSON(accessToken, name, data) {
  const drive = getClient(accessToken);
  const body = JSON.stringify(data);
  const fileId = await findFileId(drive, name);
  if (fileId) {
    await drive.files.update({
      fileId,
      media: { mimeType: 'application/json', body },
    });
  } else {
    await drive.files.create({
      requestBody: { name, mimeType: 'application/json' },
      media: { mimeType: 'application/json', body },
      fields: 'id',
    });
  }
}

module.exports = { readJSON, writeJSON };
