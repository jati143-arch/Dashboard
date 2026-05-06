const { google } = require('googleapis');

const FOLDER_NAME = 'Trading Dashboard';
let _folderId = null;

function getClient(accessToken) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

async function getOrCreateFolder(drive) {
  if (_folderId) return _folderId;
  const res = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    spaces: 'drive',
    fields: 'files(id)',
    pageSize: 1,
  });
  if (res.data.files.length) {
    _folderId = res.data.files[0].id;
  } else {
    const folder = await drive.files.create({
      requestBody: { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id',
    });
    _folderId = folder.data.id;
  }
  return _folderId;
}

async function findFileId(drive, name) {
  // First try scoped to our folder
  try {
    const folderId = await getOrCreateFolder(drive);
    const res = await drive.files.list({
      q: `name='${name}' and '${folderId}' in parents and trashed=false`,
      spaces: 'drive',
      fields: 'files(id)',
      pageSize: 1,
    });
    if (res.data.files.length) return res.data.files[0].id;
  } catch {
    // fall through to legacy search
  }
  // Fallback: search all of Drive (for files created before folder org)
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
    const folderId = await getOrCreateFolder(drive);
    await drive.files.create({
      requestBody: { name, mimeType: 'application/json', parents: [folderId] },
      media: { mimeType: 'application/json', body },
      fields: 'id',
    });
  }
}

module.exports = { readJSON, writeJSON };
