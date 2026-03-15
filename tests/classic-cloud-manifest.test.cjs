const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = '/Users/jamesbrady/Bomberman';

test('classic cloud deploy manifest stays wired to the playable multiplayer server', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  const serverPackageJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'server/package.json'), 'utf8'));
  const renderYaml = fs.readFileSync(path.join(REPO_ROOT, 'render.yaml'), 'utf8');
  const dockerfile = fs.readFileSync(path.join(REPO_ROOT, 'Dockerfile'), 'utf8');

  assert.equal(typeof packageJson.dependencies?.express, 'string');
  assert.equal(packageJson.engines?.node, '>=20');
  assert.equal(serverPackageJson.type, 'module');
  assert.match(renderYaml, /buildCommand: npm ci --omit=dev/);
  assert.match(renderYaml, /startCommand: npm run server/);
  assert.match(renderYaml, /healthCheckPath: \/health/);
  assert.match(dockerfile, /RUN npm ci --omit=dev/);
  assert.match(dockerfile, /CMD \["npm", "run", "server"\]/);
});
