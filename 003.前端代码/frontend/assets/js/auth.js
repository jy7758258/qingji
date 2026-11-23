/* 轻记 · 认证接入
   会话由后端 HttpOnly Cookie 维护；前端只缓存公开用户信息用于即时渲染。
*/
(function () {
  'use strict';

  const PROTECTED = new Set(['index.html', 'stats.html', 'record.html', 'settings.html', 'account.html', 'data.html', 'categories.html']);
  const AUTH_PAGES = new Set(['login.html', 'register.html', 'forgot-password.html']);
  const USER_KEY = 'qingji_backend_user_v1';
  const API_BASE = (window.QJ_API_BASE
    || (location.protocol + '//' + (location.hostname || 'localhost') + ':8080')).replace(/\/$/, '');

  function pageName() {
    const file = location.pathname.split('/').pop();
    return file && file.endsWith('.html') ? file : 'index.html';
  }

  function readUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      const user = raw ? JSON.parse(raw) : null;
      return user && user.username ? user : null;
    } catch (e) { return null; }
  }

  function writeUser(user) {
    if (!user || !user.username) return;
    try {
      localStorage.setItem(USER_KEY, JSON.stringify({
        id: user.id,
        username: user.username,
        createdAt: user.createdAt
      }));
    } catch (e) { /* ignore */ }
  }

  function clearUser() {
    try { localStorage.removeItem(USER_KEY); } catch (e) { /* ignore */ }
  }

  function normalizeUsername(username) {
    return String(username || '').trim().normalize('NFKC');
  }

  function usernameKey(username) {
    return normalizeUsername(username).toLowerCase();
  }

  async function apiFetch(path, options) {
    const opts = Object.assign({ credentials: 'include' }, options || {});
    opts.headers = Object.assign(
      { 'Accept': 'application/json' },
      opts.body ? { 'Content-Type': 'application/json' } : {},
      opts.headers || {}
    );
    const response = await fetch(API_BASE + path, opts);
    let payload = null;
    const type = response.headers.get('content-type') || '';
    if (type.includes('application/json')) {
      payload = await response.json().catch(function () { return null; });
    }
    if (!response.ok) {
      const message = payload && payload.error && payload.error.message
        ? payload.error.message
        : (response.status === 401 ? '用户名或密码不正确' : '请求失败，请稍后再试');
      const error = new Error(message);
      error.status = response.status;
      error.code = payload && payload.error ? payload.error.code : null;
      throw error;
    }
    return payload;
  }

  async function fetchMe() {
    try {
      const user = await apiFetch('/api/auth/me', { method: 'GET' });
      if (user && user.username) writeUser(user);
      return user;
    } catch (error) {
      if (error.status === 401) {
        clearUser();
        return null;
      }
      if (error.status == null) return readUser(); // 网络故障时保留本地 UI 状态
      throw error;
    }
  }

  async function login(username, password) {
    const user = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: normalizeUsername(username), password: password })
    });
    writeUser(user);
    return user;
  }

  async function register(username, password) {
    const result = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username: normalizeUsername(username), password: password })
    });
    if (result && result.user) writeUser(result.user);
    return result;
  }

  async function logout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      clearUser();
    }
  }

  async function resetPassword(username, recoveryCode, newPassword) {
    await apiFetch('/api/auth/recover', {
      method: 'POST',
      body: JSON.stringify({
        username: normalizeUsername(username),
        recoveryCode: recoveryCode,
        newPassword: newPassword
      })
    });
    clearUser();
  }

  function safeNext(value) {
    const fallback = 'index.html';
    if (!value) return fallback;
    try {
      const url = new URL(value, location.href);
      if (url.origin !== location.origin) return fallback;
      const file = url.pathname.split('/').pop() || 'index.html';
      const allowed = new Set(['index.html', 'stats.html', 'record.html', 'settings.html', 'account.html', 'data.html', 'categories.html', 'privacy.html']);
      return allowed.has(file) ? file + url.search + url.hash : fallback;
    } catch (e) { return fallback; }
  }

  async function guard() {
    const page = pageName();
    const cached = readUser();

    if (PROTECTED.has(page)) {
      document.documentElement.setAttribute('data-auth-pending', 'true');
      try {
        const user = await fetchMe();
        if (!user) {
          clearUser();
          location.replace('login.html?next=' + encodeURIComponent(page + location.search + location.hash));
          return;
        }
        if (!cached || cached.username !== user.username) {
          writeUser(user);
          location.reload();
          return;
        }
        document.documentElement.removeAttribute('data-auth-pending');
      } catch (error) {
        if (cached) {
          document.documentElement.removeAttribute('data-auth-pending');
        } else {
          location.replace('login.html?next=' + encodeURIComponent(page + location.search + location.hash));
        }
      }
      return;
    }

    if (AUTH_PAGES.has(page)) {
      if (cached) {
        location.replace('index.html');
        return;
      }
      try {
        const user = await fetchMe();
        if (user) {
          writeUser(user);
          location.replace('index.html');
        }
      } catch (e) { /* 保持登录页可用 */ }
    }
  }

  window.QJAuth = {
    apiBase: API_BASE,
    currentUser: readUser,
    login: login,
    register: register,
    logout: logout,
    resetPassword: resetPassword,
    safeNext: safeNext,
    usernameKey: usernameKey,
    normalizeUsername: normalizeUsername,
    fetchMe: fetchMe,
    request: apiFetch,
    guard: guard
  };

  guard();
})();
