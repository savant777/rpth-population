import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const sign = (text, secret) => createHmac('sha256', secret).update(text).digest('hex');
export function createGateway({ url = '', secret = '', fetchImpl = fetch, now = Date.now } = {}) {
  let endpoint;
  try { endpoint = new URL(url); } catch { /* Unconfigured until installed. */ }
  const configured = !!endpoint && endpoint.origin === 'https://script.google.com' && /^\/macros\/s\/[\w-]+\/exec$/.test(endpoint.pathname) && !endpoint.search && !endpoint.hash && secret.length >= 32;
  return {
    configured,
    async call(command, request, session) {
      if (!configured) throw new Error('ยังไม่ได้ตั้งค่าการเชื่อม Apps Script');
      const nonce = randomBytes(24).toString('hex');
      const payload = JSON.stringify({ version: 1, command, request, operator: session.operator, owner: session.owner, nonce, issuedAt: now() });
      const response = await fetchImpl(endpoint.href, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload, signature: sign(payload, secret) }), redirect: 'follow', signal: AbortSignal.timeout(90000) });
      if (!response.ok) throw new Error('Apps Script ไม่ตอบกลับ กรุณาลองคำขอเดิมอีกครั้ง');
      const text = await response.text();
      if (text.length > 2_000_000) throw new Error('ข้อมูลตอบกลับเกินขอบเขต');
      let envelope;
      try { envelope = JSON.parse(text); } catch { throw new Error('Apps Script ตอบกลับผิดรูปแบบ กรุณาตรวจ URL /exec และสิทธิ์ deployment'); }
      if (typeof envelope.payload !== 'string' || !/^[a-f0-9]{64}$/.test(envelope.signature || '')) throw new Error('Apps Script ส่งรูปแบบลายเซ็นไม่ตรงกับ gateway กรุณาตรวจ URL /exec และเวอร์ชัน deployment');
      if (!timingSafeEqual(Buffer.from(envelope.signature, 'hex'), Buffer.from(sign(envelope.payload, secret), 'hex'))) {
        // The key is generated with high entropy. A short digest allows comparison
        // without disclosing it. Returned only through the authenticated backend API.
        const fingerprint = createHash('sha256').update(secret, 'utf8').digest('hex').slice(0, 16);
        throw new Error(`ตรวจลายเซ็นตอบกลับ Apps Script ไม่ผ่าน | Render key: ${fingerprint} | length: ${secret.length} | hex64: ${/^[a-f0-9]{64}$/.test(secret)}`);
      }
      const result = JSON.parse(envelope.payload);
      if (result.nonce !== nonce) throw new Error('คำตอบไม่ตรงกับคำขอ');
      if (!result.ok) throw new Error(result.error || 'Apps Script ปฏิเสธคำขอ');
      return result.result;
    }
  };
}
