import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from 'node:url';
import { createAuth } from './admin-auth.mjs';
import { createGateway } from './admin-gateway.mjs';
import { createHash } from 'node:crypto';

const root = cwd();
const port = Number(process.env.PORT || 4173);
const host = "127.0.0.1";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".csv": "text/csv; charset=utf-8"
};

export function createApp({ passwordHash = process.env.RPTH_ADMIN_PASSWORD_HASH, now,
  production = process.env.NODE_ENV === 'production', appOrigin = process.env.RPTH_APP_ORIGIN || '',
  gateway = createGateway({ url: process.env.RPTH_APPS_SCRIPT_URL, secret: process.env.RPTH_GATEWAY_SECRET }) } = {}) {
  const auth = createAuth({ passwordHash, now });
  if (production && (!/^https:\/\/[^/]+$/.test(appOrigin) || !auth.configured)) throw new Error('Set RPTH_APP_ORIGIN (HTTPS origin) and RPTH_ADMIN_PASSWORD_HASH before starting');
  const publicSession = session => session && ({ operator: session.operator, expiresAt: session.expiresAt });
  const files = new Set(['index.html', 'faceclaim-locks.html', 'app.js', 'faceclaim-registry.js', 'tooltip-position.js', 'styles.css', 'rpth-logo.png', 'favicon-32x32.png', 'admin.html', 'admin.css', 'admin.js', 'admin-model.js', 'admin-login.js', 'admin-config.js', 'admin-sample-data.js', 'assets/icons/material-symbols-rounded.ttf', 'assets/icons/LICENSE.txt']);
  files.add('tools/previews/tooltip-preview.html');
  return createServer(async (request, response) => {
    const cors = production && request.headers.origin === appOrigin ? { 'Access-Control-Allow-Origin': appOrigin, Vary: 'Origin' } : {};
    const json = (status, value, headers = {}) => { response.writeHead(status, { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }); response.end(JSON.stringify(value)); };
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const token = production ? request.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1] || '' : request.headers.cookie?.match(/(?:^|;\s*)rpth_session=([a-f0-9]{64})(?:;|$)/)?.[1] || '';
      if (pathname === '/health' && request.method === 'GET') return json(200, { ok: true, gatewayConfigured: gateway.configured });
      if (pathname.startsWith('/api/admin/')) {
        const address = request.headers.host;
        if (!production && !/^(127\.0\.0\.1|localhost):\d+$/.test(address || '')) return json(403, { error: 'Forbidden host' });
        const origin = production ? appOrigin : `http://${address}`;
        if ((production || request.headers.origin) && request.headers.origin !== origin) return json(403, { error: 'Forbidden origin' });
        if (request.method === 'OPTIONS' && production) {
          response.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '600' }); response.end(); return;
        }
        const route = pathname.slice('/api/admin/'.length);
        if (request.method === 'GET' && route === 'session') return json(200, { configured: auth.configured, operators: auth.operators, session: publicSession(auth.session(token)), mode: gateway.configured ? 'test-copy' : 'local-demo' });
        if (request.method !== 'POST' || !['login', 'logout', 'verify', 'bootstrap', 'preview', 'commit'].includes(route)) return json(404, { error: 'Not found' });
        if (request.headers.origin !== origin) return json(403, { error: 'Forbidden origin' });
        if (!(request.headers['content-type'] || '').startsWith('application/json')) return json(415, { error: 'Expected JSON' });
        let body = '';
        for await (const chunk of request) { body += chunk; if (Buffer.byteLength(body) > 12000) return json(413, { error: 'Request too large' }); }
        let input;
        try { input = JSON.parse(body); } catch { return json(400, { error: 'Invalid JSON' }); }
        if (!input || typeof input !== 'object' || Array.isArray(input)) return json(400, { error: 'Invalid request' });
        if (route === 'login') {
          const result = await auth.login(input.operator, input.password);
          if (result.error) return json(result.status, { error: result.error });
          return json(200, { session: publicSession(result.session), ...(production ? { token: result.token } : {}) }, production ? {} : { 'Set-Cookie': `rpth_session=${result.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800` });
        }
        if (route === 'logout') { auth.logout(token); return json(200, { ok: true }, production ? {} : { 'Set-Cookie': 'rpth_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' }); }
        const session = auth.session(token);
        if (!session) return json(401, { error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
        if (route === 'verify') return json(200, { session: publicSession(session) });
        if (route === 'preview' && !['register', 'edit', 'npc', 'race', 'sub', 'switch'].includes(input.action)) return json(400, { error: 'ฟอร์มนี้ยังไม่รองรับการบันทึก' });
        const owner = createHash('sha256').update(token).digest('hex');
        try {
          const data = await gateway.call(route === 'bootstrap' ? 'bootstrap' : route, input, { operator: session.operator, owner });
          return json(200, data);
        } catch (error) { return json(502, { error: error.message }); }
      }
      if (production) return json(404, { error: 'Not found' });
      const file = pathname === '/' ? 'index.html' : pathname.slice(1);
      if (!files.has(file)) { response.writeHead(404); response.end('Not found'); return; }
      if (file === 'admin-sample-data.js' && !auth.session(token)) return json(401, { error: 'Unauthorized' });
      if (file === 'admin-config.js') {
        // Local UI uses this server's cookie-authenticated API. The public file
        // stays pointed at Render for GitHub Pages; production never serves it.
        response.writeHead(200, { 'Content-Type': types['.js'], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        response.end('window.RPTH_ADMIN_CONFIG = Object.freeze({ apiBase: "" });\n');
        return;
      }
      try {
        const body = await readFile(join(root, file));
        response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        response.end(body);
      } catch { response.writeHead(404); response.end('Not found'); }
    } catch { if (!response.headersSent) json(400, { error: 'Invalid request' }); else response.end(); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const bind = process.env.NODE_ENV === 'production' ? '0.0.0.0' : host;
  createApp().listen(port, bind, () => console.log(`RPTH server listening on port ${port}`));
}
