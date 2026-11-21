/* 轻记 · 主应用 */
(function () {
  'use strict';

  const QJ = window.QJ;
  const esc = QJ.charts.esc;
  const $ = function (selector, root) { return (root || document).querySelector(selector); };
  const $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };

  const CHART = QJ.db.CHART;
  const COLOR_CHOICES = CHART.concat(['#C9BBC1']);
  const CAT_ICONS = [
    'bowl', 'train', 'bag', 'home', 'play', 'medical', 'book', 'gift',
    'phone', 'paw', 'plane', 'box', 'wallet', 'trophy', 'briefcase', 'chart',
    'receipt', 'redpacket', 'cup', 'heart', 'sparkle'
  ];
  const DRAFT_KEY = 'qingji-draft-v1';
  const BACKUP_DISMISS_KEY = 'qingji-backup-dismissed';
  const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const numberFormat = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const state = {
    categories: [],
    catMap: new Map(),
    transactions: [],
    settings: {},
    meta: {},
    route: null,
    statsContext: null,
    recordDirty: false
  };

  let toastTimer = null;
  let lastModalFocus = null;
  let modalOpen = false;

  /* ---------------- 基础工具 ---------------- */

  function pad(n) { return String(n).padStart(2, '0'); }
  function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function dateKeyOf(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function monthKeyOf(ts) { return dateKeyOf(ts).slice(0, 7); }
  function currentMonthKey() { return todayKey().slice(0, 7); }
  function parseDateKey(key) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return null;
    const parts = key.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    if (d.getFullYear() !== parts[0] || d.getMonth() !== parts[1] - 1 || d.getDate() !== parts[2]) return null;
    return d;
  }
  function monthParts(key) {
    const parts = String(key || '').split('-');
    return { year: Number(parts[0]), month: Number(parts[1]) };
  }
  function monthLabel(key) {
    const p = monthParts(key);
    return p.year + '年' + p.month + '月';
  }
  function addMonths(key, delta) {
    const p = monthParts(key);
    const d = new Date(p.year, p.month - 1 + delta, 1);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1);
  }
  function daysInMonth(key) {
    const p = monthParts(key);
    return new Date(p.year, p.month, 0).getDate();
  }
  function currentYear() { return new Date().getFullYear(); }
  function compactMoney(cents) {
    const yuan = Math.abs(cents) / 100;
    if (yuan >= 10000) return '¥' + (yuan / 10000).toFixed(1).replace(/\.0$/, '') + '万';
    return '¥' + Math.round(yuan).toLocaleString('zh-CN');
  }
  function signedMoney(cents) {
    const v = Number(cents) || 0;
    return (v < 0 ? '−' : '') + '¥' + numberFormat.format(Math.abs(v) / 100);
  }
  function money(cents) { return numberFormat.format(Math.abs(Number(cents) || 0) / 100); }
  function txSignedMoney(tx) {
    return (tx.type === 'income' ? '+' : '−') + '¥' + money(tx.amountCents);
  }
  function dateLabel(key) {
    if (key === todayKey()) return '今天';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (key === dateKeyOf(yesterday.getTime())) return '昨天';
    const d = parseDateKey(key);
    if (!d) return key;
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return (sameYear ? '' : d.getFullYear() + '年') + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }
  function fullDateLabel(key) {
    const d = parseDateKey(key);
    if (!d) return key;
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + WEEKDAYS[d.getDay()];
  }
  function weekdayLabel(key) {
    const d = parseDateKey(key);
    return d ? WEEKDAYS[d.getDay()] : '';
  }
  function safeColor(color) {
    return /^#[0-9a-fA-F]{6}$/.test(color || '') ? color : '#C9BBC1';
  }
  function hexToRgb(hex) {
    const h = safeColor(hex).slice(1);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgbToHex(rgb) {
    return '#' + rgb.map(function (v) {
      const s = Math.max(0, Math.min(255, Math.round(v))).toString(16);
      return s.length === 1 ? '0' + s : s;
    }).join('');
  }
  function mixColor(a, b, ratio) {
    const aa = hexToRgb(a);
    const bb = hexToRgb(b);
    return rgbToHex(aa.map(function (v, i) { return v + (bb[i] - v) * ratio; }));
  }
  function tintOf(color) { return mixColor(color, '#FFFFFF', 0.86); }
  function inkOf(color) { return mixColor(color, '#3F2A33', 0.42); }
  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
  }
  function isWeChat() { return /MicroMessenger/i.test(navigator.userAgent); }
  function setting(key, fallback) {
    return state.settings[key] === undefined || state.settings[key] === null ? fallback : state.settings[key];
  }
  function catById(id) { return state.catMap.get(id) || null; }
  function topCategory(cat) {
    let current = cat;
    const seen = new Set();
    while (current && current.parentId && !seen.has(current.id)) {
      seen.add(current.id);
      current = catById(current.parentId) || null;
    }
    return current;
  }
  function catForTransaction(tx) {
    let cat = catById(tx.categoryId);
    if (!cat) {
      cat = state.categories.find(function (c) { return c.type === tx.type && !c.parentId && c.name === '其他'; });
    }
    return cat || null;
  }
  function catIcon(cat, size) {
    if (!cat) return '';
    const color = safeColor(cat.color);
    return '<span class="cat-icon" style="--cat-tint:' + tintOf(color) + ';--cat-ink:' + inkOf(color) + '">' +
      QJ.icon(cat.icon, size || 20) + '</span>';
  }
  function orderedTopCategories(type) {
    const recent = Array.isArray(state.settings.recentCategoryIds) ? state.settings.recentCategoryIds : [];
    const tops = state.categories.filter(function (c) { return c.type === type && !c.parentId && !c.hidden; });
    return tops.slice().sort(function (a, b) {
      const ai = recent.findIndex(function (id) {
        const c = catById(id);
        return c && (c.id === a.id || c.parentId === a.id);
      });
      const bi = recent.findIndex(function (id) {
        const c = catById(id);
        return c && (c.id === b.id || c.parentId === b.id);
      });
      const ar = ai < 0 ? 999 : ai;
      const br = bi < 0 ? 999 : bi;
      if (ar !== br) return ar - br;
      return (a.sort || 0) - (b.sort || 0);
    });
  }
  function defaultCategory(type) {
    const recent = Array.isArray(state.settings.recentCategoryIds) ? state.settings.recentCategoryIds : [];
    for (const id of recent) {
      const cat = catById(id);
      if (cat && cat.type === type && !cat.hidden) return cat.id;
    }
    if (type === 'expense') {
      const hour = new Date().getHours();
      let subId = null;
      if (hour >= 5 && hour < 10) subId = 'exp-food-breakfast';
      else if (hour >= 10 && hour < 14) subId = 'exp-food-lunch';
      else if (hour >= 14 && hour < 17) subId = 'exp-food-coffee';
      else if (hour >= 17 && hour < 21) subId = 'exp-food-dinner';
      const sub = catById(subId);
      if (sub && !sub.hidden) return sub.id;
    }
    const tops = orderedTopCategories(type);
    if (tops.length) return tops[0].id;
    const any = state.categories.find(function (c) { return c.type === type && !c.hidden; });
    return any ? any.id : null;
  }
  function categoryTotals(txs) {
    const map = new Map();
    txs.forEach(function (tx) {
      const cat = catForTransaction(tx);
      const top = topCategory(cat);
      if (!top) return;
      if (!map.has(top.id)) {
        map.set(top.id, { id: top.id, name: top.name, color: safeColor(top.color), icon: top.icon, value: 0 });
      }
      map.get(top.id).value += tx.amountCents;
    });
    return Array.from(map.values()).sort(function (a, b) { return b.value - a.value; });
  }
  function donutSlices(totals) {
    const actualOther = totals.filter(function (t) { return t.id === 'exp-other' || t.id === 'inc-other' || t.name === '其他'; });
    const primary = totals.filter(function (t) { return actualOther.indexOf(t) === -1; });
    const top = primary.slice(0, 5);
    const rest = totals.filter(function (t) { return top.indexOf(t) === -1; }).reduce(function (sum, t) { return sum + t.value; }, 0);
    const slices = top.slice();
    if (rest > 0) slices.push({ id: '__other', name: '其他', color: '#C9BBC1', value: rest });
    return slices;
  }
  function monthTransactions(month, type) {
    return state.transactions
      .filter(function (tx) { return monthKeyOf(tx.occurredAt) === month && (!type || tx.type === type); })
      .sort(function (a, b) { return b.occurredAt - a.occurredAt; });
  }
  function yearTransactions(year, type) {
    return state.transactions
      .filter(function (tx) {
        return new Date(tx.occurredAt).getFullYear() === year && (!type || tx.type === type);
      })
      .sort(function (a, b) { return b.occurredAt - a.occurredAt; });
  }
  function groupByDate(txs) {
    const map = new Map();
    txs.forEach(function (tx) {
      const key = dateKeyOf(tx.occurredAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(tx);
    });
    return Array.from(map.entries())
      .sort(function (a, b) { return b[0].localeCompare(a[0]); })
      .map(function (entry) {
        return {
          date: entry[0],
          items: entry[1].slice().sort(function (a, b) { return b.occurredAt - a.occurredAt; })
        };
      });
  }
  function sumAmount(txs) {
    return txs.reduce(function (sum, tx) { return sum + tx.amountCents; }, 0);
  }
  function toastIcon(name) { return QJ.icon(name || 'check', 14); }

  /* ---------------- 数据刷新 ---------------- */

  async function refresh() {
    const snapshot = await QJ.db.getSnapshot();
    state.categories = snapshot.categories.slice().sort(function (a, b) {
      return (a.sort || 0) - (b.sort || 0) || String(a.name).localeCompare(String(b.name), 'zh-CN');
    });
    state.catMap = new Map(state.categories.map(function (c) { return [c.id, c]; }));
    state.transactions = snapshot.transactions.slice().sort(function (a, b) { return b.occurredAt - a.occurredAt; });
    state.settings = snapshot.settings || {};
    state.meta = snapshot.meta || {};
  }

  /* ---------------- 启动与路由 ---------------- */

  document.addEventListener('DOMContentLoaded', function () {
    init();
  });

  async function init() {
    bindGlobal();
    try {
      await QJ.db.init();
      await refresh();
      if (!location.hash) history.replaceState(null, '', '#/');
      window.addEventListener('hashchange', handleRoute);
      await handleRoute();
    } catch (error) {
      renderFatal(error);
    }
  }

  function parseRoute() {
    let raw = location.hash.replace(/^#/, '');
    if (!raw) raw = '/';
    const split = raw.split('?');
    let path = split[0] || '/';
    if (!path.startsWith('/')) path = '/' + path;
    return { path: path, params: new URLSearchParams(split.slice(1).join('?') || '') };
  }

  function navigate(path) {
    const next = '#' + path;
    if (location.hash === next) handleRoute();
    else location.hash = next;
  }

  let routeBusy = false;
  async function handleRoute() {
    if (routeBusy) return;
    routeBusy = true;
    const route = parseRoute();
    state.route = route;
    if (route.path !== '/record') state.recordDirty = false;
    closeModal();
    hideTip();
    try {
      await refresh();
    } catch (error) {
      routeBusy = false;
      renderFatal(error);
      return;
    }

    const path = route.path;
    document.body.dataset.view = path;
    renderTopbar(path, route);
    renderBottomNav(path);
    renderFab(path);
    const view = $('#view');
    view.onclick = null;
    view.onkeydown = null;

    try {
      if (path === '/') {
        renderHome(route);
        document.title = '轻记 · 轻轻记下每一笔';
      } else if (path === '/record') {
        renderRecord(route);
        document.title = (route.params.get('id') ? '编辑账目' : '记一笔') + ' · 轻记';
      } else if (path === '/stats') {
        renderStats(route);
        document.title = '统计 · 轻记';
      } else if (path === '/settings') {
        renderSettings();
        document.title = '我的 · 轻记';
      } else if (path === '/settings/categories') {
        renderCategories(route);
        document.title = '分类管理 · 轻记';
      } else if (path === '/settings/data') {
        await renderData(route);
        document.title = '数据与备份 · 轻记';
      } else if (path === '/settings/about') {
        renderAbout();
        document.title = '关于轻记 · 轻记';
      } else {
        history.replaceState(null, '', '#/');
        renderHome({ path: '/', params: new URLSearchParams() });
        document.title = '轻记 · 轻轻记下每一笔';
      }
    } catch (error) {
      console.error(error);
      renderFatal(error);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
    routeBusy = false;
  }

  async function rerenderCurrent() {
    await refresh();
    const route = state.route || parseRoute();
    if (route.path === '/') renderHome(route);
    else if (route.path === '/stats') renderStats(route);
    else if (route.path === '/settings') renderSettings();
    else if (route.path === '/settings/categories') renderCategories(route);
    else if (route.path === '/settings/data') await renderData(route);
    else if (route.path === '/settings/about') renderAbout();
  }

  function renderFatal(error) {
    const message = error && error.message ? error.message : '本地数据暂时无法读取';
    $('#topbar').innerHTML = '';
    $('#bottom-nav').innerHTML = '';
    $('#fab-slot').innerHTML = '';
    $('#view').innerHTML =
      '<div class="record-page" style="padding-top:8vh">' +
      '<div class="record-card" style="text-align:center">' +
      QJ.mascot('sorry', 110) +
      '<h1 style="font-size:22px;margin:12px 0 6px">有点小状况</h1>' +
      '<p class="muted" style="font-size:13px;line-height:1.6;margin-bottom:16px">' + esc(message) +
      '<br>轻记需要浏览器的本地存储。请关闭无痕模式，或换一个浏览器再试。</p>' +
      '<button class="btn btn-primary" id="retry-init">重新载入</button>' +
      '</div></div>';
    $('#view').style.textAlign = 'center';
    QJ.mascot && ($('.mascot', $('#view')).style.margin = '0 auto');
    const retry = $('#retry-init');
    if (retry) retry.onclick = function () { location.reload(); };
  }

  /* ---------------- 壳层 ---------------- */

  function renderTopbar(path, route) {
    const topbar = $('#topbar');
    topbar.innerHTML = '';

    if (path === '/record') {
      const editing = route.params.get('id');
      topbar.innerHTML =
        '<div class="topbar-inner">' +
        '<button class="icon-btn is-soft" type="button" data-close-record aria-label="关闭记账页">' + QJ.icon('close', 21) + '</button>' +
        '<span class="page-title">' + (editing ? '编辑账目' : '记一笔') + '</span>' +
        '<div class="topbar-spacer"></div>' +
        '</div>';
      return;
    }

    const subTitles = {
      '/settings/categories': '分类管理',
      '/settings/data': '数据与备份',
      '/settings/about': '关于轻记'
    };

    if (subTitles[path]) {
      topbar.innerHTML =
        '<div class="topbar-inner">' +
        '<a class="icon-btn is-soft" href="#/settings" aria-label="返回我的">' + QJ.icon('arrow-left', 21) + '</a>' +
        '<span class="page-title">' + subTitles[path] + '</span>' +
        '<div class="topbar-spacer"></div>' +
        '</div>';
      return;
    }

    const active = path === '/stats' ? 'stats' : (path === '/settings' ? 'settings' : 'home');
    topbar.innerHTML =
      '<div class="topbar-inner">' +
      '<a class="brand" href="#/" aria-label="轻记首页">' + QJ.peachMark(30) +
      '<span class="brand-word">轻记</span><span class="brand-tag">轻轻记下每一笔</span></a>' +
      '<nav class="desktop-nav" aria-label="桌面导航">' +
      '<a href="#/" class="' + (active === 'home' ? 'is-active' : '') + '">明细</a>' +
      '<a href="#/stats" class="' + (active === 'stats' ? 'is-active' : '') + '">统计</a>' +
      '<a href="#/settings" class="' + (active === 'settings' ? 'is-active' : '') + '">我的</a>' +
      '</nav>' +
      '<div class="topbar-spacer"></div>' +
      '<div class="top-actions">' +
      '<a class="btn btn-primary btn-top" href="#/record">' + QJ.icon('plus', 18) + '记一笔</a>' +
      (path === '/settings' ? '' : '<a class="icon-btn" href="#/settings" aria-label="打开我的">' + QJ.icon('settings', 21) + '</a>') +
      '</div>' +
      '</div>';
  }

  function renderBottomNav(path) {
    const nav = $('#bottom-nav');
    if (path === '/record') {
      nav.hidden = true;
      nav.innerHTML = '';
      return;
    }
    nav.hidden = false;
    const active = path === '/' ? 'home' : (path.startsWith('/stats') ? 'stats' : 'settings');
    nav.innerHTML =
      '<a class="nav-item ' + (active === 'home' ? 'is-active' : '') + '" href="#/"' + (active === 'home' ? ' aria-current="page"' : '') + '>' +
      '<span class="nav-ico">' + QJ.icon('receipt', 22) + '</span><span>明细</span></a>' +
      '<a class="nav-item ' + (active === 'stats' ? 'is-active' : '') + '" href="#/stats"' + (active === 'stats' ? ' aria-current="page"' : '') + '>' +
      '<span class="nav-ico">' + QJ.icon('chart', 22) + '</span><span>统计</span></a>' +
      '<a class="nav-item ' + (active === 'settings' ? 'is-active' : '') + '" href="#/settings"' + (active === 'settings' ? ' aria-current="page"' : '') + '>' +
      '<span class="nav-ico">' + QJ.icon('user', 22) + '</span><span>我的</span></a>';
  }

  function renderFab(path) {
    $('#fab-slot').innerHTML = path === '/'
      ? '<a class="fab" href="#/record" aria-label="记一笔">' + QJ.icon('plus', 26) + '</a>'
      : '';
  }

  /* ---------------- 首页 ---------------- */

  function renderHome(route) {
    const month = /^\d{4}-\d{2}$/.test(route.params.get('month') || '') ? route.params.get('month') : currentMonthKey();
    const all = monthTransactions(month);
    const expenses = all.filter(function (tx) { return tx.type === 'expense'; });
    const incomes = all.filter(function (tx) { return tx.type === 'income'; });
    const expense = sumAmount(expenses);
    const income = sumAmount(incomes);
    const prevExpense = sumAmount(monthTransactions(addMonths(month, -1), 'expense'));
    const isCurrent = month === currentMonthKey();
    const elapsed = isCurrent ? new Date().getDate() : daysInMonth(month);
    const avg = elapsed > 0 ? Math.round(expense / elapsed) : 0;
    const groups = groupByDate(all);
    const topTotals = categoryTotals(expenses);
    const topSlices = donutSlices(topTotals);
    const banner = homeBanner();
    const note = expense === 0 ? '从第一笔开始吧' : (prevExpense > 0 && expense > prevExpense * 1.15 ? '慢慢来，都记下' : '记得刚刚好');

    const view = $('#view');
    view.innerHTML =
      banner +
      '<div class="home-layout">' +
      '<div class="home-main">' +
      '<div class="month-bar">' +
      '<div><h1>' + monthLabel(month) + '</h1><span class="month-hint">' + (isCurrent ? '这个月，慢慢记' : '回看这段时间') + '</span></div>' +
      '<div class="month-nav">' +
      (isCurrent ? '' : '<button class="chip" type="button" data-action="home-current">回到本月</button>') +
      '<button class="icon-btn" type="button" data-action="home-month" data-month="' + addMonths(month, -1) + '" aria-label="上一月">' + QJ.icon('chevron-left', 20) + '</button>' +
      '<button class="icon-btn" type="button" data-action="home-month" data-month="' + addMonths(month, 1) + '" aria-label="下一月">' + QJ.icon('chevron-right', 20) + '</button>' +
      '</div>' +
      '</div>' +

      '<section class="receipt-card" aria-label="月度概览">' +
      '<div class="receipt-head"><span class="receipt-kicker">' + (isCurrent ? '本月支出' : '该月支出') + ' · ' + monthParts(month).month + '月</span><span class="stamp">' + (isCurrent ? '本月' : '回看') + '</span></div>' +
      '<div class="receipt-main">' +
      '<div><div class="summary-label">' + (isCurrent ? '这个月花了' : '这个月一共花了') + '</div>' +
      '<div class="amount-display"><span class="currency">¥</span>' + money(expense) + '</div>' +
      '<div class="delta-line">' + deltaHtml(expense, prevExpense) + '</div></div>' +
      '<div class="receipt-mascot">' + QJ.mascot('happy') + '<span class="mascot-note">' + note + '</span></div>' +
      '</div>' +
      '<div class="summary-meta"><span>收入 <b class="income">' + signedMoney(income) + '</b></span><span>结余 <b>' + signedMoney(income - expense) + '</b></span></div>' +
      '<div class="receipt-foot"><span>已记 <b>' + all.length + '</b> 笔</span><span>日均 <b>' + signedMoney(avg) + '</b></span></div>' +
      '</section>' +

      '<div class="section-title"><h2>账目</h2><span class="muted">共 ' + all.length + ' 笔</span></div>' +
      (groups.length ? groups.map(dayGroupHtml).join('') : emptyHomeHtml(isCurrent)) +
      '</div>' +

      '<aside class="home-aside">' + asideHtml(month, topTotals, topSlices, expense) + '</aside>' +
      '</div>';

    bindHome(month);
  }

  function deltaHtml(current, previous) {
    if (!current && !previous) return '<span class="delta-note">还没有支出记录</span>';
    if (!previous) return '<span class="delta-note">上月还没有记录</span>';
    const pct = Math.round(((current - previous) / previous) * 100);
    if (pct === 0) return '<span class="delta">与上月持平</span>';
    const up = pct > 0;
    return '<span class="delta ' + (up ? 'is-up' : 'is-down') + '">' + QJ.icon(up ? 'arrow-up' : 'arrow-down', 13) +
      (up ? '+' : '') + pct + '%</span><span class="delta-note">较上月</span>';
  }

  function homeBanner() {
    if (!state.settings.onboarded) {
      return '<div class="insight-banner" data-banner="onboard">' +
        '<span class="banner-icon">' + QJ.icon('shield', 17) + '</span>' +
        '<div class="banner-copy"><strong>先说明一件事</strong><p>账目只保存在当前浏览器。建议定期导出备份，换设备也不会丢。</p></div>' +
        '<div class="banner-actions"><button class="text-link" type="button" data-action="goto-data">去备份</button>' +
        '<button class="icon-btn banner-dismiss" type="button" data-action="dismiss-onboard" aria-label="知道了">' + QJ.icon('close', 16) + '</button></div></div>';
    }
    if (shouldShowBackupReminder() && !sessionStorage.getItem(BACKUP_DISMISS_KEY)) {
      return '<div class="insight-banner" data-banner="backup">' +
        '<span class="banner-icon">' + QJ.icon('database', 17) + '</span>' +
        '<div class="banner-copy"><strong>该备份一下了</strong><p>账目已经有一阵子没导出。花一分钟，给自己的记录一份保障。</p></div>' +
        '<div class="banner-actions"><button class="text-link" type="button" data-action="goto-data">去备份</button>' +
        '<button class="icon-btn banner-dismiss" type="button" data-action="dismiss-backup" aria-label="本次不再提醒">' + QJ.icon('close', 16) + '</button></div></div>';
    }
    return '';
  }

  function shouldShowBackupReminder() {
    if (!state.settings.backupReminderEnabled) return false;
    if (state.transactions.length < 3) return false;
    const last = Number(state.settings.lastBackupAt) || 0;
    const created = Number(state.meta.createdAt) || Date.now();
    const since = last || created;
    return Date.now() - since > 14 * 24 * 60 * 60 * 1000;
  }

  function dayGroupHtml(group) {
    const expense = sumAmount(group.items.filter(function (tx) { return tx.type === 'expense'; }));
    const income = sumAmount(group.items.filter(function (tx) { return tx.type === 'income'; }));
    return '<section class="day-group">' +
      '<div class="day-head"><div class="day-name">' + dateLabel(group.date) + '<span>' + weekdayLabel(group.date) + '</span></div>' +
      '<div class="day-total">支出 ' + signedMoney(expense) + (income ? ' · 收入 ' + signedMoney(income) : '') + '</div></div>' +
      '<div class="day-sheet">' + group.items.map(txRowHtml).join('') + '</div></section>';
  }

  function txRowHtml(tx) {
    const cat = catForTransaction(tx);
    const top = topCategory(cat);
    const title = tx.note ? tx.note : (cat ? cat.name : '未分类');
    let sub = '';
    if (tx.note) {
      sub = top ? top.name : '';
      if (cat && cat.parentId) sub += (sub ? ' · ' : '') + cat.name;
    } else if (cat && cat.parentId && top) {
      sub = top.name;
    } else {
      sub = tx.type === 'income' ? '收入' : '支出';
    }
    return '<div class="tx-row" data-id="' + esc(tx.id) + '">' +
      '<button class="tx-delete" type="button" data-action="delete-tx" data-id="' + esc(tx.id) + '">删除</button>' +
      '<div class="tx-content">' +
      '<button class="tx-open" type="button" data-action="edit-tx" data-id="' + esc(tx.id) + '">' +
      catIcon(cat, 20) +
      '<span class="tx-main"><span class="tx-title">' + esc(title) + '</span><span class="tx-sub">' + esc(sub) + '</span></span>' +
      '<span class="tx-amount ' + (tx.type === 'income' ? 'is-income' : '') + '">' + txSignedMoney(tx) + '</span>' +
      '</button>' +
      '<button class="tx-more" type="button" data-action="tx-menu" data-id="' + esc(tx.id) + '" aria-label="更多操作">' + QJ.icon('more', 18) + '</button>' +
      '</div></div>';
  }

  function emptyHomeHtml(isCurrent) {
    return '<div class="day-sheet"><div class="empty-state">' + QJ.mascot('soft', 104) +
      '<h3>' + (isCurrent ? '今天还没有记账' : '这个月没有记录') + '</h3>' +
      '<p>' + (isCurrent ? '想到哪笔记哪笔，不用一次记完。' : '换个日期看看，或者从现在开始。') + '</p>' +
      '<a class="btn btn-primary btn-sm" href="#/record">记一笔</a></div></div>';
  }

  function asideHtml(month, totals, slices, expense) {
    if (!totals.length) {
      return '<div class="mini-chart-card"><h2>本月分类</h2>' +
        '<div class="empty-state" style="padding:18px 6px 12px">' + QJ.mascot('soft', 82) +
        '<p>有账目后，这里会出现分类占比。</p></div>' +
        '<a class="text-link" href="#/stats?month=' + month + '">去统计看看 ' + QJ.icon('chevron-right', 13) + '</a></div>';
    }
    const top = totals.slice(0, 4);
    return '<div class="mini-chart-card"><h2>本月分类</h2>' +
      '<div class="mini-donut-wrap">' +
      '<div class="mini-chart-center">' + QJ.charts.donut(slices, { size: 126, stroke: 18, label: '本月分类占比' }) +
      '<div class="donut-total">支出<b>' + compactMoney(expense) + '</b></div></div>' +
      '<ul class="mini-legend">' + top.map(function (t) {
        return '<li><span class="dot" style="background:' + safeColor(t.color) + '"></span><span class="name">' + esc(t.name) +
          '</span><span class="val">' + Math.round(t.value / expense * 100) + '%</span></li>';
      }).join('') + '</ul></div>' +
      '<a class="text-link" href="#/stats?month=' + month + '">查看完整统计 ' + QJ.icon('chevron-right', 13) + '</a></div>';
  }

  function bindHome(month) {
    const view = $('#view');
    view.onclick = async function (event) {
      const actionEl = event.target.closest('[data-action]');
      if (!actionEl) return;
      const action = actionEl.dataset.action;

      if (action === 'home-month') {
        navigate('/?month=' + actionEl.dataset.month);
        return;
      }
      if (action === 'home-current') {
        navigate('/?month=' + currentMonthKey());
        return;
      }
      if (action === 'dismiss-onboard') {
        await QJ.db.saveSettings({ onboarded: true });
        state.settings.onboarded = true;
        const banner = $('[data-banner="onboard"]');
        if (banner) banner.remove();
        return;
      }
      if (action === 'dismiss-backup') {
        sessionStorage.setItem(BACKUP_DISMISS_KEY, '1');
        const banner = $('[data-banner="backup"]');
        if (banner) banner.remove();
        return;
      }
      if (action === 'goto-data') {
        navigate('/settings/data');
        return;
      }
      if (action === 'edit-tx') {
        const row = actionEl.closest('.tx-row');
        if (row && row.classList.contains('is-open')) {
          row.classList.remove('is-open');
          return;
        }
        navigate('/record?id=' + encodeURIComponent(actionEl.dataset.id));
        return;
      }
      if (action === 'tx-menu') {
        const tx = state.transactions.find(function (t) { return t.id === actionEl.dataset.id; });
        if (tx) openTxMenu(tx);
        return;
      }
      if (action === 'delete-tx') {
        const tx = state.transactions.find(function (t) { return t.id === actionEl.dataset.id; });
        if (tx) await deleteTransaction(tx);
      }
    };

    $$('.tx-content', view).forEach(function (content) {
      const row = content.closest('.tx-row');
      let startX = 0;
      let startY = 0;
      let dx = 0;
      let active = false;
      content.addEventListener('touchstart', function (event) {
        if (event.touches.length !== 1) return;
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
        dx = 0;
        active = true;
      }, { passive: true });
      content.addEventListener('touchmove', function (event) {
        if (!active) return;
        dx = event.touches[0].clientX - startX;
        const dy = event.touches[0].clientY - startY;
        if (Math.abs(dx) < Math.abs(dy)) return;
        const base = row.classList.contains('is-open') ? -78 : 0;
        const x = Math.max(-92, Math.min(4, base + dx));
        content.style.transform = 'translateX(' + x + 'px)';
      }, { passive: true });
      content.addEventListener('touchend', function () {
        if (!active) return;
        active = false;
        content.style.transform = '';
        const base = row.classList.contains('is-open') ? -78 : 0;
        if (base + dx < -36) row.classList.add('is-open');
        else row.classList.remove('is-open');
        dx = 0;
      }, { passive: true });
    });
  }

  async function deleteTransaction(tx) {
    try {
      await QJ.db.softDeleteTransaction(tx.id);
      await rerenderCurrent();
      showToast('已删除 ' + txSignedMoney(tx), {
        icon: 'trash',
        undo: async function () {
          await QJ.db.restoreTransaction(tx.id);
          await rerenderCurrent();
        }
      });
    } catch (error) {
      showToast('删除失败，请再试一次', { icon: 'info' });
    }
  }

  function openTxMenu(tx) {
    const cat = catForTransaction(tx);
    openActionSheet({
      title: tx.note || (cat ? cat.name : '这笔账目'),
      subtitle: txSignedMoney(tx) + ' · ' + dateLabel(dateKeyOf(tx.occurredAt)),
      actions: [
        { label: '编辑这笔账目', icon: 'edit', onClick: function () { closeModal(); navigate('/record?id=' + encodeURIComponent(tx.id)); } },
        { label: '删除', icon: 'trash', danger: true, onClick: function () { closeModal(); deleteTransaction(tx); } }
      ]
    });
  }

  /* ---------------- 记账页 ---------------- */

  function readDraft() {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const draft = JSON.parse(raw);
      if (!draft || Date.now() - (draft.savedAt || 0) > 24 * 60 * 60 * 1000) {
        sessionStorage.removeItem(DRAFT_KEY);
        return null;
      }
      return draft;
    } catch (e) { return null; }
  }

  function clearDraft() {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
  }

  function renderRecord(route) {
    const view = $('#view');
    const id = route.params.get('id');
    const existing = id ? state.transactions.find(function (t) { return t.id === id; }) : null;
    if (id && !existing) {
      view.innerHTML = '<div class="record-page"><div class="record-card" style="text-align:center">' +
        QJ.mascot('sorry', 100) + '<h1 style="font-size:21px;margin:10px 0 6px">没找到这笔账目</h1>' +
        '<p class="muted" style="font-size:13px;margin-bottom:16px">它可能已经被删除了。</p>' +
        '<a class="btn btn-primary btn-sm" href="#/">回到明细</a></div></div>';
      return;
    }

    const draft = !existing ? readDraft() : null;
    const form = existing ? {
      type: existing.type,
      amount: (existing.amountCents / 100).toFixed(2),
      categoryId: existing.categoryId,
      note: existing.note || '',
      date: dateKeyOf(existing.occurredAt),
      again: false
    } : draft ? {
      type: draft.type === 'income' ? 'income' : 'expense',
      amount: draft.amount || '',
      categoryId: draft.categoryId || '',
      note: draft.note || '',
      date: parseDateKey(draft.date) ? draft.date : todayKey(),
      again: !!draft.again
    } : {
      type: state.settings.lastType === 'income' ? 'income' : 'expense',
      amount: '',
      categoryId: '',
      note: '',
      date: todayKey(),
      again: !!state.settings.lastAgain
    };

    if (!form.categoryId || !catById(form.categoryId) || catById(form.categoryId).type !== form.type) {
      form.categoryId = defaultCategory(form.type);
    }

    let categoryTouched = !!draft;
    let saving = false;
    let initial = '';

    view.innerHTML =
      '<div class="record-page">' +
      '<p class="record-lead">金额之外，其他都可以不改。</p>' +
      '<form class="record-card" id="record-form" novalidate>' +
      '<div class="type-switch" role="group" aria-label="收支类型">' +
      '<button type="button" data-record-type="expense" class="' + (form.type === 'expense' ? 'is-active' : '') + '" aria-pressed="' + (form.type === 'expense') + '">支出</button>' +
      '<button type="button" data-record-type="income" class="' + (form.type === 'income' ? 'is-active' : '') + '" aria-pressed="' + (form.type === 'income') + '">收入</button>' +
      '</div>' +

      '<div class="amount-field"><span class="currency">¥</span>' +
      '<input id="amount-input" type="text" inputmode="decimal" autocomplete="off" maxlength="11" placeholder="0.00" aria-label="金额" value="' + esc(form.amount) + '">' +
      '</div>' +
      '<div class="amount-hint-row"><span class="amount-hint" id="amount-hint">最多两位小数</span><span class="field-error" id="amount-error" hidden></span></div>' +

      '<div class="form-block"><div class="form-label"><span>分类</span><span class="muted">常用优先</span></div>' +
      '<div id="category-area"></div></div>' +

      '<div class="form-block">' +
      '<div class="form-row">' +
      '<span class="row-icon">' + QJ.icon('calendar', 18) + '</span>' +
      '<div class="row-main"><div class="row-label">日期</div><div class="row-value">' +
      '<button class="chip date-quick" type="button" data-quick-date="' + todayKey() + '">今天</button>' +
      '<button class="chip date-quick" type="button" data-quick-date="' + dateKeyOf(Date.now() - 86400000) + '">昨天</button>' +
      '<input type="date" id="date-input" value="' + esc(form.date) + '" aria-label="选择日期">' +
      '</div></div></div>' +
      '<div class="form-row">' +
      '<span class="row-icon">' + QJ.icon('edit', 18) + '</span>' +
      '<div class="row-main"><div class="row-label">备注（选填）</div>' +
      '<input type="text" id="note-input" maxlength="200" autocomplete="off" placeholder="例如：和同事吃午饭" value="' + esc(form.note) + '">' +
      '</div></div>' +
      '</div>' +

      (existing ? '' :
        '<div class="again-row"><span>保存后再记一笔</span><label class="switch">' +
        '<input type="checkbox" id="again-input"' + (form.again ? ' checked' : '') + '><span class="track"></span></label></div>') +
      '</form>' +

      '<div class="record-actions">' +
      '<button class="btn btn-primary btn-block" id="save-record" type="submit" form="record-form">' + (existing ? '保存修改' : '保存') + '</button>' +
      '<p class="record-save-hint">' + (existing ? '修改后会同步更新统计' : '按 Enter 也可以保存') + '</p>' +
      '</div></div>';

    const amountInput = $('#amount-input');
    const noteInput = $('#note-input');
    const dateInput = $('#date-input');
    const categoryArea = $('#category-area');
    const saveButton = $('#save-record');
    const errorEl = $('#amount-error');

    function snapshot() {
      return JSON.stringify({
        type: form.type,
        amount: form.amount,
        categoryId: form.categoryId,
        note: form.note,
        date: form.date,
        again: form.again
      });
    }
    initial = snapshot();

    function markDirty() {
      state.recordDirty = snapshot() !== initial;
      persistDraft();
    }

    function persistDraft() {
      if (existing) return;
      if (!state.recordDirty) {
        clearDraft();
        return;
      }
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
          type: form.type,
          amount: form.amount,
          categoryId: form.categoryId,
          note: form.note,
          date: form.date,
          again: form.again,
          savedAt: Date.now()
        }));
      } catch (e) { /* ignore */ }
    }

    function cents() {
      const value = parseFloat(form.amount);
      if (!isFinite(value)) return 0;
      return Math.round(value * 100);
    }

    function updateSave() {
      const value = cents();
      saveButton.disabled = value <= 0;
      if (value > 0) errorEl.hidden = true;
    }

    function renderCategories() {
      const tops = orderedTopCategories(form.type);
      if (!tops.length) {
        categoryArea.innerHTML = '<p class="hint">没有可用分类。去 <a class="text-link" href="#/settings/categories">分类管理</a> 添加一个吧。</p>';
        return;
      }
      const selected = catById(form.categoryId);
      const selectedTop = selected ? topCategory(selected) : null;
      const topId = selectedTop ? selectedTop.id : null;
      const children = selectedTop ? state.categories.filter(function (c) {
        return c.parentId === selectedTop.id && !c.hidden;
      }).sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); }) : [];

      let html = '<div class="category-grid">' + tops.map(function (cat) {
        const active = cat.id === topId;
        return '<button class="cat-option ' + (active ? 'is-active' : '') + '" type="button" data-cat-id="' + esc(cat.id) + '" aria-pressed="' + active + '">' +
          catIcon(cat, 19) + '<span>' + esc(cat.name) + '</span></button>';
      }).join('') + '</div>';

      if (selectedTop && children.length) {
        html += '<div class="subcategory-block"><div class="subcategory-label">细分（可选）</div><div class="subcategory-row">' +
          '<button class="chip ' + (form.categoryId === selectedTop.id ? 'is-active' : '') + '" type="button" data-sub-cat-id="' + esc(selectedTop.id) + '">不细分</button>' +
          children.map(function (child) {
            return '<button class="chip ' + (form.categoryId === child.id ? 'is-active' : '') + '" type="button" data-sub-cat-id="' + esc(child.id) + '">' + esc(child.name) + '</button>';
          }).join('') + '</div></div>';
      }
      categoryArea.innerHTML = html;
    }

    function updateTypeButtons() {
      $$('[data-record-type]', view).forEach(function (button) {
        const active = button.dataset.recordType === form.type;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
    }

    function updateDateQuicks() {
      $$('[data-quick-date]', view).forEach(function (button) {
        button.classList.toggle('is-active', button.dataset.quickDate === form.date);
      });
    }

    function noteSuggestion(text) {
      if (!text) return null;
      const rules = form.type === 'income' ? [
        { words: ['工资', '薪水'], id: 'inc-salary' },
        { words: ['奖金', '年终'], id: 'inc-bonus' },
        { words: ['报销'], id: 'inc-reimburse' },
        { words: ['红包'], id: 'inc-redpacket' },
        { words: ['利息', '分红', '理财'], id: 'inc-invest' }
      ] : [
        { words: ['地铁', '公交', '通勤'], id: 'exp-transport-metro' },
        { words: ['打车', '滴滴', '出租车'], id: 'exp-transport-taxi' },
        { words: ['咖啡', '拿铁', '美式', '奶茶'], id: 'exp-food-coffee' },
        { words: ['外卖', '美团', '饿了么'], id: 'exp-food-takeout' },
        { words: ['早餐'], id: 'exp-food-breakfast' },
        { words: ['午餐', '午饭'], id: 'exp-food-lunch' },
        { words: ['晚餐', '晚饭'], id: 'exp-food-dinner' },
        { words: ['房租', '水费', '电费', '燃气', '物业'], id: 'exp-housing-rent' },
        { words: ['电影', '游戏', '会员', '演出'], id: 'exp-fun-movie' },
        { words: ['药', '医院', '挂号'], id: 'exp-medical-medicine' },
        { words: ['书', '课程', '学费'], id: 'exp-education-course' },
        { words: ['红包', '礼物'], id: 'exp-gift-present' },
        { words: ['话费', '流量'], id: 'exp-phone-bill' },
        { words: ['猫', '狗', '宠物'], id: 'exp-pet-food' },
        { words: ['酒店', '机票', '门票', '旅行'], id: 'exp-travel-hotel' }
      ];
      for (const rule of rules) {
        if (rule.words.some(function (word) { return text.includes(word); })) {
          const cat = catById(rule.id);
          if (cat && cat.type === form.type && !cat.hidden) return cat.id;
        }
      }
      return null;
    }

    renderCategories();
    updateSave();
    updateDateQuicks();

    amountInput.addEventListener('input', function () {
      form.amount = cleanAmount(amountInput.value);
      amountInput.value = form.amount;
      updateSave();
      markDirty();
    });

    noteInput.addEventListener('input', function () {
      form.note = noteInput.value;
      if (!categoryTouched) {
        const suggested = noteSuggestion(form.note);
        if (suggested && suggested !== form.categoryId) {
          form.categoryId = suggested;
          renderCategories();
        }
      }
      markDirty();
    });

    dateInput.addEventListener('change', function () {
      form.date = parseDateKey(dateInput.value) ? dateInput.value : todayKey();
      dateInput.value = form.date;
      updateDateQuicks();
      markDirty();
    });

    const againInput = $('#again-input');
    if (againInput) {
      againInput.addEventListener('change', function () {
        form.again = againInput.checked;
        QJ.db.saveSettings({ lastAgain: form.again }).catch(function () {});
        markDirty();
      });
    }

    view.onclick = function (event) {
      const typeButton = event.target.closest('[data-record-type]');
      if (typeButton) {
        form.type = typeButton.dataset.recordType;
        if (!form.categoryId || !catById(form.categoryId) || catById(form.categoryId).type !== form.type) {
          form.categoryId = defaultCategory(form.type);
        }
        categoryTouched = false;
        updateTypeButtons();
        renderCategories();
        markDirty();
        return;
      }
      const quick = event.target.closest('[data-quick-date]');
      if (quick) {
        form.date = quick.dataset.quickDate;
        dateInput.value = form.date;
        updateDateQuicks();
        markDirty();
        return;
      }
      const catButton = event.target.closest('[data-cat-id]');
      if (catButton) {
        form.categoryId = catButton.dataset.catId;
        categoryTouched = true;
        renderCategories();
        markDirty();
        return;
      }
      const subButton = event.target.closest('[data-sub-cat-id]');
      if (subButton) {
        form.categoryId = subButton.dataset.subCatId;
        categoryTouched = true;
        renderCategories();
        markDirty();
      }
    };

    view.onkeydown = function (event) {
      if (event.key === 'Escape' && !modalOpen) {
        event.preventDefault();
        requestCloseRecord();
        return;
      }
      if (event.key === 'Enter' && !event.isComposing && (event.target.tagName === 'INPUT' || event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        submitRecord();
      }
    };

    $('#record-form').addEventListener('submit', function (event) {
      event.preventDefault();
      submitRecord();
    });

    saveButton.addEventListener('click', function () {});

    if (draft) showToast('已恢复上次没保存完的记录', { icon: 'refresh', duration: 3200 });
    setTimeout(function () {
      if (!form.amount) amountInput.focus();
    }, 60);

    async function submitRecord() {
      if (saving) return;
      const amountCents = cents();
      if (amountCents <= 0 || amountCents > 999999999) {
        errorEl.textContent = amountCents <= 0 ? '请输入金额' : '金额超出上限';
        errorEl.hidden = false;
        amountInput.focus();
        return;
      }
      const category = catById(form.categoryId);
      if (!category || category.type !== form.type) {
        showToast('请选择一个分类', { icon: 'info' });
        return;
      }
      const dateKey = parseDateKey(form.date) ? form.date : todayKey();
      const date = parseDateKey(dateKey);
      const now = new Date();
      const occurred = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      if (dateKey === todayKey()) occurred.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
      else occurred.setHours(12, 0, 0, 0);

      saving = true;
      saveButton.disabled = true;
      const previous = existing ? JSON.parse(JSON.stringify(existing)) : null;
      const record = existing ? Object.assign({}, existing) : {
        id: QJ.db.uid(),
        currency: 'CNY',
        source: 'manual',
        createdAt: Date.now(),
        deletedAt: null
      };
      record.type = form.type;
      record.amountCents = amountCents;
      record.categoryId = category.id;
      record.note = form.note.trim().slice(0, 200);
      record.occurredAt = occurred.getTime();
      record.updatedAt = Date.now();

      try {
        await QJ.db.putTransaction(record);
        const recent = [category.id].concat((state.settings.recentCategoryIds || []).filter(function (x) { return x !== category.id; })).slice(0, 12);
        await QJ.db.saveSettings({ recentCategoryIds: recent, lastType: form.type });
        state.settings.recentCategoryIds = recent;
        state.settings.lastType = form.type;
        state.recordDirty = false;
        clearDraft();

        if (existing) {
          navigate('/');
          showToast('已更新这笔账目', {
            icon: 'check',
            undo: async function () {
              await QJ.db.putTransaction(previous);
              await rerenderCurrent();
            }
          });
          return;
        }

        if (form.again) {
          form.amount = '';
          form.note = '';
          amountInput.value = '';
          noteInput.value = '';
          initial = snapshot();
          state.recordDirty = false;
          saving = false;
          clearDraft();
          updateSave();
          saveButton.disabled = false;
          amountInput.focus();
          showToast('已记 ' + signedMoney(record.amountCents) + ' · ' + category.name, {
            icon: 'check',
            undo: async function () {
              await QJ.db.softDeleteTransaction(record.id);
              await rerenderCurrent();
            }
          });
          return;
        }

        navigate('/');
        showToast('已记 ' + signedMoney(record.amountCents) + ' · ' + category.name, {
          icon: 'check',
          undo: async function () {
            await QJ.db.softDeleteTransaction(record.id);
            await rerenderCurrent();
          }
        });
      } catch (error) {
        console.error(error);
        saving = false;
        saveButton.disabled = false;
        showToast('保存失败，请再试一次', { icon: 'info' });
      }
    }
  }

  function cleanAmount(value) {
    let text = String(value == null ? '' : value).replace(/[^\d.]/g, '');
    const firstDot = text.indexOf('.');
    if (firstDot !== -1) {
      text = text.slice(0, firstDot + 1) + text.slice(firstDot + 1).replace(/\./g, '');
    }
    const parts = text.split('.');
    let intPart = (parts[0] || '').replace(/^0+(?=\d)/, '').slice(0, 7);
    if (text.startsWith('.')) intPart = '0';
    const decPart = parts.length > 1 ? parts[1].slice(0, 2) : '';
    return intPart + (parts.length > 1 ? '.' + decPart : '');
  }

  async function requestCloseRecord() {
    if (!state.recordDirty) {
      clearDraft();
      navigate('/');
      return;
    }
    openConfirm({
      title: '放弃这笔记录？',
      message: '还没保存的内容会丢失。也可以留在这一页继续填写。',
      confirmText: '放弃',
      cancelText: '继续编辑',
      danger: true,
      onConfirm: function () {
        state.recordDirty = false;
        clearDraft();
        navigate('/');
      }
    });
  }

  /* ---------------- 统计页 ---------------- */

  function renderStats(route) {
    const view = $('#view');
    const viewMode = route.params.get('view') === 'year' ? 'year' : 'month';
    const type = route.params.get('type') === 'income' ? 'income' : 'expense';
    const month = /^\d{4}-\d{2}$/.test(route.params.get('month') || '') ? route.params.get('month') : currentMonthKey();
    const year = monthParts(month).year;
    const periodTxs = viewMode === 'year' ? yearTransactions(year, type) : monthTransactions(month, type);
    const total = sumAmount(periodTxs);
    const count = periodTxs.length;
    const max = periodTxs.reduce(function (m, tx) { return Math.max(m, tx.amountCents); }, 0);
    const totals = categoryTotals(periodTxs);
    const slices = donutSlices(totals);
    const now = new Date();
    let days;
    if (viewMode === 'year') {
      const start = new Date(year, 0, 1);
      const end = new Date(year + 1, 0, 1);
      days = Math.max(1, Math.round((Math.min(now.getTime(), end.getTime()) - start.getTime()) / 86400000));
    } else {
      days = (month === currentMonthKey()) ? now.getDate() : daysInMonth(month);
    }
    const avg = Math.round(total / Math.max(1, days));
    const typeLabel = type === 'income' ? '收入' : '支出';

    let trendMonths;
    if (viewMode === 'year') {
      trendMonths = Array.from({ length: 12 }, function (_, i) {
        const key = year + '-' + pad(i + 1);
        return { key: key, label: (i + 1) + '月' };
      });
    } else {
      trendMonths = Array.from({ length: 6 }, function (_, i) {
        const key = addMonths(month, i - 5);
        return { key: key, label: monthParts(key).month + '月' };
      });
    }
    const trendItems = trendMonths.map(function (item) {
      const value = sumAmount(monthTransactions(item.key, type));
      return {
        key: item.key,
        label: item.label,
        value: value,
        shortValue: compactMoney(value)
      };
    });
    const selectedTrend = viewMode === 'year'
      ? (year === now.getFullYear() ? currentMonthKey() : year + '-12')
      : month;

    const periodLabel = viewMode === 'year' ? year + '年' : monthLabel(month);
    const prevTarget = viewMode === 'year' ? String(year - 1) : addMonths(month, -1);
    const nextTarget = viewMode === 'year' ? String(year + 1) : addMonths(month, 1);
    const isNow = viewMode === 'year' ? year === now.getFullYear() : month === currentMonthKey();

    state.statsContext = {
      view: viewMode,
      type: type,
      month: month,
      year: year,
      periodTxs: periodTxs,
      periodLabel: periodLabel,
      total: total
    };

    view.innerHTML =
      '<div class="page-head"><h1>统计</h1><p>看见钱去了哪里，才知道可以从哪里开始。</p></div>' +
      '<div class="stats-toolbar">' +
      '<div class="period-switch">' +
      '<button class="icon-btn" type="button" data-action="stats-prev" data-target="' + esc(prevTarget) + '" aria-label="上一周期">' + QJ.icon('chevron-left', 19) + '</button>' +
      '<span class="period-label">' + periodLabel + '</span>' +
      '<button class="icon-btn" type="button" data-action="stats-next" data-target="' + esc(nextTarget) + '" aria-label="下一周期">' + QJ.icon('chevron-right', 19) + '</button>' +
      '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">' +
      '<div class="segmented" role="group" aria-label="时间范围">' +
      '<button type="button" class="' + (viewMode === 'month' ? 'is-active' : '') + '" data-action="stats-view" data-view="month">月</button>' +
      '<button type="button" class="' + (viewMode === 'year' ? 'is-active' : '') + '" data-action="stats-view" data-view="year">年</button>' +
      '</div>' +
      '<div class="segmented" role="group" aria-label="收支类型">' +
      '<button type="button" class="' + (type === 'expense' ? 'is-active' : '') + '" data-action="stats-type" data-type="expense">支出</button>' +
      '<button type="button" class="' + (type === 'income' ? 'is-active' : '') + '" data-action="stats-type" data-type="income">收入</button>' +
      '</div>' +
      (isNow ? '' : '<button class="chip" type="button" data-action="stats-now">回到本月</button>') +
      '</div></div>' +

      '<div class="stats-layout">' +
      '<div>' +
      '<div class="stat-strip">' +
      '<div class="stat-cell"><div class="stat-label">' + typeLabel + '合计</div><div class="stat-value ' + (type === 'income' ? 'is-income' : '') + '">' + signedMoney(total) + '</div></div>' +
      '<div class="stat-cell"><div class="stat-label">日均</div><div class="stat-value">' + signedMoney(avg) + '</div></div>' +
      '<div class="stat-cell"><div class="stat-label">笔数</div><div class="stat-value">' + count + ' <span class="tiny">笔</span></div></div>' +
      '<div class="stat-cell"><div class="stat-label">最大单笔</div><div class="stat-value">' + (max ? signedMoney(max) : '—') + '</div></div>' +
      '</div>' +

      '<section class="chart-panel">' +
      '<div class="chart-panel-head"><div><h2>' + (viewMode === 'year' ? year + '年' : '本月') + '分类构成</h2><p>按一级分类，点击分类查看明细</p></div></div>' +
      (total > 0 ? statsChartHtml(slices, totals, total, typeLabel) : statsEmptyHtml(typeLabel)) +
      '</section>' +
      '</div>' +

      '<div>' +
      '<section class="chart-panel trend-panel">' +
      '<div class="chart-panel-head"><div><h2>近' + trendItems.length + '个月' + typeLabel + '</h2><p>点击柱子切换到对应月份</p></div></div>' +
      QJ.charts.trendBars(trendItems, selectedTrend) +
      '<details class="data-table"><summary>查看趋势数据表</summary>' +
      '<table><thead><tr><th scope="col">月份</th><th scope="col">' + typeLabel + '</th></tr></thead><tbody>' +
      trendItems.map(function (item) {
        return '<tr><td>' + esc(item.label) + '</td><td class="num">' + signedMoney(item.value) + '</td></tr>';
      }).join('') + '</tbody></table></details>' +
      '</section>' +
      '</div>' +
      '</div>';

    bindStats(route, viewMode, type, month, prevTarget, nextTarget);
    bindChartTips(view);
  }

  function statsChartHtml(slices, totals, total, typeLabel) {
    return '<div class="donut-layout">' +
      '<div class="donut-wrap">' + QJ.charts.donut(slices, { size: 230, stroke: 28, label: typeLabel + '分类占比' }) +
      '<div class="donut-center"><div class="label">' + typeLabel + '合计</div><div class="value"><span class="currency">¥</span>' + money(total) + '</div></div>' +
      '</div>' +
      '<div class="rank-list">' + slices.map(function (slice) {
        const pct = total > 0 ? Math.round(slice.value / total * 100) : 0;
        const inner = '<span class="rank-dot" style="background:' + safeColor(slice.color) + '"></span>' +
          '<span class="rank-main"><span class="rank-top"><span class="name">' + esc(slice.name) + '</span>' +
          '<span class="amount">' + signedMoney(slice.value) + '</span></span>' +
          '<span class="rank-bar"><span style="width:' + Math.max(2, pct) + '%;background:' + safeColor(slice.color) + '"></span></span></span>' +
          '<span class="rank-pct">' + pct + '%</span>';
        return slice.id === '__other'
          ? '<div class="rank-row">' + inner + '</div>'
          : '<button class="rank-row" type="button" data-action="drill-cat" data-id="' + esc(slice.id) + '">' + inner + '</button>';
      }).join('') + '</div></div>' +
      '<details class="data-table"><summary>查看分类数据表</summary>' +
      '<table><thead><tr><th scope="col">分类</th><th scope="col">金额</th><th scope="col">占比</th></tr></thead><tbody>' +
      totals.map(function (t) {
        const pct = total > 0 ? Math.round(t.value / total * 100) : 0;
        return '<tr><td>' + esc(t.name) + '</td><td class="num">' + signedMoney(t.value) + '</td><td class="num">' + pct + '%</td></tr>';
      }).join('') +
      '<tr><td><strong>合计</strong></td><td class="num"><strong>' + signedMoney(total) + '</strong></td><td class="num">100%</td></tr>' +
      '</tbody></table></details>';
  }

  function statsEmptyHtml(typeLabel) {
    return '<div class="chart-empty">' + QJ.mascot('soft', 86) +
      '<p>这一段时间还没有' + typeLabel + '记录。<br>记下第一笔，就能看见形状。</p></div>';
  }

  function statsHref(month, view, type) {
    return '/stats?month=' + encodeURIComponent(month) + '&view=' + view + '&type=' + type;
  }

  function bindStats(route, viewMode, type, month, prevTarget, nextTarget) {
    const view = $('#view');
    view.onclick = function (event) {
      const el = event.target.closest('[data-action]');
      if (!el) return;
      const action = el.dataset.action;
      if (action === 'stats-prev' || action === 'stats-next') {
        const target = el.dataset.target;
        const nextMonth = viewMode === 'year' ? target + '-01' : target;
        navigate(statsHref(nextMonth, viewMode, type));
        return;
      }
      if (action === 'stats-view') {
        navigate(statsHref(month, el.dataset.view, type));
        return;
      }
      if (action === 'stats-type') {
        navigate(statsHref(month, viewMode, el.dataset.type));
        return;
      }
      if (action === 'stats-now') {
        navigate(statsHref(currentMonthKey(), viewMode, type));
        return;
      }
      if (action === 'trend-month') {
        navigate(statsHref(el.dataset.month, 'month', type));
        return;
      }
      if (action === 'drill-cat') {
        openCategoryDrill(el.dataset.id);
      }
    };
  }

  function openCategoryDrill(topId) {
    const ctx = state.statsContext;
    if (!ctx) return;
    const top = catById(topId);
    if (!top) return;
    const items = ctx.periodTxs.filter(function (tx) {
      const cat = catForTransaction(tx);
      const t = topCategory(cat);
      return t && t.id === topId;
    });
    const total = sumAmount(items);
    const body = '<p class="modal-note" style="margin-bottom:10px">共 ' + items.length + ' 笔 · ' + signedMoney(total) + '</p>' +
      (items.length ? '<div class="drill-list">' + items.map(function (tx) {
        const cat = catForTransaction(tx);
        return '<button class="drill-row" type="button" data-drill-id="' + esc(tx.id) + '">' +
          catIcon(cat, 18) +
          '<span class="drill-main"><span class="drill-title">' + esc(tx.note || (cat ? cat.name : '未分类')) + '</span>' +
          '<span class="drill-sub">' + dateLabel(dateKeyOf(tx.occurredAt)) + (cat && cat.parentId ? ' · ' + esc(cat.name) : '') + '</span></span>' +
          '<span class="drill-amount ' + (tx.type === 'income' ? 'is-income' : '') + '">' + txSignedMoney(tx) + '</span></button>';
      }).join('') + '</div>' : '<p class="modal-note">这个分类下没有记录。</p>');

    openModal({
      title: top.name + ' · ' + ctx.periodLabel,
      body: body,
      onMount: function (root) {
        $$('[data-drill-id]', root).forEach(function (button) {
          button.onclick = function () {
            const id = button.dataset.drillId;
            closeModal();
            navigate('/record?id=' + encodeURIComponent(id));
          };
        });
      }
    });
  }

  /* ---------------- 我的 ---------------- */

  function renderSettings() {
    const view = $('#view');
    const last = Number(state.settings.lastBackupAt) || 0;
    const backupText = last ? lastBackupText(last) : '还没有备份过';
    view.innerHTML =
      '<section class="settings-hero">' + QJ.mascot('soft', 86) +
      '<div><h1>我的</h1><p>数据只在这台设备上，记得备份。</p></div></section>' +
      '<div class="settings-group">' +
      '<div class="settings-group-title">记账</div>' +
      '<a class="settings-row" href="#/settings/categories">' +
      '<span class="row-icon">' + QJ.icon('grid', 19) + '</span>' +
      '<span class="row-copy"><span class="row-title">分类管理</span><span class="row-desc">默认分类开箱可用，也能自己添二级分类</span></span>' +
      '<span class="chev">' + QJ.icon('chevron-right', 17) + '</span></a>' +
      '<a class="settings-row" href="#/settings/data">' +
      '<span class="row-icon is-green">' + QJ.icon('database', 19) + '</span>' +
      '<span class="row-copy"><span class="row-title">数据与备份</span><span class="row-desc">' + esc(backupText) + ' · 已记 ' + state.transactions.length + ' 笔</span></span>' +
      '<span class="chev">' + QJ.icon('chevron-right', 17) + '</span></a>' +
      '</div>' +
      '<div class="settings-group">' +
      '<div class="settings-group-title">关于</div>' +
      '<a class="settings-row" href="#/settings/about">' +
      '<span class="row-icon">' + QJ.icon('heart', 19) + '</span>' +
      '<span class="row-copy"><span class="row-title">关于轻记</span><span class="row-desc">v1.0 · 无需注册 · 无广告</span></span>' +
      '<span class="chev">' + QJ.icon('chevron-right', 17) + '</span></a>' +
      '</div>' +
      '<div class="settings-note">' + QJ.icon('shield', 16) +
      '<span><b>数据说明：</b>账目只保存在当前浏览器的 IndexedDB 中，不会上传。清除浏览器数据或换设备前，请先导出备份。</span></div>';
  }

  function lastBackupText(ts) {
    const days = Math.floor((Date.now() - ts) / 86400000);
    if (days <= 0) return '今天备份过';
    if (days === 1) return '昨天备份过';
    if (days < 30) return days + ' 天前备份过';
    return fullDateLabel(dateKeyOf(ts)).slice(0, 10) + '备份过';
  }

  async function renderData(route) {
    const view = $('#view');
    let estimate = null;
    let persisted = false;
    if (navigator.storage && navigator.storage.estimate) {
      try { estimate = await navigator.storage.estimate(); } catch (e) { estimate = null; }
    }
    if (navigator.storage && navigator.storage.persisted) {
      try { persisted = await navigator.storage.persisted(); } catch (e) { persisted = false; }
    }
    const usage = estimate && estimate.usage ? estimate.usage : 0;
    const quota = estimate && estimate.quota ? estimate.quota : 0;
    const usagePct = quota > 0 ? Math.min(100, Math.max(1, (usage / quota) * 100)) : 0;
    const last = Number(state.settings.lastBackupAt) || 0;
    const isOk = last && (Date.now() - last < 14 * 86400000);

    view.innerHTML =
      '<div class="page-head"><h1>数据与备份</h1><p>让记录留得住，也带得走。</p></div>' +
      '<div class="settings-note" style="margin-bottom:12px">' + QJ.icon('shield', 17) +
      '<span><b>只存本地：</b>账目保存在当前浏览器，不会上传到服务器。建议每周导出一次完整备份，换设备时用「导入备份」恢复。' +
      (isWeChat() ? '<br><b>微信内下载可能受限：</b>可以使用「复制备份内容」，或点击右上角在系统浏览器中打开。' : '') + '</span></div>' +
      '<div class="backup-status ' + (isOk ? 'is-ok' : '') + '"><span class="dot"></span><span>' + (last ? lastBackupText(last) : '还没有备份过') + '</span></div>' +
      '<div class="settings-group">' +
      '<div class="settings-group-title">备份与迁移</div>' +
      '<button class="settings-row" type="button" data-action="export-json">' +
      '<span class="row-icon">' + QJ.icon('download', 19) + '</span>' +
      '<span class="row-copy"><span class="row-title">导出完整备份</span><span class="row-desc">JSON 文件，包含所有账目、分类和设置</span></span>' +
      '<span class="chev">' + QJ.icon('chevron-right', 17) + '</span></button>' +
      '<button class="settings-row" type="button" data-action="export-csv">' +
      '<span class="row-icon is-green">' + QJ.icon('receipt', 19) + '</span>' +
      '<span class="row-copy"><span class="row-title">导出 CSV</span><span class="row-desc">适合用 Excel / Numbers 打开查看</span></span>' +
      '<span class="chev">' + QJ.icon('chevron-right', 17) + '</span></button>' +
      '<button class="settings-row" type="button" data-action="import-json">' +
      '<span class="row-icon is-amber">' + QJ.icon('upload', 19) + '</span>' +
      '<span class="row-copy"><span class="row-title">导入备份</span><span class="row-desc">从 JSON 备份恢复，会覆盖当前数据</span></span>' +
      '<span class="chev">' + QJ.icon('chevron-right', 17) + '</span></button>' +
      '<button class="settings-row" type="button" data-action="copy-backup">' +
      '<span class="row-icon">' + QJ.icon('copy', 19) + '</span>' +
      '<span class="row-copy"><span class="row-title">复制备份内容</span><span class="row-desc">下载受限时，把备份复制到剪贴板</span></span>' +
      '<span class="chev">' + QJ.icon('chevron-right', 17) + '</span></button>' +
      '<input type="file" id="import-file" accept=".json,application/json" hidden>' +
      '</div>' +

      '<div class="settings-group">' +
      '<div class="settings-group-title">备份提醒</div>' +
      '<label class="settings-row">' +
      '<span class="row-icon">' + QJ.icon('sparkle', 19) + '</span>' +
      '<span class="row-copy"><span class="row-title">两周没备份时提醒我</span><span class="row-desc">只在应用内提示，不会弹窗打扰</span></span>' +
      '<span class="switch"><input type="checkbox" id="reminder-toggle"' + (state.settings.backupReminderEnabled ? ' checked' : '') + '><span class="track"></span></span></label>' +
      '</div>' +

      '<div class="settings-group">' +
      '<div class="settings-group-title">存储状态</div>' +
      '<div class="settings-row" style="cursor:default">' +
      '<span class="row-icon">' + QJ.icon('database', 19) + '</span>' +
      '<span class="row-copy"><span class="row-title">' + (persisted ? '已申请持久存储' : '浏览器自动管理存储') + '</span>' +
      '<span class="row-desc">' + (estimate ? '已用 ' + formatBytes(usage) + (quota ? ' / 可用约 ' + formatBytes(quota) : '') : '当前浏览器未提供存储用量') + '</span>' +
      '<span class="storage-meter"><span style="width:' + (usagePct || 2) + '%"></span></span></span>' +
      '</div>' +
      (navigator.storage && navigator.storage.persist && !persisted ?
        '<button class="settings-row" type="button" data-action="persist">' +
        '<span class="row-icon is-green">' + QJ.icon('lock', 19) + '</span>' +
        '<span class="row-copy"><span class="row-title">申请持久存储</span><span class="row-desc">减少浏览器自动清理数据的概率</span></span>' +
        '<span class="chev">' + QJ.icon('chevron-right', 17) + '</span></button>' : '') +
      '</div>' +

      '<div class="danger-zone"><h3>清除全部数据</h3><p>会删除所有账目并恢复默认分类，无法撤销。清除前请先导出备份。</p>' +
      '<button class="btn btn-danger btn-sm" type="button" data-action="clear-all">清除数据</button></div>';

    bindData(route);
  }

  function bindData(route) {
    const view = $('#view');
    view.onclick = async function (event) {
      const el = event.target.closest('[data-action]');
      if (!el) return;
      const action = el.dataset.action;
      if (action === 'export-json') await exportJSON();
      else if (action === 'export-csv') await exportCSV();
      else if (action === 'import-json') $('#import-file').click();
      else if (action === 'copy-backup') await openCopyBackup();
      else if (action === 'persist') await requestPersist();
      else if (action === 'clear-all') openClearData();
    };
    const fileInput = $('#import-file');
    if (fileInput) fileInput.addEventListener('change', handleImportFile);
    const toggle = $('#reminder-toggle');
    if (toggle) toggle.addEventListener('change', async function () {
      await QJ.db.saveSettings({ backupReminderEnabled: toggle.checked });
      state.settings.backupReminderEnabled = toggle.checked;
      showToast(toggle.checked ? '已开启备份提醒' : '已关闭备份提醒', { icon: 'check' });
    });
  }

  async function markBackup() {
    const now = Date.now();
    await QJ.db.saveSettings({ lastBackupAt: now });
    state.settings.lastBackupAt = now;
  }

  function downloadText(text, filename, mime) {
    const blob = new Blob([text], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function dateStamp() {
    return todayKey();
  }

  async function exportJSON() {
    try {
      const backup = await QJ.db.makeBackup();
      const json = JSON.stringify(backup, null, 2);
      if (isWeChat()) {
        openCopyBackup(json);
        return;
      }
      downloadText(json, 'qingji-backup-' + dateStamp() + '.json', 'application/json');
      await markBackup();
      showToast('完整备份已导出', { icon: 'download' });
      await refresh();
      await renderData(state.route);
    } catch (error) {
      console.error(error);
      showToast('导出失败，请再试一次', { icon: 'info' });
    }
  }

  async function exportCSV() {
    try {
      const rows = [['日期', '类型', '一级分类', '二级分类', '金额', '备注']];
      state.transactions.slice().sort(function (a, b) { return a.occurredAt - b.occurredAt; }).forEach(function (tx) {
        const cat = catForTransaction(tx);
        const top = topCategory(cat);
        rows.push([
          dateKeyOf(tx.occurredAt),
          tx.type === 'income' ? '收入' : '支出',
          top ? top.name : '',
          cat && cat.parentId ? cat.name : '',
          (tx.amountCents / 100).toFixed(2),
          tx.note || ''
        ]);
      });
      const csv = '﻿' + rows.map(function (row) {
        return row.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(',');
      }).join('\r\n');
      downloadText(csv, 'qingji-' + dateStamp() + '.csv', 'text/csv;charset=utf-8');
      showToast('CSV 已导出', { icon: 'download' });
    } catch (error) {
      console.error(error);
      showToast('导出失败，请再试一次', { icon: 'info' });
    }
  }

  async function handleImportFile(event) {
    const input = event.target;
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      let payload;
      try { payload = JSON.parse(text); } catch (e) { throw new Error('文件不是有效的 JSON'); }
      const error = QJ.db.validateBackup(payload);
      if (error) throw new Error(error);
      openImportPreview(payload);
    } catch (error) {
      openAlert({ title: '无法导入', message: error.message || '备份文件无法读取。' });
    }
  }

  function openImportPreview(payload) {
    const txs = payload.data.transactions.filter(function (tx) { return !tx.deletedAt; });
    const times = txs.map(function (tx) { return tx.occurredAt; }).concat([Date.now()]);
    const from = fullDateLabel(dateKeyOf(Math.min.apply(null, times)));
    const to = fullDateLabel(dateKeyOf(Math.max.apply(null, times)));
    const body = '<p class="modal-note" style="margin-bottom:12px">恢复会<strong>覆盖当前的全部数据</strong>，请确认这份备份是你要的内容。恢复前会自动导出一份当前数据。</p>' +
      '<div class="import-preview"><dl>' +
      '<dt>备份时间</dt><dd>' + esc(fullDateLabel(dateKeyOf(payload.exportedAt || Date.now()))) + '</dd>' +
      '<dt>账目</dt><dd>' + txs.length + ' 笔</dd>' +
      '<dt>分类</dt><dd>' + payload.data.categories.length + ' 个</dd>' +
      '<dt>数据范围</dt><dd>' + esc(from) + '<br>— ' + esc(to) + '</dd>' +
      '</dl></div>';
    openModal({
      title: '恢复这份备份？',
      body: body,
      foot: '<button class="btn btn-outline" type="button" data-close>取消</button>' +
        '<button class="btn btn-primary" type="button" id="import-confirm">覆盖恢复</button>',
      onMount: function (root) {
        const button = $('#import-confirm', root);
        button.onclick = async function () {
          button.disabled = true;
          button.textContent = '正在恢复…';
          try {
            const current = await QJ.db.makeBackup();
            downloadText(JSON.stringify(current, null, 2), 'qingji-before-import-' + dateStamp() + '.json', 'application/json');
            await QJ.db.replaceAll(payload);
            await refresh();
            closeModal();
            navigate('/');
            showToast('备份已恢复 · ' + txs.length + ' 笔账目', { icon: 'check' });
          } catch (error) {
            console.error(error);
            button.disabled = false;
            button.textContent = '覆盖恢复';
            showToast('恢复失败，当前数据没有被修改', { icon: 'info' });
          }
        };
      }
    });
  }

  async function openCopyBackup(existingJson) {
    try {
      const backup = existingJson ? null : await QJ.db.makeBackup();
      const json = existingJson || JSON.stringify(backup, null, 2);
      openModal({
        title: '复制备份内容',
        body: '<p class="modal-note" style="margin-bottom:10px">把下面的内容复制到备忘录、聊天窗口或文件里保存。恢复时选择「导入备份」即可。</p>' +
          '<textarea class="textarea" id="backup-text" readonly style="min-height:180px;font-size:12px;line-height:1.45">' + esc(json) + '</textarea>',
        foot: '<button class="btn btn-outline" type="button" data-close>关闭</button>' +
          '<button class="btn btn-primary" type="button" id="copy-confirm">' + QJ.icon('copy', 16) + '复制内容</button>',
        onMount: function (root) {
          const button = $('#copy-confirm', root);
          button.onclick = async function () {
            const ok = await copyText(json);
            if (ok) {
              await markBackup();
              showToast('备份内容已复制', { icon: 'copy' });
              closeModal();
              if (state.route && state.route.path === '/settings/data') {
                await refresh();
                await renderData(state.route);
              }
            } else {
              showToast('复制失败，请手动选中文本复制', { icon: 'info' });
            }
          };
        }
      });
    } catch (error) {
      console.error(error);
      showToast('生成备份失败，请再试一次', { icon: 'info' });
    }
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* fall through */ }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      textarea.remove();
      return ok;
    } catch (e) { return false; }
  }

  async function requestPersist() {
    if (!navigator.storage || !navigator.storage.persist) {
      showToast('当前浏览器不支持申请持久存储', { icon: 'info' });
      return;
    }
    try {
      const granted = await navigator.storage.persist();
      showToast(granted ? '已获得持久存储' : '浏览器没有授予，请定期备份', { icon: granted ? 'check' : 'info' });
      await renderData(state.route);
    } catch (error) {
      showToast('申请失败，请稍后再试', { icon: 'info' });
    }
  }

  function openClearData() {
    openModal({
      title: '清除全部数据',
      body: '<p class="modal-note" style="margin-bottom:10px">所有账目会被删除，分类恢复为默认。这个动作无法撤销。<br>如果还需要这些记录，请先导出备份。</p>' +
        '<div class="field"><label for="clear-phrase">输入「删除」确认</label><input class="input" id="clear-phrase" autocomplete="off" placeholder="删除"></div>',
      foot: '<button class="btn btn-outline" type="button" data-close>取消</button>' +
        '<button class="btn btn-danger" type="button" id="clear-confirm" disabled>清除</button>',
      onMount: function (root) {
        const input = $('#clear-phrase', root);
        const button = $('#clear-confirm', root);
        input.addEventListener('input', function () {
          button.disabled = input.value.trim() !== '删除';
        });
        button.onclick = async function () {
          if (input.value.trim() !== '删除') return;
          button.disabled = true;
          try {
            await QJ.db.resetAll();
            await refresh();
            closeModal();
            navigate('/');
            showToast('已清除全部数据', { icon: 'trash' });
          } catch (error) {
            button.disabled = false;
            showToast('清除失败，请再试一次', { icon: 'info' });
          }
        };
      }
    });
  }

  /* ---------------- 分类管理 ---------------- */

  function renderCategories(route) {
    const type = route.params.get('type') === 'income' ? 'income' : 'expense';
    const tops = state.categories.filter(function (c) { return c.type === type && !c.parentId; })
      .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
    const view = $('#view');
    view.innerHTML =
      '<div class="page-head"><h1>分类管理</h1><p>' + (type === 'expense' ? '支出的分类，决定统计能看清什么。' : '收入也可以分得很清楚。') + '</p></div>' +
      '<div class="cat-manage-toolbar">' +
      '<div class="segmented" role="group" aria-label="分类类型">' +
      '<button type="button" class="' + (type === 'expense' ? 'is-active' : '') + '" data-action="cat-type" data-type="expense">支出</button>' +
      '<button type="button" class="' + (type === 'income' ? 'is-active' : '') + '" data-action="cat-type" data-type="income">收入</button>' +
      '</div>' +
      '<button class="btn btn-primary btn-sm" type="button" data-action="add-cat">' + QJ.icon('plus', 16) + '新增分类</button>' +
      '</div>' +
      (tops.length ? '<div class="cat-manage-list">' + tops.map(function (top) {
        const children = state.categories.filter(function (c) { return c.parentId === top.id; })
          .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
        return catManageRow(top, false, children.length) +
          children.map(function (child) { return catManageRow(child, true, 0); }).join('');
      }).join('') + '</div>' : '<div class="day-sheet"><div class="empty-state">' + QJ.mascot('soft', 96) +
        '<h3>还没有分类</h3><p>加一个常用的分类，记账会更快。</p><button class="btn btn-primary btn-sm" type="button" data-action="add-cat">新增分类</button></div></div>') +
      '<div class="settings-note" style="margin-top:14px">' + QJ.icon('info', 16) +
      '<span>隐藏的分类不会出现在记账页，但历史账目和统计仍然保留。默认分类不能删除，可以改名、换图标或隐藏。</span></div>';

    const viewRoot = $('#view');
    viewRoot.onclick = async function (event) {
      const el = event.target.closest('[data-action]');
      if (!el) return;
      const action = el.dataset.action;
      if (action === 'cat-type') {
        navigate('/settings/categories?type=' + el.dataset.type);
        return;
      }
      if (action === 'add-cat') {
        openCategoryForm({ type: type });
        return;
      }
      const id = el.dataset.id;
      const cat = catById(id);
      if (!cat) return;
      if (action === 'cat-edit') openCategoryForm({ type: type, cat: cat });
      else if (action === 'cat-delete') await deleteCategoryFlow(cat);
      else if (action === 'cat-move-up') await moveCategory(cat, -1);
      else if (action === 'cat-move-down') await moveCategory(cat, 1);
    };
  }

  function catManageRow(cat, isSub, childCount) {
    const siblings = state.categories.filter(function (c) {
      return c.type === cat.type && (c.parentId || null) === (cat.parentId || null);
    }).sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
    const index = siblings.findIndex(function (c) { return c.id === cat.id; });
    const canUp = index > 0;
    const canDown = index >= 0 && index < siblings.length - 1;
    const hidden = cat.hidden ? '<span class="pill">已隐藏</span>' : '';
    const system = cat.isSystem ? '<span class="pill">默认</span>' : '';
    return '<div class="cat-manage-item ' + (isSub ? 'is-sub ' : '') + (cat.hidden ? 'is-hidden' : '') + '" data-id="' + esc(cat.id) + '">' +
      catIcon(cat, 18) +
      '<div class="cat-manage-copy"><div class="cat-manage-name">' + esc(cat.name) + system + hidden + '</div>' +
      '<div class="cat-manage-sub">' + (isSub ? '二级分类' : (childCount ? childCount + ' 个二级分类' : '一级分类')) + '</div></div>' +
      '<div class="cat-manage-actions">' +
      '<button class="mini-btn" type="button" data-action="cat-move-up" data-id="' + esc(cat.id) + '" aria-label="上移" ' + (canUp ? '' : 'disabled') + '>' + QJ.icon('arrow-up', 15) + '</button>' +
      '<button class="mini-btn" type="button" data-action="cat-move-down" data-id="' + esc(cat.id) + '" aria-label="下移" ' + (canDown ? '' : 'disabled') + '>' + QJ.icon('arrow-down', 15) + '</button>' +
      '<button class="mini-btn" type="button" data-action="cat-edit" data-id="' + esc(cat.id) + '" aria-label="编辑分类">' + QJ.icon('edit', 15) + '</button>' +
      (!cat.isSystem ? '<button class="mini-btn is-danger" type="button" data-action="cat-delete" data-id="' + esc(cat.id) + '" aria-label="删除分类">' + QJ.icon('trash', 15) + '</button>' : '') +
      '</div></div>';
  }

  async function moveCategory(cat, direction) {
    const siblings = state.categories.filter(function (c) {
      return c.type === cat.type && (c.parentId || null) === (cat.parentId || null);
    }).sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
    const index = siblings.findIndex(function (c) { return c.id === cat.id; });
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) return;
    const other = siblings[targetIndex];
    const aSort = cat.sort || 0;
    const bSort = other.sort || 0;
    // 保证交换后的排序值稳定，即使两条记录的 sort 相同
    cat.sort = targetIndex === 0 ? bSort - 1 : bSort;
    other.sort = targetIndex === 0 ? bSort : (aSort === bSort ? aSort + 1 : aSort);
    if (cat.sort === other.sort) {
      siblings.forEach(function (c, i) { c.sort = i; });
      cat.sort = index;
      other.sort = targetIndex;
    }
    await QJ.db.putCategories([cat, other]);
    await refresh();
    renderCategories(state.route);
  }

  function openCategoryForm(options) {
    const type = options.type;
    const cat = options.cat || null;
    const isEdit = !!cat;
    const tops = state.categories.filter(function (c) { return c.type === type && !c.parentId && (!cat || c.id !== cat.id); })
      .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
    const hasChildren = cat ? state.categories.some(function (c) { return c.parentId === cat.id; }) : false;
    let selectedIcon = cat ? cat.icon : (type === 'income' ? 'wallet' : 'bowl');
    let selectedColor = cat ? safeColor(cat.color) : (type === 'income' ? CHART[0] : CHART[0]);
    const parentValue = cat && cat.parentId ? cat.parentId : '';

    const body = '<div class="field-stack">' +
      '<div class="preview-row"><span id="cat-preview-icon">' + catIcon({ icon: selectedIcon, color: selectedColor }, 20) + '</span><span class="name" id="cat-preview-name">' + esc(cat ? cat.name : '新分类') + '</span></div>' +
      '<div class="field"><label for="cat-name">名称</label><input class="input" id="cat-name" maxlength="12" autocomplete="off" placeholder="例如：咖啡" value="' + esc(cat ? cat.name : '') + '"></div>' +
      (isEdit && cat.parentId ? '' :
        (hasChildren && isEdit ? '' :
          '<div class="field"><label for="cat-parent">归属</label><select class="select" id="cat-parent">' +
          '<option value="">一级分类</option>' +
          tops.map(function (t) { return '<option value="' + esc(t.id) + '"' + (parentValue === t.id ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') +
          '</select><span class="hint">选一个一级分类，就会成为它的二级分类。</span></div>')) +
      '<div class="field"><label>图标</label><div class="icon-picker" id="icon-picker">' + CAT_ICONS.map(function (name) {
        return '<button class="icon-pick ' + (name === selectedIcon ? 'is-active' : '') + '" type="button" data-icon="' + name + '" aria-label="图标 ' + name + '">' + QJ.icon(name, 18) + '</button>';
      }).join('') + '</div></div>' +
      '<div class="field"><label>颜色</label><div class="color-picker" id="color-picker">' + COLOR_CHOICES.map(function (color) {
        return '<button class="color-pick ' + (color === selectedColor ? 'is-active' : '') + '" type="button" data-color="' + color + '" style="background:' + color + '" aria-label="颜色 ' + color + '"></button>';
      }).join('') + '</div></div>' +
      '<label class="settings-row" style="padding:8px 0;border-top:0"><span class="row-copy"><span class="row-title">在记账页隐藏</span><span class="row-desc">历史账目和统计不受影响</span></span>' +
      '<span class="switch"><input type="checkbox" id="cat-hidden"' + (cat && cat.hidden ? ' checked' : '') + '><span class="track"></span></span></label>' +
      '<p class="form-error" id="cat-error" hidden></p>' +
      '</div>';

    openModal({
      title: isEdit ? '编辑分类' : '新增分类',
      body: body,
      foot: '<button class="btn btn-outline" type="button" data-close>取消</button>' +
        '<button class="btn btn-primary" type="button" id="cat-save">' + (isEdit ? '保存' : '添加') + '</button>',
      onMount: function (root) {
        const nameInput = $('#cat-name', root);
        const errorEl = $('#cat-error', root);
        const previewName = $('#cat-preview-name', root);
        const previewIcon = $('#cat-preview-icon', root);
        const parentSelect = $('#cat-parent', root);

        function updatePreview() {
          previewName.textContent = nameInput.value.trim() || '新分类';
          previewIcon.innerHTML = catIcon({ icon: selectedIcon, color: selectedColor }, 20);
        }

        $$('[data-icon]', root).forEach(function (button) {
          button.onclick = function () {
            selectedIcon = button.dataset.icon;
            $$('[data-icon]', root).forEach(function (b) { b.classList.toggle('is-active', b === button); });
            updatePreview();
          };
        });
        $$('[data-color]', root).forEach(function (button) {
          button.onclick = function () {
            selectedColor = button.dataset.color;
            $$('[data-color]', root).forEach(function (b) { b.classList.toggle('is-active', b === button); });
            updatePreview();
          };
        });
        if (parentSelect) {
          parentSelect.addEventListener('change', function () {
            const parent = catById(parentSelect.value);
            if (parent) {
              selectedColor = safeColor(parent.color);
              $$('[data-color]', root).forEach(function (b) { b.classList.toggle('is-active', b.dataset.color === selectedColor); });
              updatePreview();
            }
          });
        }
        nameInput.addEventListener('input', updatePreview);

        const save = $('#cat-save', root);
        save.onclick = async function () {
          const name = nameInput.value.trim();
          if (!name) {
            errorEl.textContent = '给分类起个名字吧';
            errorEl.hidden = false;
            nameInput.focus();
            return;
          }
          if (name.length > 12) {
            errorEl.textContent = '名称最多 12 个字';
            errorEl.hidden = false;
            return;
          }
          const parentId = parentSelect ? (parentSelect.value || null) : (cat ? cat.parentId : null);
          if (!parentId && !isEdit) {
            const topCount = state.categories.filter(function (c) { return c.type === type && !c.parentId; }).length;
            if (topCount >= 30) {
              errorEl.textContent = '一级分类最多 30 个';
              errorEl.hidden = false;
              return;
            }
          }
          const duplicate = state.categories.some(function (c) {
            return c.type === type && (c.parentId || null) === (parentId || null) && c.name === name && (!cat || c.id !== cat.id);
          });
          if (duplicate) {
            errorEl.textContent = '同一层级已经有这个分类了';
            errorEl.hidden = false;
            return;
          }
          const siblings = state.categories.filter(function (c) {
            return c.type === type && (c.parentId || null) === (parentId || null) && (!cat || c.id !== cat.id);
          });
          const sort = cat ? cat.sort : siblings.reduce(function (m, c) { return Math.max(m, c.sort || 0); }, -1) + 1;
          const payload = {
            id: cat ? cat.id : 'cat-' + QJ.db.uid(),
            name: name,
            parentId: parentId || null,
            type: type,
            icon: selectedIcon,
            color: selectedColor,
            sort: sort,
            isSystem: cat ? !!cat.isSystem : false,
            hidden: $('#cat-hidden', root).checked
          };
          save.disabled = true;
          try {
            await QJ.db.putCategory(payload);
            await refresh();
            closeModal();
            renderCategories(state.route);
            showToast(isEdit ? '分类已更新' : '分类已添加', { icon: 'check' });
          } catch (error) {
            save.disabled = false;
            errorEl.textContent = '保存失败，请再试一次';
            errorEl.hidden = false;
          }
        };
        setTimeout(function () { nameInput.focus(); }, 80);
      }
    });
  }

  async function deleteCategoryFlow(cat) {
    if (cat.isSystem) return;
    const children = state.categories.filter(function (c) { return c.parentId === cat.id; });
    if (children.length) {
      openAlert({
        title: '还有二级分类',
        message: '请先删除「' + cat.name + '」下面的二级分类，或在编辑里把它们移到别的分类。'
      });
      return;
    }
    let count = 0;
    try { count = await QJ.db.countTransactionsForCategory(cat.id); } catch (e) { count = 0; }
    if (count > 0) {
      const targets = state.categories.filter(function (c) { return c.type === cat.type && c.id !== cat.id; })
        .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
      const body = '<p class="modal-note" style="margin-bottom:12px">「' + esc(cat.name) + '」下有 ' + count + ' 笔账目。删除前，把这些账目移到：</p>' +
        (targets.length ? '<div class="field"><label for="migrate-target">迁移到</label><select class="select" id="migrate-target">' +
          targets.map(function (t) {
            const parent = t.parentId ? catById(t.parentId) : null;
            return '<option value="' + esc(t.id) + '">' + esc((parent ? parent.name + ' / ' : '') + t.name) + '</option>';
          }).join('') + '</select></div>' : '<p class="form-error">没有可迁移的分类。</p>') +
        '<p class="hint" style="margin-top:8px">迁移后，历史账目的分类会一起改变。</p>';
      openModal({
        title: '先迁移账目',
        body: body,
        foot: '<button class="btn btn-outline" type="button" data-close>取消</button>' +
          '<button class="btn btn-danger" type="button" id="migrate-confirm"' + (targets.length ? '' : ' disabled') + '>迁移并删除</button>',
        onMount: function (root) {
          const button = $('#migrate-confirm', root);
          if (!button) return;
          button.onclick = async function () {
            const target = $('#migrate-target', root);
            if (!target) return;
            button.disabled = true;
            try {
              await QJ.db.migrateTransactions(cat.id, target.value);
              await QJ.db.deleteCategoryById(cat.id);
              await refresh();
              closeModal();
              renderCategories(state.route);
              showToast('分类已删除，账目已迁移', { icon: 'check' });
            } catch (error) {
              button.disabled = false;
              showToast('删除失败，请再试一次', { icon: 'info' });
            }
          };
        }
      });
      return;
    }

    openConfirm({
      title: '删除「' + cat.name + '」？',
      message: '这个分类下没有账目，删除后不能恢复。',
      confirmText: '删除',
      danger: true,
      onConfirm: async function () {
        await QJ.db.deleteCategoryById(cat.id);
        await refresh();
        renderCategories(state.route);
        showToast('分类已删除', { icon: 'trash' });
      }
    });
  }

  /* ---------------- 关于 ---------------- */

  function renderAbout() {
    const view = $('#view');
    view.innerHTML =
      '<div class="about-card">' +
      '<div class="about-brand">' + QJ.peachMark(46) +
      '<div><h1>轻记</h1><p>轻轻记下每一笔</p></div></div>' +
      '<p class="about-copy">一个不需要下载、不需要注册的个人记账工具。<strong>3 秒记一笔，月底看清钱花在了哪里。</strong></p>' +
      '<ul class="about-list">' +
      '<li>' + QJ.icon('shield', 16) + '<span><strong>数据只存本地。</strong>账目保存在当前浏览器的 IndexedDB 中，不会上传，也不需要账号。</span></li>' +
      '<li>' + QJ.icon('download', 16) + '<span><strong>随时带走。</strong>支持完整 JSON 备份、CSV 导出和导入恢复，换设备不吃亏。</span></li>' +
      '<li>' + QJ.icon('heart', 16) + '<span><strong>没有广告。</strong>不接第三方广告，不上传账目内容，不制造消费焦虑。</span></li>' +
      '<li>' + QJ.icon('lock', 16) + '<span><strong>请记得备份。</strong>清除浏览器数据、无痕模式或某些浏览器的自动清理都可能让本地数据消失。</span></li>' +
      '</ul>' +
      '<div class="version-line"><span>轻记 Web v1.0</span><span>本地存储版 · 无需注册</span></div>' +
      '</div>' +
      '<div class="settings-note" style="margin-top:14px">' + QJ.icon('info', 16) +
      '<span>这是一个按 PRD 实现的 Web 原型；当前版本不含账号、云同步与系统推送，所有数据都在你的浏览器里。</span></div>';
  }

  /* ---------------- 弹层、提示与通用交互 ---------------- */

  function openModal(options) {
    closeModal();
    lastModalFocus = document.activeElement;
    const root = $('#modal-root');
    root.innerHTML = '<div class="modal-backdrop ' + (options.sheet ? 'is-bottom' : '') + '" data-backdrop>' +
      '<section class="modal-card ' + (options.sheet ? 'is-sheet' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">' +
      '<div class="modal-head"><h2 id="modal-title">' + esc(options.title || '') + '</h2>' +
      '<button class="icon-btn" type="button" data-close aria-label="关闭">' + QJ.icon('close', 19) + '</button></div>' +
      '<div class="modal-body">' + (options.body || '') + '</div>' +
      (options.foot ? '<div class="modal-foot">' + options.foot + '</div>' : '') +
      '</section></div>';
    document.body.style.overflow = 'hidden';
    modalOpen = true;
    const backdrop = $('[data-backdrop]', root);
    backdrop.addEventListener('click', function (event) {
      if (event.target === backdrop) closeModal();
    });
    $$('[data-close]', root).forEach(function (button) {
      button.addEventListener('click', closeModal);
    });
    if (options.onMount) options.onMount(root);
    const card = $('.modal-card', root);
    setTimeout(function () {
      const focusable = card.querySelector('input, select, textarea, button:not([disabled])');
      if (focusable) focusable.focus();
      else card.focus();
    }, 60);
  }

  function closeModal() {
    if (!modalOpen) return;
    const root = $('#modal-root');
    root.innerHTML = '';
    document.body.style.overflow = '';
    modalOpen = false;
    if (lastModalFocus && typeof lastModalFocus.focus === 'function') {
      try { lastModalFocus.focus(); } catch (e) { /* ignore */ }
    }
    lastModalFocus = null;
  }

  function openConfirm(options) {
    openModal({
      title: options.title,
      body: '<p class="modal-note">' + esc(options.message || '') + '</p>',
      foot: '<button class="btn btn-outline" type="button" data-close>' + esc(options.cancelText || '取消') + '</button>' +
        '<button class="btn ' + (options.danger ? 'btn-danger' : 'btn-primary') + '" type="button" id="confirm-action">' + esc(options.confirmText || '确定') + '</button>',
      onMount: function (root) {
        const button = $('#confirm-action', root);
        button.onclick = async function () {
          button.disabled = true;
          try {
            await options.onConfirm();
            closeModal();
          } catch (error) {
            console.error(error);
            button.disabled = false;
            showToast('操作失败，请再试一次', { icon: 'info' });
          }
        };
      }
    });
  }

  function openAlert(options) {
    openModal({
      title: options.title || '提示',
      body: '<p class="modal-note">' + esc(options.message || '') + '</p>',
      foot: '<button class="btn btn-primary" type="button" data-close>知道了</button>'
    });
  }

  function openActionSheet(options) {
    const body = '<div class="modal-actions-list">' + options.actions.map(function (action, index) {
      return '<button class="modal-action ' + (action.danger ? 'is-danger' : '') + '" type="button" data-sheet-action="' + index + '">' +
        QJ.icon(action.icon || 'edit', 19) + '<span>' + esc(action.label) + '</span></button>';
    }).join('') + '</div>';
    openModal({
      title: options.title,
      body: (options.subtitle ? '<p class="modal-note" style="margin-bottom:4px">' + esc(options.subtitle) + '</p>' : '') + body,
      sheet: true,
      onMount: function (root) {
        $$('[data-sheet-action]', root).forEach(function (button) {
          button.onclick = function () {
            const action = options.actions[Number(button.dataset.sheetAction)];
            if (action && action.onClick) action.onClick();
          };
        });
      }
    });
  }

  function showToast(message, options) {
    options = options || {};
    const root = $('#toast-root');
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    root.innerHTML = '';
    const node = document.createElement('div');
    node.className = 'toast';
    node.innerHTML = '<span class="toast-ico">' + toastIcon(options.icon) + '</span>' +
      '<span class="toast-text">' + esc(message) + '</span>' +
      (options.undo ? '<button class="toast-undo" type="button">撤销</button>' : '');
    root.appendChild(node);
    if (options.undo) {
      $('.toast-undo', node).addEventListener('click', async function () {
        node.remove();
        if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
        try { await options.undo(); } catch (error) { showToast('撤销失败', { icon: 'info' }); }
      });
    }
    toastTimer = setTimeout(function () {
      node.classList.add('is-leaving');
      setTimeout(function () { node.remove(); }, 200);
      toastTimer = null;
    }, options.duration || 5000);
  }

  function bindGlobal() {
    window.addEventListener('beforeunload', function (event) {
      if (state.recordDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    });

    document.addEventListener('keydown', function (event) {
      if (!modalOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key === 'Tab') {
        const card = $('.modal-card');
        if (!card) return;
        const focusables = $$('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])', card)
          .filter(function (el) { return el.offsetParent !== null; });
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    document.addEventListener('click', function (event) {
      if (event.target.closest('[data-close-record]')) {
        event.preventDefault();
        requestCloseRecord();
      }
    });

    document.addEventListener('pointerover', function (event) {
      const target = event.target.closest('[data-tip]');
      if (!target) return;
      showTip(target.dataset.tip, event.clientX, event.clientY);
    });
    document.addEventListener('pointermove', function (event) {
      const target = event.target.closest('[data-tip]');
      if (!target) { hideTip(); return; }
      if (!state.tipVisible) showTip(target.dataset.tip, event.clientX, event.clientY);
      else positionTip(event.clientX, event.clientY);
    });
    document.addEventListener('pointerout', function (event) {
      const target = event.target.closest('[data-tip]');
      if (target && !target.contains(event.relatedTarget)) hideTip();
    });
    document.addEventListener('focusin', function (event) {
      const target = event.target.closest('[data-tip]');
      if (target) {
        const rect = target.getBoundingClientRect();
        showTip(target.dataset.tip, rect.left + rect.width / 2, rect.top);
      }
    });
    document.addEventListener('focusout', function (event) {
      if (event.target.closest('[data-tip]')) hideTip();
    });
    window.addEventListener('scroll', hideTip, { passive: true });
  }

  function bindChartTips() { /* data-tip 使用全局事件委托 */ }

  function showTip(text, x, y) {
    const tip = $('#chart-tip');
    if (!tip) return;
    tip.textContent = text;
    tip.hidden = false;
    state.tipVisible = true;
    positionTip(x, y);
  }
  function positionTip(x, y) {
    const tip = $('#chart-tip');
    if (!tip || tip.hidden) return;
    const width = tip.offsetWidth || 120;
    const left = Math.max(width / 2 + 8, Math.min(window.innerWidth - width / 2 - 8, x));
    tip.style.left = left + 'px';
    tip.style.top = Math.max(54, y - 10) + 'px';
  }
  function hideTip() {
    const tip = $('#chart-tip');
    if (tip) tip.hidden = true;
    state.tipVisible = false;
  }
})();
