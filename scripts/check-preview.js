'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {BASE, OUTPUT, PAGES, SAFE_ROUTES} = require('./build-preview');

const htmlFiles = [...PAGES, ...SAFE_ROUTES.map(route => `${route}/index.html`), '404.html'];
for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(OUTPUT, file), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex,nofollow,noarchive">/u, file);
  if (file !== 'apply/index.html') assert.doesNotMatch(html, /<form\b|<input\b/iu, file);
  assert.doesNotMatch(html, /(?:href|src|srcset)="\/(?!club-gravitation-visual-preview\/)/iu, file);
  for (const [, reference] of html.matchAll(/(?:href|src|srcset)="([^"]+)"/giu)) {
    for (const value of reference.split(',').map(part => part.trim().split(/\s+/u)[0])) {
      if (!value.startsWith(BASE)) continue;
      const relative = value.slice(BASE.length).split(/[?#]/u)[0];
      const target = path.join(OUTPUT, relative.endsWith('/') || !relative ? `${relative}index.html` : relative);
      assert.equal(fs.existsSync(target), true, `${file} references missing ${value}`);
    }
  }
}

const script = fs.readFileSync(path.join(OUTPUT, 'assets/js/site.js'), 'utf8');
assert.doesNotMatch(script, /\bfetch\s*\(|XMLHttpRequest|sendBeacon/iu);
assert.match(script, new RegExp(`${BASE}about/`, 'u'));
const applyScript = fs.readFileSync(path.join(OUTPUT, 'assets/js/apply.js'), 'utf8');
assert.doesNotMatch(applyScript, /yandexcloud|root\.fetch|XMLHttpRequest|sendBeacon/iu);
const applyHtml = fs.readFileSync(path.join(OUTPUT, 'apply/index.html'), 'utf8');
assert.match(applyHtml, /name="gravitation-visual-preview"/u);
assert.match(applyHtml, /connect-src 'none'; form-action 'none'/u);
assert.match(applyHtml, /name="profile_or_messenger_url" type="text" required/u);
assert.match(applyHtml, /role="combobox"/u);
assert.match(applyHtml, /placeholder="Укажите мессенджер или контакт"/u);
assert.doesNotMatch(applyHtml, /form-tabs|form-progress|form-step|form-next|form-back|id="review"|name="(?:occupation|life_outside_work|source|public_profile_url|desired_connections|acquaintance_methods)"/u);
assert.match(applyHtml, /img-src 'self' data: blob:/u);
assert.match(applyScript, /FORM-2\.3/u);
assert.match(applyScript, /data-photo-remove/u);
assert.match(applyScript, /URL\.createObjectURL/u);
assert.match(applyScript, /URL\.revokeObjectURL/u);
assert.doesNotMatch(applyHtml, /public-config|action=|name="preferred_contact"/u);
for (const directory of [path.join(OUTPUT, 'assets/js'), path.join(__dirname, '../source/assets/js')]) {
  for (const file of fs.readdirSync(directory)) {
    assert.doesNotMatch(fs.readFileSync(path.join(directory, file), 'utf8'), /apigw|yandexcloud|__V5_PHOTO_UPLOAD_ADAPTER__/iu, file);
  }
}
assert.equal(fs.existsSync(path.join(OUTPUT, 'assets/js/public-config.js')), false);
assert.equal(fs.existsSync(path.join(OUTPUT, 'admin-prod')), false);
assert.equal(fs.existsSync(path.join(OUTPUT, 'CNAME')), false);
for (const route of SAFE_ROUTES) {
  const html = fs.readFileSync(path.join(OUTPUT, route, 'index.html'), 'utf8');
  assert.match(html, /заявки не принимаются/u);
}
console.log('Preview routes, noindex and submission isolation verified');
