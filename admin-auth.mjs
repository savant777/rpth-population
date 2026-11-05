import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt, 32, options);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}
export function createAuth({ passwordHash = '', now = Date.now } = {}) {
  const operators = ['Admin'];
  const configured = /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(passwordHash);
  const sessions = new Map();
  let attempts = [], busy = false;
  const digest = token => createHash('sha256').update(token).digest('hex');
  const lifetime = 8 * 60 * 60 * 1000;
  return {
    configured, operators,
    async login(operator, password) {
      if (!configured) return { status: 503, error: 'ยังไม่ได้ตั้ง password hash ฝั่งเซิร์ฟเวอร์' };
      attempts = attempts.filter(time => time > now() - 15 * 60 * 1000);
      if (attempts.length >= 5 || busy) return { status: 429, error: 'ลองเข้าสู่ระบบถี่เกินไป กรุณารอแล้วลองใหม่' };
      attempts.push(now());
      if (operator !== 'Admin' || typeof password !== 'string' || !password || Buffer.byteLength(password) > 1024) return { status: 401, error: 'ชื่อบัญชีหรือรหัสไม่ถูกต้อง' };
      busy = true;
      try {
        const [, salt, expected] = passwordHash.split('$');
        const actual = await derive(password, salt, 32, options);
        if (!timingSafeEqual(actual, Buffer.from(expected, 'hex'))) return { status: 401, error: 'ชื่อบัญชีหรือรหัสไม่ถูกต้อง' };
        for (const [key, session] of sessions) if (session.expiresAt <= now()) sessions.delete(key);
        if (sessions.size >= 100) sessions.delete(sessions.keys().next().value);
        const token = randomBytes(32).toString('hex');
        const session = { operator, expiresAt: now() + lifetime };
        sessions.set(digest(token), session);
        return { status: 200, token, session };
      } finally { busy = false; }
    },
    session(token = '') {
      const key = digest(token), session = sessions.get(key);
      if (!session || session.expiresAt <= now()) { sessions.delete(key); return null; }
      return { ...session };
    },
    logout(token = '') { sessions.delete(digest(token)); }
  };
}
