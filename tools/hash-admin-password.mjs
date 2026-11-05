import { emitKeypressEvents } from 'node:readline';
import { hashPassword } from '../admin-auth.mjs';

if (!process.stdin.isTTY) throw new Error('Run in an interactive terminal; do not pass passwords as arguments.');
emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdout.write('Team password (hidden, 12+ characters): ');
let password = '';
let done = false;
process.stdin.on('keypress', async (text, key) => {
  if (done) return;
  if (key.ctrl && key.name === 'c') { process.stdin.setRawMode(false); process.exit(1); }
  if (key.name === 'return') {
    done = true;
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write('\n');
    if (password.length < 12) { console.error('Use at least 12 characters.'); process.exitCode = 1; return; }
    const hash = await hashPassword(password);
    password = '';
    console.log(hash);
  } else if (key.name === 'backspace') password = [...password].slice(0, -1).join('');
  else if (text && !key.ctrl && !key.meta) password += text;
});
