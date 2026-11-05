(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const apiBase = String(window.RPTH_ADMIN_CONFIG?.apiBase || '').replace(/\/$/, '');
  if (apiBase && !/^https:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/.test(apiBase)) { $('loginStatus').textContent = 'URL backend ไม่ถูกต้อง ต้องเป็น HTTPS'; return; }
  let operator = '', demo = !local && !apiBase, token = '', mode = 'local-demo', bootstrap = null;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  async function request(route, body) {
    const response = await fetch(`${apiBase}/api/admin/${route}`, {
      credentials: apiBase ? 'omit' : 'same-origin', cache: 'no-store',
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { method: 'POST', body: JSON.stringify(body) } : {})
    });
    const result = await response.json();
    if (!response.ok) { if (response.status === 401 && route !== 'login') lock(result.error); throw new Error(result.error || 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ'); }
    return result;
  }
  async function enter(session) {
    if (mode === 'test-copy') bootstrap = await request('bootstrap', {});
    operator = session.operator;
    $('loginPanel').hidden = true;
    $('adminWorkspace').hidden = false;
    $('operatorLabel').textContent = `บัญชี: ${operator}${demo ? ' · UI ทดลอง' : mode === 'test-copy' ? ' · เชื่อมชีตสำเนา' : ' · เซสชัน local ทดลอง'}`;
    resolveReady(session);
  }
  function lock(message) {
    $('adminWorkspace').hidden = true;
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    $('loginPanel').hidden = false;
    $('loginError').textContent = message;
    $('loginError').hidden = false;
    $('loginPassword').value = '';
  }
  window.AdminAccess = {
    ready,
    get live() { return mode === 'test-copy'; },
    get bootstrap() { return bootstrap; },
    preview: (action, values) => request('preview', { action, values }),
    commit: requestData => request('commit', requestData),
    async refresh() { bootstrap = await request('bootstrap', {}); return bootstrap; },
    async verify() {
      if (demo) return { operator };
      try { const result = await request('verify', {}); operator = result.session.operator; return result.session; }
      catch (error) { throw error; }
    }
  };
  $('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    $('loginSubmit').disabled = true;
    $('loginError').hidden = true;
    const password = $('loginPassword').value;
    $('loginPassword').value = '';
    try { const result = await request('login', { operator: $('loginOperator').value, password }); token = result.token || ''; await enter(result.session); }
    catch (error) { $('loginError').textContent = error.message; $('loginError').hidden = false; }
    finally { $('loginSubmit').disabled = false; }
  });
  $('logoutButton').addEventListener('click', async () => {
    try { if (!demo) await request('logout', {}); token = ''; location.reload(); }
    catch (error) { lock(error.message); }
  });
  $('demoEntry').addEventListener('click', () => enter({ operator: 'Admin' }));
  (async () => {
    if (demo) {
      $('loginStatus').textContent = 'หน้านี้เป็น UI ทดลองบนเว็บสาธารณะ ยังไม่เชื่อมระบบล็อกอินหรือทะเบียนจริง';
      $('demoEntry').hidden = false;
      return;
    }
    try {
      const result = await request('session');
      mode = result.mode;
      $('loginOperator').disabled = false;
      $('loginStatus').textContent = result.configured ? (mode === 'test-copy' ? 'เชื่อมชีตสำเนา · เปิดบันทึกเฉพาะลงทะเบียนผู้เล่นใหม่ · เซสชัน 8 ชั่วโมง' : 'เซสชันทดลองบนเครื่องนี้ · หมดอายุใน 8 ชั่วโมง · ไม่มีการเขียนชีต') : 'ยังไม่ได้ตั้ง password hash บนเซิร์ฟเวอร์';
      $('loginPassword').disabled = !result.configured;
      $('loginSubmit').disabled = !result.configured;
      if (result.configured) $('loginStatus').hidden = true;
      if (result.session) await enter(result.session);
    } catch {
      $('loginStatus').textContent = apiBase ? 'เชื่อม backend ไม่สำเร็จ กรุณาลองโหลดหน้าใหม่อีกครั้ง' : 'เชื่อมระบบล็อกอินไม่ได้ กรุณาเปิดผ่าน npm run dev ที่ http://127.0.0.1:4173/admin.html';
    }
  })();
})();
