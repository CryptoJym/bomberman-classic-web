const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const MODULE_URL = pathToFileURL(
  path.join('/Users/jamesbrady/Bomberman', 'public', 'client-room.mjs')
).href;

test('room codes normalize to short uppercase share-safe values', async () => {
  const { normalizeRoomCode } = await import(MODULE_URL);

  assert.equal(normalizeRoomCode(' alpha-42 '), 'ALPHA42');
  assert.equal(normalizeRoomCode('room with spaces'), 'ROOMWITH');
  assert.equal(normalizeRoomCode('***'), 'CLASSIC');
});

test('share links preserve the current origin and target room code', async () => {
  const { buildShareUrl } = await import(MODULE_URL);

  assert.equal(
    buildShareUrl('https://example.com/play', 'alpha42'),
    'https://example.com/play?room=ALPHA42'
  );
  assert.equal(
    buildShareUrl('http://127.0.0.1:8080/?room=old', 'bravo77'),
    'http://127.0.0.1:8080/?room=BRAVO77'
  );
});
