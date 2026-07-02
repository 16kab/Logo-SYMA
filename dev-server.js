import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMemoryKv } from './api/_lib/memoryKv.js';
import { createVoteHandler } from './api/vote.js';
import { createVotesHandler } from './api/votes.js';
import { createMessageHandler } from './api/message.js';
import { createMessagesHandler } from './api/messages.js';
import { createAdminLoginHandler } from './api/admin-login.js';

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const kv = createMemoryKv();
const getAdminPassword = () => ADMIN_PASSWORD;

const routes = {
  '/api/vote': createVoteHandler(kv),
  '/api/votes': createVotesHandler(kv, getAdminPassword),
  '/api/message': createMessageHandler(kv),
  '/api/messages': createMessagesHandler(kv, getAdminPassword),
  '/api/admin-login': createAdminLoginHandler(getAdminPassword),
};

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

function createResAdapter(res) {
  return {
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(payload) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    },
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

async function serveStatic(req, res, pathname) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const filePath = path.join(projectRoot, relativePath);
  if (!filePath.startsWith(projectRoot)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath);
    res.setHeader('Content-Type', CONTENT_TYPES[ext] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const handler = routes[pathname];

  if (handler) {
    req.body = await readBody(req);
    await handler(req, createResAdapter(res));
    return;
  }

  await serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`Dev server ready at http://localhost:${PORT} (admin password: ${ADMIN_PASSWORD})`);
});
