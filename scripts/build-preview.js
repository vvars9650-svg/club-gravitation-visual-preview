'use strict';

const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'source');
const OUTPUT = path.join(ROOT, 'site');
const BASE = '/club-gravitation-visual-preview/';
const URL = `https://vvars9650-svg.github.io${BASE}`;
const PAGES = ['index.html', 'about/index.html', 'events/index.html',
  'first-contact/index.html', 'founders/index.html', 'apply/index.html'];
const FILES = [...PAGES, 'favicon.svg', 'assets/brand/logo-mark.svg',
  'assets/css/site.css', 'assets/css/polish.css', 'assets/css/tz-20260831.css',
  'assets/css/story.css', 'assets/css/events-hub.css',
  'assets/css/first-contact.css', 'assets/css/founders.css', 'assets/js/site.js',
  'assets/css/apply.css', 'assets/js/apply.js'];
const SAFE_ROUTES = [ 'privacy', 'offer', 'terms', 'consent-pd'];

function resetInsideRoot(directory) {
  const resolved = path.resolve(directory);
  if (!resolved.startsWith(`${ROOT}${path.sep}`)) throw new Error('Unsafe output path');
  fs.rmSync(resolved, {recursive: true, force: true});
  fs.mkdirSync(resolved, {recursive: true});
}

function copy(relative, from, to) {
  const destination = path.join(to, relative);
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.copyFileSync(path.join(from, relative), destination);
}

function syncVisualSnapshot(visualRoot) {
  const branch = execFileSync('git', ['branch', '--show-current'],
    {cwd: visualRoot, encoding: 'utf8'}).trim();
  if (branch !== 'visual/post-launch') throw new Error(`Unexpected source branch: ${branch}`);
  execFileSync(process.execPath, [path.join(visualRoot, 'scripts/build-public.js')],
    {cwd: visualRoot, stdio: 'inherit'});

  const artifact = path.join(visualRoot, 'public-dist');
  resetInsideRoot(SOURCE);
  FILES.forEach(file => copy(file, artifact, SOURCE));
  // Keep the checked-in preview snapshot free of endpoints and network adapters.
  const applyScript = path.join(SOURCE, 'assets/js/apply.js');
  fs.writeFileSync(applyScript, isolateApply(fs.readFileSync(applyScript, 'utf8')).trimEnd() + '\n');
  fs.cpSync(path.join(artifact, 'assets/images'), path.join(SOURCE, 'assets/images'),
    {recursive: true});

  const head = execFileSync('git', ['rev-parse', 'HEAD'],
    {cwd: visualRoot, encoding: 'utf8'}).trim();
  const diff = execFileSync('git', ['diff', '--binary'], {cwd: visualRoot});
  fs.writeFileSync(path.join(ROOT, 'snapshot.json'), `${JSON.stringify({
    branch, head, diffSha256: crypto.createHash('sha256').update(diff).digest('hex'),
    capturedAt: new Date().toISOString(),
  }, null, 2)}\n`);
}

function isolateApply(script) {
  return script
    .replace(/https:\/\/[^'\s]+yandexcloud\.net[^']*/gu, '')
    .replace('gravitation-v5-test-frontend-b1g4bdjb.storage.yandexcloud.net', 'disabled.invalid')
    .replace("new Set(['club-gravitation.ru', 'www.club-gravitation.ru'])", 'new Set()')
    .replace(/  async function parseJsonResponse[\s\S]*?(?=  function createLocalPreviewPhotoUploadAdapter)/u,
      '  function createPhotoUploadAdapter() { return createLocalPreviewPhotoUploadAdapter(); }\n  function createMountedPhotoUploadAdapter() { return createLocalPreviewPhotoUploadAdapter(); }\n\n')
    .replaceAll('root.fetch.bind(root)', 'createLocalPreviewFetch()');
}

function prefixLocalUrls(text) {
  return text.replace(/(["'])\/(?!\/)/gu, (_, quote) => `${quote}${BASE}`)
    .replaceAll('https://club-gravitation.ru/', URL);
}

function writeText(relative, text) {
  const destination = path.join(OUTPUT, relative);
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.writeFileSync(destination, text);
}

function safePage() {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Визуальный просмотр — ГРАВИТАЦИЯ</title><link rel="stylesheet" href="${BASE}assets/css/site.css"></head><body class="inner-page"><main class="legal"><p class="eyebrow">ГРАВИТАЦИЯ</p><h1>Визуальный просмотр</h1><p>На этой версии сайта заявки не принимаются.</p><a class="button button--dark" href="${BASE}">На главную</a></main></body></html>`;
}

function build() {
  resetInsideRoot(OUTPUT);
  for (const file of FILES) {
    if (file.endsWith('.html')) {
      let html = prefixLocalUrls(fs.readFileSync(path.join(SOURCE, file), 'utf8'));
      html = html.replace(/<link\s+rel="canonical"[^>]*>/giu, '');
      if (file === 'apply/index.html') {
        html = html.replace(/<script src="[^"]*public-config\.js" defer><\/script>/u, '');
        html = html.replace('</head>', `<meta name="gravitation-visual-preview" content="submission-disabled"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; form-action 'none'; base-uri 'self'"></head>`);
      }
      html = html.replace('</head>', '<meta name="robots" content="noindex,nofollow,noarchive"></head>');
      html = html.replace('</body>', `<script src="${BASE}assets/js/preview-only.js" defer></script></body>`);
      writeText(file, html);
    } else if (file.endsWith('.js') || file.endsWith('.css')) {
      writeText(file, prefixLocalUrls(fs.readFileSync(path.join(SOURCE, file), 'utf8')));
    } else {
      copy(file, SOURCE, OUTPUT);
    }
  }
  fs.cpSync(path.join(SOURCE, 'assets/images'), path.join(OUTPUT, 'assets/images'),
    {recursive: true});
  for (const route of SAFE_ROUTES) writeText(`${route}/index.html`, safePage());
  writeText('404.html', safePage());
  writeText('.nojekyll', '');
  writeText('assets/js/preview-only.js', `document.addEventListener('submit',event=>event.preventDefault(),true);document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(link&&/^(?:mailto:|tel:)/i.test(link.href))event.preventDefault()},true);\n`);
  console.log('Visual preview built from isolated source snapshot');
}

if (require.main === module) {
  if (process.argv[2]) syncVisualSnapshot(path.resolve(process.argv[2]));
  build();
}

module.exports = {BASE, FILES, OUTPUT, PAGES, SAFE_ROUTES, build};
