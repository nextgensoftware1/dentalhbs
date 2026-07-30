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

test('The app shell should normalize trailing slashes for deep-link refreshes', () => {
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(indexHtml, /normalizePath\(|pathname\.replace\(/i);
  assert.match(indexHtml, /routePages\[.*window\.location\.pathname|routePages\[.*initialPath/i);
});

test('Known SPA routes should have route-specific entry files to avoid 404 flashes', () => {
  const routes = ['/call-support', '/insurance-verification', '/rcm-billing', '/admin-support', '/contact'];

  for (const route of routes) {
    const routeFile = path.join(root, route.replace(/^\//, ''), 'index.html');
    assert.ok(fs.existsSync(routeFile), `Expected route entry file for ${route}`);
  }
});

test('Deep-link route files should preserve the current path instead of redirecting to home', () => {
  const routeFiles = [
    path.join(root, 'call-support.html'),
    path.join(root, 'insurance-verification.html'),
    path.join(root, 'rcm-billing.html'),
    path.join(root, 'admin-support.html'),
    path.join(root, 'contact.html')
  ];

  for (const file of routeFiles) {
    const content = fs.readFileSync(file, 'utf8');
    assert.match(content, /history\.replaceState|fetch\('\/index\.html'\)/i);
    assert.doesNotMatch(content, /location\.replace\('\/'\)/i);
  }
});

test('404 page should preserve the requested path while loading the SPA shell', () => {
  assert.match(notFoundPage, /fetch\('\/index\.html'\)|history\.replaceState|window\.location\.pathname/i);
  assert.match(notFoundPage, /index\.html|currentPath|pathname/i);
});
