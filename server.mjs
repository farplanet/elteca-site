import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const plans = new Set(['Start', 'Small', 'Medium', 'Enterprise', 'Обратная связь']);
const assets = new Map([
  ['/index.html', 'text/html; charset=utf-8'],
  ['/contacts.html', 'text/html; charset=utf-8'],
  ['/tariffs.html', 'text/html; charset=utf-8'],
  ['/callback.js', 'text/javascript; charset=utf-8'],
  ['/navigation.js', 'text/javascript; charset=utf-8'],
  ['/style.css', 'text/css; charset=utf-8'],
  ['/elteca-mark.png', 'image/png'],
]);

function sendJson(response, code) {
  response.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify({ status: code === 200 ? 'success' : 'error' }));
}

async function readSubmission(request, response) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    bytes += chunk.length;
    if (bytes > 4096) {
      sendJson(response, 413);
      request.resume();
      return;
    }
    chunks.push(chunk);
  }

  try {
    const submission = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (submission && typeof submission === 'object' && !Array.isArray(submission)) return submission;
  } catch {
    // The same response covers malformed JSON and unsupported payload types.
  }
  sendJson(response, 400);
}

export function createEltecaServer({ origin, token, chatId, sendRequest = fetch }) {
  const pages = new Map(Array.from(assets, ([path, type]) => [
    path,
    { type, content: readFileSync(new URL('.' + path, import.meta.url)) },
  ]));
  let windowEnds = 0;
  let attempts = 0;

  return createServer({ requestTimeout: 15000 }, async (request, response) => {
    const path = request.url.split('?')[0];
    if (path !== '/api/enquiry') {
      const page = pages.get(path === '/' ? '/index.html' : path);
      if (!page || !['GET', 'HEAD'].includes(request.method)) return sendJson(response, 404);
      response.writeHead(200, { 'Content-Type': page.type, 'X-Content-Type-Options': 'nosniff' });
      return response.end(request.method === 'HEAD' ? undefined : page.content);
    }
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return sendJson(response, 405);
    }
    if (request.headers.origin !== origin) return sendJson(response, 403);
    if (request.headers['content-type']?.split(';')[0] !== 'application/json') {
      return sendJson(response, 415);
    }

    try {
      const data = await readSubmission(request, response);
      if (!data) return;
      if (data.sf_extra) return sendJson(response, 200);

      const name = typeof data['Имя'] === 'string' ? data['Имя'].replace(/\s+/gu, ' ').trim() : '';
      const phone = typeof data['Телефон'] === 'string' ? data['Телефон'].replace(/\s+/gu, ' ').trim() : '';
      const digits = phone.replace(/\D/g, '');
      const plan = data['Пакет'];
      if (!name || name.length > 100 || phone.length > 30 ||
          digits.length < 10 || digits.length > 15 || !plans.has(plan)) {
        return sendJson(response, 400);
      }

      const now = Date.now();
      if (now >= windowEnds) {
        windowEnds = now + 60000;
        attempts = 0;
      }
      if (attempts >= 20) return sendJson(response, 429);
      attempts += 1;

      const telegram = await sendRequest('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: 'Новая заявка Elteca\nПакет: ' + plan + '\nИмя: ' + name + '\nТелефон: ' + phone,
          link_preview_options: { is_disabled: true },
        }),
        signal: AbortSignal.timeout(8000),
      });
      const delivered = telegram.ok && (await telegram.json()).ok === true;
      return sendJson(response, delivered ? 200 : 502);
    } catch {
      if (!response.destroyed && !response.headersSent) sendJson(response, 502);
    }
  });
}

if (import.meta.main) {
  const { ELTECA_ORIGIN, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, PORT = '3000' } = process.env;
  const port = Number(PORT);
  if (!ELTECA_ORIGIN || !/^\d+:[\w-]+$/.test(TELEGRAM_BOT_TOKEN ?? '') ||
      !/^-?\d+$/.test(TELEGRAM_CHAT_ID ?? '') || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Set ELTECA_ORIGIN, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID and a valid PORT.');
  }
  const origin = new URL(ELTECA_ORIGIN).origin;
  createEltecaServer({ origin, token: TELEGRAM_BOT_TOKEN, chatId: TELEGRAM_CHAT_ID })
    .listen(port, '127.0.0.1', () => console.log('Elteca: listening on 127.0.0.1:' + port));
}
