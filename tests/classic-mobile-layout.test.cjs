const test = require('node:test');
const assert = require('node:assert/strict');

const layoutModuleUrl = 'file:///Users/jamesbrady/Bomberman/public/client-layout.mjs';

test('phone layout reserves space for controls and uses a sheet tools panel', async () => {
  const { computeViewportLayout } = await import(layoutModuleUrl);
  const layout = computeViewportLayout(390, 844);

  assert.equal(layout.mode, 'mobile');
  assert.equal(layout.sidebarMode, 'sheet');
  assert.equal(layout.showTouchControls, true);
  assert.ok(layout.topInset >= 96);
  assert.ok(layout.bottomInset >= 180);
});

test('desktop layout keeps the sidebar docked and touch controls hidden', async () => {
  const { computeViewportLayout } = await import(layoutModuleUrl);
  const layout = computeViewportLayout(1280, 900);

  assert.equal(layout.mode, 'desktop');
  assert.equal(layout.sidebarMode, 'dock');
  assert.equal(layout.showTouchControls, false);
  assert.ok(layout.leftInset >= 260);
  assert.ok(layout.bottomInset <= 48);
});
