const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const MODULE_URL = pathToFileURL(
  path.join('/Users/jamesbrady/Bomberman', 'public', 'client-state.mjs')
).href;

test('visual state interpolates player movement between server snapshots', async () => {
  const { syncVisualState, advanceVisualState } = await import(MODULE_URL);

  const initialServerState = {
    board: { width: 3, height: 3, tiles: [[1, 1, 1], [1, 0, 1], [1, 1, 1]] },
    bombs: [],
    explosions: [],
    pickups: [],
    round: { phase: 'playing', winnerId: null, roundNumber: 1, timeLeftMs: 0 },
    players: [
      { id: 'p1', name: 'Player 1', color: '#fff', x: 1, y: 1, alive: true, wins: 0 },
    ],
  };

  const firstVisualState = syncVisualState(null, initialServerState, 'p1');
  assert.equal(firstVisualState.players[0].renderX, 1);
  assert.equal(firstVisualState.players[0].renderY, 1);

  const movedServerState = {
    ...initialServerState,
    players: [
      { id: 'p1', name: 'Player 1', color: '#fff', x: 2, y: 1, alive: true, wins: 0 },
    ],
  };

  const movedVisualState = syncVisualState(firstVisualState, movedServerState, 'p1');
  assert.equal(movedVisualState.players[0].renderX, 1);
  assert.equal(movedVisualState.players[0].targetX, 2);

  const halfwayState = advanceVisualState(movedVisualState, 45);
  assert.ok(halfwayState.players[0].renderX > 1);
  assert.ok(halfwayState.players[0].renderX < 2);
  assert.equal(halfwayState.players[0].renderY, 1);

  const settledState = advanceVisualState(halfwayState, 120);
  assert.equal(settledState.players[0].renderX, 2);
  assert.equal(settledState.players[0].renderY, 1);
});
