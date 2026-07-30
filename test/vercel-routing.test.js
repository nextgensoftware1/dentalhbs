const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const notFoundPage = fs.readFileSync(path.join(root, '404.html'), 'utf8');

test('Vercel config should rewrite unknown routes to the SPA entrypoint', () => {
  const hasSpaRewrites = Array.isArray(vercelConfig.rewrites) && vercelConfig.rewrites.some((rule) => rule.source === '/(.*)' && rule.destination === '/index.html');
  const hasSpaRoutes = Array.isArray(vercelConfig.routes) && vercelConfig.routes.some((rule) => rule.src === '/(.*)' && rule.dest === '/index.html');

  assert.ok(hasSpaRewrites || hasSpaRoutes, 'Expected a catch-all SPA rewrite or route for unknown paths');
});

test('404 page should preserve the requested path and redirect to the SPA shell', () => {
  assert.match(notFoundPage, /location\.pathname|location\.href|window\.location/i);
  assert.match(notFoundPage, /index\.html|\/call-support|pathname/i);
});
