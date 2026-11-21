/* 轻记 · 本地演示认证
   仅用于前端原型：账号保存在 localStorage，密码使用 PBKDF2-SHA256 派生后保存。
   正式版本必须由服务端使用 Argon2id / bcrypt、HttpOnly Cookie 与会话管理。
*/
(function () {
  'use strict';

  const ACCOUNTS_KEY = 'qingji_demo_accounts_v1';
  const SESSION_KEY = 'qingji_demo_session_v1';
  const SESSION_DAYS = 30;
  const PROTECTED = new Set(['index.html', 'stats.html', 'record.html', 'settings.html', 'account.html', 'data.html', 'categories.html']);
  const AUTH_PAGES = new Set(['login.html', 'register.html', 'forgot-password.html']);
  const SAFE_PAGES = new Set(['index.html', 'stats.html', 'record.html', 'settings.html', 'account.html', 'data.html', 'categories.html', 'privacy.html']);

  function pageName() {
    const file = location.pathname.split('/').pop();
    return file && file.endsWith('.html') ? file : 'index.html';
  }

  function normalizeUsername(username) {
    return String(username || '').trim().normalize('NFKC');
  }
  function usernameKey(username) {
    return normalizeUsername(username).toLowerCase();
  }
  function validUsername(username) {
    const value = normalizeUsername(username);
    return /^[\p{L}\p{N}_]{2,20}$/u.test(value);
  }
  function validPassword(password) {
    return typeof password === 'string' && /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(password);
  }
  function randomHex(bytes) {
    const data = new Uint8Array(bytes);
    crypto.getRandomValues(data);
    return Array.from(data, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  function bytesToHex(buffer) {
    return Array.from(new Uint8Array(buffer), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  async function derive(password, salt) {
    if (!window.crypto || !crypto.subtle) {
      throw new Error('当前浏览器不支持安全加密，请通过本地服务器打开原型');
    }
    const encoder = new TextEncoder();
    const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 150000, hash: 'SHA-256' }, material, 256);
    return bytesToHex(bits);
  }
  function readAccounts() {
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) { return {}; }
  }
  function writeAccounts(accounts) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }
  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session || !session.usernameKey || !session.expiresAt || session.expiresAt < Date.now()) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch (e) { return null; }
  }
  function publicUser(account) {
    return account ? { username: account.username, createdAt: account.createdAt, recoveryCode: account.recoveryCode } : null;
  }
  function currentUser() {
    const session = readSession();
    if (!session) return null;
    const account = readAccounts()[session.usernameKey];
    if (!account) { localStorage.removeItem(SESSION_KEY); return null; }
    return publicUser(account);
  }
  function setSession(account) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      usernameKey: usernameKey(account.username),
      username: account.username,
      expiresAt: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
    }));
  }
  function recoveryCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let raw = '';
    for (let i = 0; i < 16; i += 1) {
      const value = new Uint32Array(1);
      crypto.getRandomValues(value);
      raw += alphabet[value[0] % alphabet.length];
    }
    return raw.slice(0, 4) + '-' + raw.slice(4, 8) + '-' + raw.slice(8, 12) + '-' + raw.slice(12, 16);
  }

  async function register(username, password) {
    const name = normalizeUsername(username);
    if (!validUsername(name)) throw new Error('用户名需为 2–20 位，支持中文、字母、数字和下划线');
    if (!validPassword(password)) throw new Error('密码需为 8–64 位，并同时包含字母和数字');
    const accounts = readAccounts();
    const key = usernameKey(name);
    if (accounts[key]) throw new Error('这个用户名已经被使用了，换一个试试');
    const salt = randomHex(16);
    const passwordHash = await derive(password, salt);
    const account = {
      username: name,
      createdAt: new Date().toISOString(),
      salt: salt,
      passwordHash: passwordHash,
      recoveryCode: recoveryCode()
    };
    accounts[key] = account;
    writeAccounts(accounts);
    setSession(account);
    return publicUser(account);
  }

  async function login(username, password) {
    const key = usernameKey(username);
    const account = readAccounts()[key];
    if (!account) throw new Error('用户名或密码不正确');
    const hash = await derive(password, account.salt);
    if (hash !== account.passwordHash) throw new Error('用户名或密码不正确');
    setSession(account);
    return publicUser(account);
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  async function resetPassword(username, code, newPassword) {
    const key = usernameKey(username);
    const accounts = readAccounts();
    const account = accounts[key];
    const normalizedCode = String(code || '').trim().toUpperCase();
    if (!account || account.recoveryCode !== normalizedCode) {
      throw new Error('用户名或恢复码不正确');
    }
    if (!validPassword(newPassword)) throw new Error('密码需为 8–64 位，并同时包含字母和数字');
    const salt = randomHex(16);
    account.salt = salt;
    account.passwordHash = await derive(newPassword, salt);
    accounts[key] = account;
    writeAccounts(accounts);
    localStorage.removeItem(SESSION_KEY);
    return true;
  }

  function deleteAccount() {
    const session = readSession();
    if (session) {
      const accounts = readAccounts();
      delete accounts[session.usernameKey];
      writeAccounts(accounts);
    }
    logout();
  }

  function safeNext(value) {
    const fallback = 'index.html';
    if (!value) return fallback;
    try {
      const url = new URL(value, location.href);
      if (url.origin !== location.origin) return fallback;
      const file = url.pathname.split('/').pop() || 'index.html';
      if (!SAFE_PAGES.has(file)) return fallback;
      return file + url.search + url.hash;
    } catch (e) { return fallback; }
  }

  function requireAuth() {
    const page = pageName();
    const user = currentUser();
    if (PROTECTED.has(page) && !user) {
      const next = page + location.search + location.hash;
      location.replace('login.html?next=' + encodeURIComponent(next));
      return false;
    }
    if (AUTH_PAGES.has(page) && user) {
      location.replace('index.html');
      return false;
    }
    return true;
  }

  window.QJAuth = {
    register: register,
    login: login,
    logout: logout,
    resetPassword: resetPassword,
    deleteAccount: deleteAccount,
    currentUser: currentUser,
    normalizeUsername: normalizeUsername,
    usernameKey: usernameKey,
    validUsername: validUsername,
    validPassword: validPassword,
    safeNext: safeNext,
    requireAuth: requireAuth
  };

  requireAuth();
})();
