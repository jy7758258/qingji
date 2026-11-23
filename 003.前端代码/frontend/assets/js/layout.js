/* 轻记 · 共享布局（变量在 main.js 之前执行） */
(function () {
  'use strict';

  const script = document.currentScript;
  const siteRoot = new URL('../../', script.src);
  const url = function (path) { return new URL(path, siteRoot).href; };
  const body = document.body;
  const layout = body.dataset.layout || 'app';
  const page = body.dataset.page || '';
  const active = body.dataset.active || (page === 'stats' ? 'stats' : page === 'settings' ? 'settings' : 'home');
  const title = body.dataset.title || '';
  const back = body.dataset.back || 'settings.html';

  const icon = function (name, cls) {
    return '<svg class="icon ' + (cls || '') + '" aria-hidden="true" focusable="false"><use href="' +
      url('assets/icons.svg') + '#icon-' + name + '"></use></svg>';
  };

  const esc = function (value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  const currentUser = window.QJAuth ? window.QJAuth.currentUser() : null;
  const initial = (function (username) {
    const chars = Array.from(username || '');
    if (!chars.length) return '林';
    if (/^[A-Za-z]/.test(chars[0]) && chars.length > 1) return (chars[0] + chars[1]).toUpperCase();
    return chars[0].toUpperCase();
  })(currentUser ? currentUser.username : '');

  function avatar() {
    return '<a class="avatar" href="' + url('settings.html') + '" aria-label="打开我的' +
      (currentUser ? '：' + esc(currentUser.username) : '') + '">' + esc(initial) + '</a>';
  }

  const navItems = [
    { key: 'home', label: '明细', href: 'index.html' },
    { key: 'stats', label: '统计', href: 'stats.html' },
    { key: 'settings', label: '我的', href: 'settings.html' }
  ];

  function brand() {
    return '<a class="brand" href="' + url('index.html') + '" aria-label="轻记首页">' +
      '<img class="brand-logo" src="' + url('assets/img/peach.svg') + '" alt="">' +
      '<span class="brand-copy"><span class="brand-name">轻记</span><span class="brand-tag">轻轻记下每一笔</span></span></a>';
  }

  function mainNav() {
    return '<nav class="main-nav" aria-label="主导航">' + navItems.map(function (item) {
      return '<a class="nav-link' + (item.key === active ? ' is-active' : '') + '" href="' + url(item.href) + '"' +
        (item.key === active ? ' aria-current="page"' : '') + '>' + item.label + '</a>';
    }).join('') + '</nav>';
  }

  function headerActions(showRecord) {
    return '<div class="header-actions">' +
      '<button class="icon-button" type="button" data-action="open-search" aria-label="搜索账目">' + icon('search') + '</button>' +
      '<button class="month-pill" type="button" data-toast="原型演示：月份筛选将在接入数据后启用">' +
      icon('calendar', 'icon--sm') + '<span>2026年11月</span>' + icon('chevron-down', 'icon--sm') + '</button>' +
      (showRecord ? '<a class="btn btn--primary btn--sm record-cta" href="' + url('record.html') + '">' + icon('plus', 'icon--sm') + '记一笔</a>' : '') +
      avatar() +
      '</div>';
  }

  function renderHeader() {
    const host = document.getElementById('site-header');
    if (!host) return;
    if (layout === 'auth') {
      host.className = 'auth-header';
      host.innerHTML = brand();
      return;
    }
    if (layout === 'sub' || layout === 'record') {
      host.className = 'site-header site-header--sub';
      host.innerHTML = '<div class="header-inner">' +
        '<a class="back-link" href="' + url(back) + '">' + icon('arrow-left', 'icon--sm') + '返回</a>' +
        '<span class="sub-title">' + title + '</span>' +
        '<div class="header-spacer"></div>' +
        '<div class="header-actions">' + (layout === 'sub' ? avatar() : '') + '</div>' +
        '</div>';
      return;
    }
    host.className = 'site-header';
    host.innerHTML = '<div class="header-inner">' + brand() + mainNav() +
      '<div class="header-spacer"></div>' + headerActions(true) + '</div>';
  }

  function renderMobileNav() {
    const host = document.getElementById('mobile-nav');
    if (!host) return;
    if (layout === 'auth' || layout === 'record') {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }
    host.hidden = false;
    host.className = 'mobile-nav';
    host.innerHTML = navItems.map(function (item) {
      return '<a class="mobile-nav-item' + (item.key === active ? ' is-active' : '') + '" href="' + url(item.href) + '"' +
        (item.key === active ? ' aria-current="page"' : '') + '>' +
        '<span class="mobile-nav-icon">' + icon(item.key === 'home' ? 'receipt' : item.key === 'stats' ? 'chart' : 'user', 'icon--lg') + '</span>' +
        '<span>' + item.label + '</span></a>';
    }).join('');
  }

  function renderFab() {
    let host = document.getElementById('fab-slot');
    if (!host) {
      host = document.createElement('div');
      host.id = 'fab-slot';
      document.body.appendChild(host);
    }
    const show = (layout === 'app' || layout === 'sub') && (page === 'home' || page === 'stats');
    host.innerHTML = show
      ? '<a class="fab" href="' + url('record.html') + '" aria-label="记一笔">' + icon('plus', 'icon--lg') + '</a>'
      : '';
  }

  function renderFooter() {
    const host = document.getElementById('site-footer');
    if (!host) return;
    if (layout === 'auth') {
      host.className = 'auth-foot';
      host.innerHTML = '轻记 v1.1.1 · 前后端联调原型<br>账号认证由本地 Spring Boot 服务处理；请勿在公网明文传输密码。';
      return;
    }
    host.className = 'site-footer';
    host.innerHTML = '<div class="footer-inner"><span>轻记 v1.1.1 · 前端原型 · 账目保存在本地 MySQL</span>' +
      '<span class="footer-note">登录不等于云同步 · <a href="' + url('privacy.html') + '">隐私说明</a></span></div>';
  }

  renderHeader();
  renderMobileNav();
  renderFab();
  renderFooter();
})();
