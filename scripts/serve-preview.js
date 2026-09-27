'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {BASE, OUTPUT} = require('./build-preview');

const types = {'.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.webp': 'image/webp'};

http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (!pathname.startsWith(BASE)) {
    response.writeHead(404).end();
    return;
  }
  const relative = decodeURIComponent(pathname.slice(BASE.length));
  const file = path.resolve(OUTPUT, relative.endsWith('/') || !relative ? `${relative}index.html` : relative);
  if (!file.startsWith(`${OUTPUT}${path.sep}`)) {
    response.writeHead(400).end();
    return;
  }
  fs.readFile(file, (error, content) => {
    if (error) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream'});
    response.end(content);
  });
}).listen(4177, '127.0.0.1', () => console.log(`Preview: http://localhost:4177${BASE}`));
