const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const MODULE_URL = pathToFileURL(
  path.join('/Users/jamesbrady/Bomberman', 'public', 'client-input.mjs')
).href;

test('direction resolution prefers the most recently pressed movement key', async () => {
  const { updateDirectionOrder, resolveDirection } = await import(MODULE_URL);

  let directionOrder = [];
  const activeCodes = new Set();

  activeCodes.add('ArrowRight');
  directionOrder = updateDirectionOrder(directionOrder, 'ArrowRight', true);
  assert.equal(resolveDirection(activeCodes, directionOrder, null), 'right');

  activeCodes.add('ArrowDown');
  directionOrder = updateDirectionOrder(directionOrder, 'ArrowDown', true);
  assert.equal(resolveDirection(activeCodes, directionOrder, null), 'down');

  activeCodes.delete('ArrowDown');
  directionOrder = updateDirectionOrder(directionOrder, 'ArrowDown', false);
  assert.equal(resolveDirection(activeCodes, directionOrder, null), 'right');
});

test('thumbstick vector resolves to a cardinal direction with a deadzone', async () => {
  const { directionFromVector } = await import(MODULE_URL);

  assert.equal(directionFromVector(0, 0), null);
  assert.equal(directionFromVector(6, 4), null);
  assert.equal(directionFromVector(30, 8), 'right');
  assert.equal(directionFromVector(-32, 6), 'left');
  assert.equal(directionFromVector(8, -28), 'up');
  assert.equal(directionFromVector(10, 26), 'down');
});

test('held direction flags preserve orthogonal keys for server-side turn buffering', async () => {
  const { heldDirectionsFromInputs } = await import(MODULE_URL);

  const activeCodes = new Set(['ArrowRight', 'ArrowDown']);
  assert.deepEqual(heldDirectionsFromInputs(activeCodes, null), {
    up: false,
    down: true,
    left: false,
    right: true,
  });

  assert.deepEqual(heldDirectionsFromInputs(new Set(), 'left'), {
    up: false,
    down: false,
    left: true,
    right: false,
  });
});
