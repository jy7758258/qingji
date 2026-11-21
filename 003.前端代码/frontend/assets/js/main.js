/* 轻记 · 交互原型
   行为说明：所有账号/备份/数据操作均为前端演示，不连接后端、不写入真实账本。
*/
(function () {
  'use strict';

  const $ = function (selector, root) { return (root || document).querySelector(selector); };
  const $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };
  const money = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const FLASH_KEY = 'qingji_demo_flash';

  function fmt(cents) { return '¥' + money.format(Math.abs(cents) / 100); }
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function icon(name, cls) {
    return '<svg class="icon ' + (cls || '') + '" aria-hidden="true" focusable="false"><use href="assets/icons.svg#icon-' + name + '"></use></svg>';
  }
  function setFlash(message, tone) {
    try { sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message: message, tone: tone || 'check' })); } catch (e) { /* ignore */ }
  }
  function readFlash() {
    try {
      const raw = sessionStorage.getItem(FLASH_KEY);
      if (!raw) return null;
      sessionStorage.removeItem(FLASH_KEY);
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  function showToast(message, tone) {
    const root = $('#toast-root') || createToastRoot();
    root.innerHTML = '';
    const node = document.createElement('div');
    node.className = 'toast';
    node.setAttribute('role', 'status');
    node.innerHTML = '<span class="toast__icon">' + icon(tone === 'info' ? 'info' : 'check') + '</span>' +
      '<span class="toast__text"></span>';
    $('.toast__text', node).textContent = message;
    root.appendChild(node);
    window.setTimeout(function () {
      node.classList.add('is-leaving');
      window.setTimeout(function () { node.remove(); }, 200);
    }, 3300);
  }
  function createToastRoot() {
    const root = document.createElement('div');
    root.id = 'toast-root';
    root.className = 'toast-root';
    root.setAttribute('aria-live', 'polite');
    document.body.appendChild(root);
    return root;
  }
  function ensureRoots() {
    if (!$('#toast-root')) createToastRoot();
    if (!$('#modal-root')) {
      const root = document.createElement('div');
      root.id = 'modal-root';
      document.body.appendChild(root);
    }
  }

  /* ---------------- 本地账本 ---------------- */

  const TX_KEY_PREFIX = 'qingji_demo_transactions_v1_';
  const EXPENSE_CATEGORIES = [
    { name: '午餐', icon: 'bowl', tone: 'amber' },
    { name: '交通', icon: 'train', tone: 'blue' },
    { name: '咖啡', icon: 'coffee', tone: 'rose' },
    { name: '日用', icon: 'cart', tone: 'green' },
    { name: '宠物', icon: 'paw', tone: 'amber' },
    { name: '晚餐', icon: 'bowl', tone: 'amber' },
    { name: '购物', icon: 'cart', tone: 'rose' },
    { name: '居住', icon: 'home', tone: 'green' },
    { name: '医疗', icon: 'medical', tone: 'blue' },
    { name: '教育', icon: 'book', tone: 'violet' },
    { name: '人情', icon: 'gift', tone: 'rose' },
    { name: '通讯', icon: 'phone', tone: 'blue' },
    { name: '旅行', icon: 'plane', tone: 'green' },
    { name: '娱乐', icon: 'play', tone: 'violet' },
    { name: '其他', icon: 'box', tone: 'gray' }
  ];
  const INCOME_CATEGORIES = [
    { name: '工资', icon: 'wallet', tone: 'green' },
    { name: '奖金', icon: 'trophy', tone: 'amber' },
    { name: '兼职', icon: 'briefcase', tone: 'violet' },
    { name: '理财', icon: 'chart', tone: 'green' },
    { name: '报销', icon: 'receipt', tone: 'blue' },
    { name: '红包', icon: 'gift', tone: 'rose' },
    { name: '其他', icon: 'box', tone: 'gray' }
  ];
  const CATEGORY_META = {};
  EXPENSE_CATEGORIES.concat(INCOME_CATEGORIES).forEach(function (item) { CATEGORY_META[item.name] = item; });
  ['早餐', '外卖', '餐饮', '零食'].forEach(function (name) {
    CATEGORY_META[name] = { name: name, icon: 'bowl', tone: 'amber' };
  });
  CATEGORY_META['饮品'] = { name: '饮品', icon: 'coffee', tone: 'rose' };
  CATEGORY_META['打车'] = { name: '打车', icon: 'train', tone: 'blue' };

  function authUser() { return window.QJAuth ? window.QJAuth.currentUser() : null; }
  function transactionStorageKey() {
    const user = authUser();
    return TX_KEY_PREFIX + (user ? window.QJAuth.usernameKey(user.username) : 'guest');
  }
  function readTransactions() {
    try {
      const raw = localStorage.getItem(transactionStorageKey());
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.filter(function (tx) {
        return tx && tx.id && tx.date && typeof tx.amountCents === 'number';
      }) : [];
    } catch (e) { return []; }
  }
  function writeTransactions(list) {
    localStorage.setItem(transactionStorageKey(), JSON.stringify(list));
  }
  function addTransaction(transaction) {
    const list = readTransactions();
    list.push(transaction);
    list.sort(function (a, b) {
      return b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0);
    });
    writeTransactions(list);
  }
  function clearTransactions() {
    localStorage.removeItem(transactionStorageKey());
  }
  function todayKey() {
    const date = new Date();
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  function monthKeyFromDate(dateString) { return String(dateString || '').slice(0, 7); }
  function currentMonthKey() { return todayKey().slice(0, 7); }
  function previousMonthKey(key) {
    const parts = key.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 2, 1);
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
  }
  function monthLabel(key) {
    const parts = key.split('-');
    return parts[0] + '年' + Number(parts[1]) + '月';
  }
  function parseDateKey(key) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return null;
    const parts = key.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  function dateDisplay(key) {
    if (key === todayKey()) return '今天';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (key === dateKeyOf(yesterday)) return '昨天';
    const date = parseDateKey(key);
    return date ? (date.getMonth() + 1) + '月' + date.getDate() + '日' : key;
  }
  function weekdayDisplay(key) {
    const date = parseDateKey(key);
    return date ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()] : '';
  }
  function dateKeyOf(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  function timeDisplay(timestamp) {
    const date = new Date(timestamp || Date.now());
    return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
  }
  function totalCents(list) { return list.reduce(function (sum, tx) { return sum + tx.amountCents; }, 0); }
  function categoryMeta(name) {
    return CATEGORY_META[name] || { name: name || '其他', icon: 'box', tone: 'gray' };
  }
  function categoryIconMarkup(name, className) {
    const meta = categoryMeta(name);
    return '<span class="category-icon category-icon--' + meta.tone + ' ' + (className || '') + '">' + icon(meta.icon) + '</span>';
  }
  function transactionAmount(tx) {
    return (tx.type === 'income' ? '+' : '−') + fmt(tx.amountCents);
  }
  function groupTransactions(list) {
    const map = new Map();
    list.forEach(function (tx) {
      if (!map.has(tx.date)) map.set(tx.date, []);
      map.get(tx.date).push(tx);
    });
    return Array.from(map.entries()).sort(function (a, b) { return b[0].localeCompare(a[0]); }).map(function (entry) {
      return { date: entry[0], items: entry[1].slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }) };
    });
  }
  function currentMonthTransactions(type) {
    return readTransactions().filter(function (tx) {
      return monthKeyFromDate(tx.date) === currentMonthKey() && (!type || tx.type === type);
    });
  }
  function previousMonthExpense() {
    const key = previousMonthKey(currentMonthKey());
    return totalCents(readTransactions().filter(function (tx) {
      return monthKeyFromDate(tx.date) === key && tx.type === 'expense';
    }));
  }
  function pageTodayLabel() {
    const date = new Date();
    return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日 ' + ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  }

  /* ---------------- 弹层 ---------------- */

  let activeModal = null;
  let lastFocus = null;

  function openModal(options) {
    closeModal();
    const root = $('#modal-root') || document.body.appendChild(document.createElement('div'));
    if (!root.id) root.id = 'modal-root';
    lastFocus = document.activeElement;
    root.innerHTML = '<div class="modal-backdrop ' + (options.sheet ? 'is-sheet' : '') + '" data-modal-backdrop>' +
      '<section class="modal ' + (options.sheet ? 'is-sheet' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      '<div class="modal__head"><h2 id="modal-title">' + esc(options.title || '') + '</h2>' +
      '<button class="icon-button" type="button" data-modal-close aria-label="关闭">' + icon('close') + '</button></div>' +
      '<div class="modal__body">' + (options.body || '') + '</div>' +
      (options.footer ? '<div class="modal__foot">' + options.footer + '</div>' : '') +
      '</section></div>';
    document.body.style.overflow = 'hidden';
    activeModal = root.firstElementChild;
    const backdrop = $('[data-modal-backdrop]', root);
    backdrop.addEventListener('click', function (event) {
      if (event.target === backdrop) closeModal();
    });
    $$('[data-modal-close]', root).forEach(function (button) {
      button.addEventListener('click', closeModal);
    });
    activeModal.__onKey = function (event) {
      if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
      if (event.key !== 'Tab') return;
      const focusables = $$('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])', activeModal)
        .filter(function (el) { return el.offsetParent !== null; });
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', activeModal.__onKey);
    if (options.onMount) options.onMount(root);
    window.setTimeout(function () {
      const target = activeModal.querySelector('input, select, textarea, button:not([disabled])');
      (target || activeModal).focus();
    }, 50);
    return { close: closeModal };
  }

  function closeModal() {
    if (!activeModal) return;
    document.removeEventListener('keydown', activeModal.__onKey);
    const root = $('#modal-root');
    if (root) root.innerHTML = '';
    document.body.style.overflow = '';
    activeModal = null;
    if (lastFocus && lastFocus.focus) {
      try { lastFocus.focus(); } catch (e) { /* ignore */ }
    }
    lastFocus = null;
  }

  function confirmDialog(options) {
    openModal({
      title: options.title || '确认操作',
      body: '<p class="modal__note">' + esc(options.message || '') + '</p>',
      footer: '<button class="btn btn--outline" type="button" data-modal-close>取消</button>' +
        '<button class="btn ' + (options.danger ? 'btn--danger' : 'btn--primary') + '" type="button" data-confirm-action>' + esc(options.confirmLabel || '确定') + '</button>',
      onMount: function (root) {
        const button = $('[data-confirm-action]', root);
        button.addEventListener('click', async function () {
          button.disabled = true;
          try { await options.onConfirm(); closeModal(); }
          catch (error) { button.disabled = false; showToast('操作失败，请重试', 'info'); }
        });
      }
    });
  }

  /* ---------------- 搜索 ---------------- */

  function openSearch() {
    const entries = readTransactions().map(function (tx) {
      const meta = categoryMeta(tx.category);
      return {
        title: tx.note || tx.category,
        meta: tx.category + ' · ' + dateDisplay(tx.date) + ' ' + timeDisplay(tx.createdAt),
        amount: transactionAmount(tx),
        icon: meta.icon,
        tone: meta.tone
      };
    });
    const body = '<div class="search-field">' + icon('search') +
      '<input id="global-search" type="search" placeholder="搜索备注、分类或金额" autocomplete="off" aria-label="搜索账目"></div>' +
      '<p class="section-title" style="margin-top:2px">账目<span class="section-sub" id="search-count">' + entries.length + ' 条</span></p>' +
      '<div class="search-results" id="search-results"></div>';
    openModal({
      title: '搜索账目',
      body: body,
      onMount: function (root) {
        const input = $('#global-search', root);
        const results = $('#search-results', root);
        const count = $('#search-count', root);
        const render = function (query) {
          const q = String(query || '').trim().toLowerCase();
          const list = entries.filter(function (item) {
            return !q || (item.title + item.meta + item.amount).toLowerCase().includes(q);
          });
          count.textContent = list.length + ' 条';
          results.innerHTML = list.length ? list.map(function (item) {
            return '<div class="search-result">' +
              '<span class="category-icon category-icon--' + item.tone + ' category-icon--sm">' + icon(item.icon) + '</span>' +
              '<span class="result-copy"><span class="result-title">' + esc(item.title) + '</span><span class="result-meta">' + esc(item.meta) + '</span></span>' +
              '<span class="result-amount">' + esc(item.amount) + '</span></div>';
          }).join('') : '<div class="search-empty">还没有匹配的账目。<a class="text-link" href="record.html">先去记一笔</a></div>';
        };
        input.addEventListener('input', function () { render(input.value); });
        render('');
        input.focus();
      }
    });
  }

  /* ---------------- 通用表单 / 密码显示 ---------------- */

  function initPasswordToggles() {
    $$('[data-password-toggle]').forEach(function (button) {
      button.addEventListener('click', function () {
        const target = button.dataset.target ? $(button.dataset.target) : button.closest('.input-shell').querySelector('input');
        if (!target) return;
        const showing = target.type === 'text';
        target.type = showing ? 'password' : 'text';
        button.innerHTML = icon(showing ? 'eye-off' : 'eye');
        button.setAttribute('aria-label', showing ? '显示密码' : '隐藏密码');
      });
    });
  }

  function initForms() {
    const confirmFields = $$('[data-confirm-of]');
    confirmFields.forEach(function (input) {
      const target = $(input.dataset.confirmOf);
      const sync = function () {
        if (target && input.value && target.value !== input.value) {
          input.setCustomValidity('两次输入的密码不一致');
        } else {
          input.setCustomValidity('');
        }
      };
      input.addEventListener('input', sync);
      if (target) target.addEventListener('input', sync);
    });

    $$('form[data-demo-form]').forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        const submit = form.querySelector('button[type="submit"]');
        if (submit && submit.disabled) return;
        if (!form.reportValidity()) return;
        if (submit) { submit.disabled = true; submit.textContent = '请稍候…'; }
        setFlash(form.dataset.flash || '操作成功（原型演示）', 'check');
        window.setTimeout(function () {
          window.location.href = form.dataset.next || 'index.html';
        }, 320);
      });
    });

    const consent = $('#privacy-consent');
    const registerSubmit = $('[data-register-submit]');
    if (consent && registerSubmit) {
      const sync = function () { registerSubmit.disabled = !consent.checked; };
      consent.addEventListener('change', sync);
      sync();
    }
  }

  function initCommonActions() {
    document.addEventListener('click', function (event) {
      const toastEl = event.target.closest('[data-toast]');
      if (toastEl) {
        event.preventDefault();
        showToast(toastEl.dataset.toast);
        return;
      }
      const el = event.target.closest('[data-action]');
      if (!el) return;
      const action = el.dataset.action;
      if (action === 'open-search') { event.preventDefault(); openSearch(); return; }
      if (action === 'logout') {
        confirmDialog({
          title: '退出登录？',
          message: '退出后本机账本仍会保留，重新登录即可继续使用。当前是原型演示，不会发送真实退出请求。',
          confirmLabel: '退出登录',
          onConfirm: function () {
            if (window.QJAuth) window.QJAuth.logout();
            setFlash('已退出登录，本机账本仍保留。', 'info');
            window.location.href = 'login.html';
          }
        });
        return;
      }
      if (action === 'clear-data') {
        confirmDialog({
          title: '清除本地数据？',
          message: '这会删除所有示例账目并恢复默认分类，操作不可撤销。请先确认已经导出备份。',
          confirmLabel: '清除数据',
          danger: true,
          onConfirm: function () {
            clearTransactions();
            showToast('本地账本已清除（原型演示）', 'info');
          }
        });
        return;
      }
      if (action === 'delete-account') {
        confirmDialog({
          title: '注销账号？',
          message: '注销后账号无法恢复。本机账本可选择保留或一并删除。当前原型不会执行真实删除。',
          confirmLabel: '注销账号',
          danger: true,
          onConfirm: function () {
            clearTransactions();
            if (window.QJAuth) window.QJAuth.deleteAccount();
            setFlash('账号已注销（原型演示）', 'info');
            window.location.href = 'login.html';
          }
        });
        return;
      }
      if (action === 'change-password') { openChangePassword(); return; }
      if (action === 'recovery-code') { openRecoveryCode(); return; }
      if (action === 'export-json') { showToast('完整备份已导出（原型演示）', 'check'); return; }
      if (action === 'export-csv') { showToast('CSV 已导出（原型演示）', 'check'); return; }
      if (action === 'copy-backup') { openCopyBackup(); return; }
      if (action === 'import-backup') {
        const input = $('#import-file');
        if (input) input.click();
        return;
      }
      if (action === 'persist-storage') { showToast('已申请持久存储（原型演示）', 'check'); return; }
    });

    const importInput = $('#import-file');
    if (importInput) {
      importInput.addEventListener('change', function () {
        if (importInput.files && importInput.files[0]) {
          showToast('已读取备份文件：' + importInput.files[0].name + '（原型演示）', 'check');
        }
        importInput.value = '';
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (activeModal) return;
      event.preventDefault();
      openSearch();
    });
  }

  /* ---------------- 统计 ---------------- */

  const CATEGORY_COLORS = {
    '餐饮': '#E87BA4', '午餐': '#E87BA4', '早餐': '#E87BA4', '晚餐': '#E87BA4',
    '交通': '#2A78D6', '购物': '#EB6834', '日用': '#EB6834', '居住': '#1BAF7A',
    '娱乐': '#EDA100', '医疗': '#6250D6', '教育': '#008300', '人情': '#E34948',
    '通讯': '#6250D6', '宠物': '#EB6834', '旅行': '#2A78D6', '咖啡': '#E34948',
    '工资': '#1BAF7A', '奖金': '#EDA100', '兼职': '#6250D6', '理财': '#2A78D6',
    '报销': '#E87BA4', '红包': '#E34948', '其他': '#C9BBC1'
  };
  const CHART_FALLBACK = ['#E87BA4', '#2A78D6', '#EB6834', '#1BAF7A', '#EDA100', '#6250D6', '#008300', '#E34948'];

  function colorFor(name, index) {
    return name === '其他' ? '#C9BBC1' : (CATEGORY_COLORS[name] || CHART_FALLBACK[index % CHART_FALLBACK.length]);
  }

  function buildStatsData(type, view) {
    const now = new Date();
    const month = currentMonthKey();
    const year = String(now.getFullYear());
    const allOfType = readTransactions().filter(function (tx) { return tx.type === type; });
    const periodTxs = view === 'year'
      ? allOfType.filter(function (tx) { return String(tx.date).slice(0, 4) === year; })
      : allOfType.filter(function (tx) { return monthKeyFromDate(tx.date) === month; });
    const total = totalCents(periodTxs);
    const count = periodTxs.length;
    const max = periodTxs.reduce(function (m, tx) { return Math.max(m, tx.amountCents); }, 0);
    const recordDays = new Set(periodTxs.map(function (tx) { return tx.date; })).size;
    const elapsed = view === 'year'
      ? Math.max(1, Math.round((now - new Date(now.getFullYear(), 0, 1)) / 86400000) + 1)
      : now.getDate();
    const avg = count ? Math.round(total / Math.max(1, elapsed)) : 0;

    const map = {};
    periodTxs.forEach(function (tx) {
      const name = tx.category || '其他';
      if (!map[name]) map[name] = { name: name, value: 0 };
      map[name].value += tx.amountCents;
    });
    const allCategories = Object.keys(map).map(function (name) { return map[name]; })
      .sort(function (a, b) { return b.value - a.value; })
      .map(function (item, index) { item.color = colorFor(item.name, index); return item; });
    const top = allCategories.filter(function (item) { return item.name !== '其他'; }).slice(0, 5);
    const rest = allCategories.filter(function (item) { return top.indexOf(item) === -1; })
      .reduce(function (sum, item) { return sum + item.value; }, 0);
    const chartCategories = top.slice();
    if (rest > 0) chartCategories.push({ name: '其他', value: rest, color: '#C9BBC1' });

    const months = view === 'year'
      ? Array.from({ length: 12 }, function (_, index) {
        const key = year + '-' + String(index + 1).padStart(2, '0');
        return { key: key, label: (index + 1) + '月', current: key === month };
      })
      : Array.from({ length: 6 }, function (_, index) {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
        const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
        return { key: key, label: (date.getMonth() + 1) + '月', current: key === month };
      });
    const trend = months.map(function (item) {
      return {
        label: item.label,
        current: item.current,
        value: totalCents(allOfType.filter(function (tx) { return monthKeyFromDate(tx.date) === item.key; }))
      };
    });

    const prevKey = view === 'year' ? String(Number(year) - 1) : previousMonthKey(month);
    const prevTxs = view === 'year'
      ? allOfType.filter(function (tx) { return String(tx.date).slice(0, 4) === prevKey; })
      : allOfType.filter(function (tx) { return monthKeyFromDate(tx.date) === prevKey; });
    const previous = totalCents(prevTxs);
    let delta = '暂无对比';
    let direction = 'flat';
    if (previous > 0) {
      const pct = Math.round(((total - previous) / previous) * 100);
      if (pct !== 0) {
        delta = (pct > 0 ? '+' : '') + pct + '%';
        direction = pct > 0 ? 'up' : 'down';
      } else {
        delta = '持平';
      }
    } else if (total > 0) {
      delta = view === 'year' ? '本年新增' : '本月新增';
      direction = 'up';
    }

    return {
      label: view === 'year' ? year + '年' : monthLabel(month),
      typeLabel: type === 'income' ? '收入' : '支出',
      total: total,
      count: count,
      max: max,
      avg: avg,
      recordDays: recordDays,
      categories: allCategories,
      chartCategories: chartCategories,
      trend: trend,
      delta: delta,
      direction: direction,
      compareLabel: view === 'year' ? '较上年' : '较上月'
    };
  }

  function initStats() {
    const state = { view: 'month', type: 'expense' };
    const render = function () {
      const data = buildStatsData(state.type, state.view);
      const typeLabel = data.typeLabel;
      const viewLabel = state.view === 'month' ? '月度' : '年度';
      const periodLabel = $('[data-period-label]');
      if (periodLabel) periodLabel.textContent = data.label;
      const pagePeriod = $('[data-page-period]');
      if (pagePeriod) pagePeriod.textContent = '本地账本 · ' + data.label;
      const totalEl = $('[data-stat-total]');
      if (totalEl) totalEl.textContent = fmt(data.total);
      const deltaEl = $('[data-stat-delta]');
      if (deltaEl) {
        let iconName = 'info';
        if (data.total > 0 && data.direction === 'down') iconName = 'trending-down';
        else if (data.total > 0 && data.direction === 'up') iconName = 'trending-up';
        const isNew = data.delta === '本月新增' || data.delta === '本年新增';
        const note = data.total > 0 && !isNew ? data.compareLabel + ' ' : '';
        deltaEl.innerHTML = icon(iconName, 'icon--sm') + '<span>' + (data.total > 0 ? note + '<strong>' + esc(data.delta) + '</strong>' : '还没有记录') + '</span>';
      }
      const avgEl = $('[data-stat-avg]');
      if (avgEl) avgEl.textContent = fmt(data.avg);
      const countEl = $('[data-stat-count]');
      if (countEl) countEl.textContent = data.count + ' 笔';
      const maxEl = $('[data-stat-max]');
      if (maxEl) maxEl.textContent = data.max ? fmt(data.max) : '—';
      const daysEl = $('[data-stat-days]');
      if (daysEl) daysEl.textContent = data.recordDays + ' 天';
      const summaryLabel = $('[data-stat-summary-label]');
      if (summaryLabel) summaryLabel.textContent = data.label + '累计' + typeLabel + '（元）';
      const chartTitle = $('[data-stats-title]');
      if (chartTitle) chartTitle.textContent = typeLabel + '分类排行';
      const chartCount = $('[data-stats-count]');
      if (chartCount) chartCount.textContent = '共 ' + data.categories.length + ' 个类别';
      const centerLabel = $('[data-donut-label]');
      if (centerLabel) centerLabel.textContent = typeLabel + '合计';
      const centerValue = $('[data-donut-value]');
      if (centerValue) centerValue.textContent = fmt(data.total);
      const donut = $('#stats-donut');
      if (donut) donut.innerHTML = donutSvg(data.chartCategories, data.total, typeLabel);
      const rank = $('#stats-rank');
      if (rank) rank.innerHTML = rankHtml(data.chartCategories, data.total, typeLabel);
      const table = $('#stats-table');
      if (table) table.innerHTML = tableHtml(data.categories, data.total, typeLabel);
      const trendTitle = $('[data-trend-title]');
      if (trendTitle) trendTitle.textContent = '近' + data.trend.length + '个月' + typeLabel + '趋势';
      const trend = $('#stats-trend');
      if (trend) trend.innerHTML = trendHtml(data.trend);
      $$('[data-stats-view]').forEach(function (button) {
        const on = button.dataset.statsView === state.view;
        button.classList.toggle('is-active', on);
        button.setAttribute('aria-pressed', String(on));
      });
      $$('[data-stats-type]').forEach(function (button) {
        const on = button.dataset.statsType === state.type;
        button.classList.toggle('is-active', on);
        button.setAttribute('aria-pressed', String(on));
      });
      const viewNote = $('[data-stats-view-note]');
      if (viewNote) viewNote.textContent = viewLabel + '视图 · 本地账本';
    };
    $$('[data-stats-view]').forEach(function (button) {
      button.addEventListener('click', function () { state.view = button.dataset.statsView; render(); });
    });
    $$('[data-stats-type]').forEach(function (button) {
      button.addEventListener('click', function () { state.type = button.dataset.statsType; render(); });
    });
    render();
  }

  function donutSvg(categories, total, typeLabel) {
    const size = 220;
    const center = 110;
    const radius = 82;
    const stroke = 26;
    const circumference = 2 * Math.PI * radius;
    let cumulative = 0;
    const gap = categories.length > 1 ? 3 : 0;
    const segments = categories.map(function (category) {
      const fraction = category.value / total;
      const length = Math.max(0, circumference * fraction - gap);
      const offset = -circumference * cumulative;
      cumulative += fraction;
      return '<circle cx="' + center + '" cy="' + center + '" r="' + radius + '" fill="none" stroke="' + category.color +
        '" stroke-width="' + stroke + '" stroke-dasharray="' + length + ' ' + (circumference - length) +
        '" stroke-dashoffset="' + offset + '" transform="rotate(-90 ' + center + ' ' + center + ')">' +
        '<title>' + esc(category.name + ' ' + Math.round(fraction * 100) + '%') + '</title></circle>';
    }).join('');
    return '<svg class="donut-svg" viewBox="0 0 220 220" role="img" aria-label="' + esc(typeLabel + '分类占比') + '">' +
      '<circle cx="110" cy="110" r="' + radius + '" fill="none" stroke="#fff0f5" stroke-width="' + stroke + '"/>' + segments + '</svg>';
  }

  function rankHtml(categories, total, typeLabel) {
    if (!categories.length) {
      return '<div class="chart-empty">还没有' + esc(typeLabel || '支出') + '记录。<br><a class="text-link" href="record.html">去记一笔</a></div>';
    }
    return categories.map(function (category) {
      const pct = Math.round(category.value / total * 100);
      return '<a class="rank-row" href="index.html" aria-label="查看' + esc(category.name) + '明细">' +
        '<span class="rank-dot" style="background:' + category.color + '"></span>' +
        '<span class="rank-main"><span class="rank-top"><span class="rank-name">' + esc(category.name) + '</span>' +
        '<span class="rank-amount">' + fmt(category.value) + '</span></span>' +
        '<span class="rank-bar"><span style="width:' + Math.max(2, pct) + '%;background:' + category.color + '"></span></span></span>' +
        '<span class="rank-pct">' + pct + '%</span></a>';
    }).join('');
  }

  function tableHtml(categories, total, typeLabel) {
    if (!categories.length) {
      return '<tr><td colspan="3" class="muted">还没有' + esc(typeLabel || '支出') + '记录</td></tr>';
    }
    return categories.map(function (category) {
      return '<tr><td>' + esc(category.name) + '</td><td class="num">' + fmt(category.value) + '</td><td class="num">' +
        Math.round(category.value / total * 100) + '%</td></tr>';
    }).join('') + '<tr><td><strong>合计</strong></td><td class="num"><strong>' + fmt(total) + '</strong></td><td class="num">100%</td></tr>';
  }

  function trendHtml(trend) {
    const max = Math.max.apply(null, trend.map(function (item) { return item.value; }).concat([1]));
    return trend.map(function (item) {
      const height = item.value === 0 ? 0 : Math.max(4, Math.round(item.value / max * 100));
      return '<div class="trend-col' + (item.current ? ' is-selected' : '') + '" title="' + esc(item.label + ' ' + fmt(item.value)) + '">' +
        '<span class="trend-value">' + (item.current ? fmt(item.value) : '') + '</span>' +
        '<span class="trend-track"><span class="trend-fill" style="height:' + height + '%"></span></span>' +
        '<span class="trend-label">' + esc(item.label) + '</span></div>';
    }).join('');
  }

  /* ---------------- 明细 / 记账 ---------------- */

  function initHome() {
    const todayLabel = $('[data-today-label]');
    if (todayLabel) todayLabel.textContent = pageTodayLabel();

    const month = currentMonthKey();
    const all = readTransactions().filter(function (tx) { return monthKeyFromDate(tx.date) === month; });
    const expenses = all.filter(function (tx) { return tx.type === 'expense'; });
    const incomes = all.filter(function (tx) { return tx.type === 'income'; });
    const expense = totalCents(expenses);
    const income = totalCents(incomes);
    const balance = income - expense;
    const count = all.length;
    const days = Math.max(1, new Date().getDate());
    const avg = count ? Math.round(expense / days) : 0;

    const expenseEl = $('#home-expense');
    if (expenseEl) expenseEl.textContent = money.format(expense / 100);
    const incomeEl = $('#home-income');
    if (incomeEl) incomeEl.textContent = fmt(income);
    const balanceEl = $('#home-balance');
    if (balanceEl) balanceEl.textContent = (balance < 0 ? '−' : '') + fmt(Math.abs(balance));
    const countEl = $('#home-count');
    if (countEl) countEl.textContent = count + ' 笔';
    const avgEl = $('#home-avg');
    if (avgEl) avgEl.textContent = fmt(avg);

    const deltaEl = $('#home-delta');
    if (deltaEl) {
      if (!expenses.length) {
        deltaEl.className = 'delta';
        deltaEl.textContent = '还没有支出';
      } else {
        const previous = previousMonthExpense();
        if (!previous) {
          deltaEl.className = 'delta';
          deltaEl.textContent = '本月开始';
        } else {
          const pct = Math.round(((expense - previous) / previous) * 100);
          const down = pct < 0;
          deltaEl.className = 'delta' + (down ? ' delta--down' : '');
          deltaEl.innerHTML = icon(down ? 'trending-down' : 'trending-up', 'icon--sm') + (down ? '' : '+') + pct + '%';
        }
      }
    }

    const categoryCard = $('#home-category-card');
    const categoryList = $('#home-categories');
    if (categoryCard && categoryList) {
      const map = {};
      expenses.forEach(function (tx) {
        const name = tx.category || '其他';
        if (!map[name]) map[name] = 0;
        map[name] += tx.amountCents;
      });
      const categories = Object.keys(map).map(function (name) { return { name: name, value: map[name] }; })
        .sort(function (a, b) { return b.value - a.value; });
      if (!categories.length) {
        categoryCard.hidden = true;
      } else {
        categoryCard.hidden = false;
        categoryList.innerHTML = categories.slice(0, 4).map(function (item, index) {
          const meta = categoryMeta(item.name);
          const pct = expense ? Math.round(item.value / expense * 100) : 0;
          return '<div class="home-category-row">' +
            '<span class="home-category-row__dot" style="background:' + colorFor(item.name, index) + '"></span>' +
            '<span class="home-category-row__name">' + esc(item.name) + '</span>' +
            '<span class="home-category-row__bar"><span style="width:' + Math.max(3, pct) + '%;background:' + colorFor(item.name, index) + '"></span></span>' +
            '<span class="home-category-row__pct">' + pct + '%</span></div>';
        }).join('');
      }
    }

    const ledgerCount = $('#ledger-count');
    if (ledgerCount) ledgerCount.textContent = '共 ' + count + ' 笔';
    const ledgerBody = $('#ledger-body');
    if (!ledgerBody) return;
    if (!all.length) {
      ledgerBody.innerHTML = '<div class="empty-ledger">' +
        '<img src="assets/img/peach.svg" alt="" class="empty-ledger__peach">' +
        '<h2>这个月还没有账目</h2>' +
        '<p>先记下第一笔，月底就能看见钱去了哪里。</p>' +
        '<a class="btn btn--primary btn--sm" href="record.html">' + icon('plus', 'icon--sm') + '记一笔</a>' +
        '</div>';
      return;
    }
    const groups = groupTransactions(all);
    ledgerBody.innerHTML = groups.map(function (group) {
      const groupExpense = totalCents(group.items.filter(function (tx) { return tx.type === 'expense'; }));
      const groupIncome = totalCents(group.items.filter(function (tx) { return tx.type === 'income'; }));
      const rows = group.items.map(function (tx) {
        const meta = categoryMeta(tx.category);
        const title = tx.note ? tx.note : tx.category;
        const tag = tx.note ? '<span class="tag">' + esc(tx.category) + '</span>' : '<span class="tag">' + (tx.type === 'income' ? '收入' : '支出') + '</span>';
        return '<div class="transaction">' +
          '<span class="category-icon category-icon--' + meta.tone + '">' + icon(meta.icon) + '</span>' +
          '<span class="transaction__copy"><span class="transaction__title">' + esc(title) + ' ' + tag + '</span>' +
          '<span class="transaction__meta"><span>' + (tx.type === 'income' ? '收入' : '支出') + '</span><span>·</span><span>' + timeDisplay(tx.createdAt) + '</span></span></span>' +
          '<span class="transaction__amount' + (tx.type === 'income' ? ' transaction__amount--income' : '') + '">' + transactionAmount(tx) + '<small>' + (tx.type === 'income' ? '收入' : '日常支出') + '</small></span>' +
          '</div>';
      }).join('');
      return '<section class="day-block"><div class="day-head"><div class="day-title">' + dateDisplay(group.date) + ' <span>' + group.date.slice(5).replace('-', '月') + '日 ' + weekdayDisplay(group.date) + '</span></div>' +
        '<div class="day-meta">共 ' + group.items.length + ' 笔 <strong>支出 ' + fmt(groupExpense) + '</strong>' + (groupIncome ? ' · 收入 ' + fmt(groupIncome) : '') + '</div></div>' +
        '<div class="transaction-list">' + rows + '</div></section>';
    }).join('');
  }

  function initRecord() {
    const form = $('#record-form');
    if (!form) return;
    const amount = $('#record-amount');
    const note = $('#record-note');
    const dateInput = $('#record-date');
    const error = $('#record-error');
    const selectedLabel = $('[data-selected-category]');
    const typeLabel = $('[data-record-type-value]');
    const recentEl = $('#recent-categories');
    const gridEl = $('#category-grid');
    let currentType = 'expense';
    let currentCategory = EXPENSE_CATEGORIES[0].name;

    if (dateInput && !dateInput.value) dateInput.value = todayKey();

    const cleanAmount = function (value) {
      let text = String(value || '').replace(/[^\d.]/g, '');
      const firstDot = text.indexOf('.');
      if (firstDot !== -1) text = text.slice(0, firstDot + 1) + text.slice(firstDot + 1).replace(/\./g, '');
      const parts = text.split('.');
      const integer = (parts[0] || '').replace(/^0+(?=\d)/, '').slice(0, 7);
      const decimal = parts.length > 1 ? parts[1].slice(0, 2) : '';
      return integer + (parts.length > 1 ? '.' + decimal : '');
    };

    function renderCategories() {
      const list = currentType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
      const recent = list.slice(0, 5);
      const rest = list.slice(5);
      if (recentEl) recentEl.innerHTML = recent.map(function (item) {
        return '<button class="chip-button' + (item.name === currentCategory ? ' is-selected' : '') + '" type="button" data-category="' + esc(item.name) + '">' + icon(item.icon, 'icon--sm') + esc(item.name) + '</button>';
      }).join('');
      if (gridEl) gridEl.innerHTML = rest.map(function (item) {
        return '<button class="category-option' + (item.name === currentCategory ? ' is-selected' : '') + '" type="button" data-category="' + esc(item.name) + '">' +
          '<span class="category-icon category-icon--' + item.tone + '">' + icon(item.icon) + '</span>' + esc(item.name) + '</button>';
      }).join('');
      if (selectedLabel) selectedLabel.textContent = currentCategory;
      if (typeLabel) typeLabel.textContent = currentType === 'income' ? '收入' : '支出';
    }

    function setCategory(name) {
      currentCategory = name;
      $$('[data-category]').forEach(function (button) {
        button.classList.toggle('is-selected', button.dataset.category === currentCategory);
      });
      if (selectedLabel) selectedLabel.textContent = currentCategory;
    }

    function renderMonthSummary() {
      const list = readTransactions().filter(function (tx) { return monthKeyFromDate(tx.date) === currentMonthKey(); });
      const expense = totalCents(list.filter(function (tx) { return tx.type === 'expense'; }));
      const income = totalCents(list.filter(function (tx) { return tx.type === 'income'; }));
      const expenseEl = $('#record-month-expense');
      if (expenseEl) expenseEl.textContent = fmt(expense);
      const incomeEl = $('#record-month-income');
      if (incomeEl) incomeEl.textContent = fmt(income);
      const countEl = $('#record-month-count');
      if (countEl) countEl.textContent = list.length + ' 笔';
    }

    function renderToday() {
      const today = todayKey();
      const list = readTransactions().filter(function (tx) { return tx.date === today; }).sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      const total = totalCents(list.filter(function (tx) { return tx.type === 'expense'; }));
      const summary = $('#today-summary');
      if (summary) summary.textContent = list.length ? '共 ' + list.length + ' 笔 · 支出 ' + fmt(total) : '今天还没有记录';
      const host = $('#today-list');
      if (!host) return;
      host.innerHTML = list.length ? list.map(function (tx) {
        const meta = categoryMeta(tx.category);
        return '<div class="today-item">' +
          '<span class="category-icon category-icon--' + meta.tone + ' category-icon--sm">' + icon(meta.icon) + '</span>' +
          '<span class="today-item__copy"><span class="today-item__title">' + esc(tx.note || tx.category) + '</span><span class="today-item__meta">' + timeDisplay(tx.createdAt) + ' · ' + esc(tx.category) + '</span></span>' +
          '<span class="today-item__amount' + (tx.type === 'income' ? ' is-income' : '') + '">' + transactionAmount(tx) + '</span></div>';
      }).join('') : '<div class="today-empty">今天还没有记录，记下第一笔吧。</div>';
    }

    amount.addEventListener('input', function () {
      amount.value = cleanAmount(amount.value);
      if (amount.value) error.hidden = true;
    });

    $$('[data-add-amount]').forEach(function (button) {
      button.addEventListener('click', function () {
        const add = Number(button.dataset.addAmount) || 0;
        const current = parseFloat(amount.value) || 0;
        amount.value = String(current + add);
        amount.focus();
      });
    });

    $$('[data-record-type]').forEach(function (button) {
      button.addEventListener('click', function () {
        $$('[data-record-type]').forEach(function (b) {
          b.classList.toggle('is-active', b === button);
          b.setAttribute('aria-pressed', String(b === button));
        });
        currentType = button.dataset.recordType;
        currentCategory = (currentType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES)[0].name;
        renderCategories();
      });
    });

    form.addEventListener('click', function (event) {
      const button = event.target.closest('[data-category]');
      if (button) setCategory(button.dataset.category);
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const value = parseFloat(amount.value);
      if (!value || value <= 0) {
        error.textContent = '先输入一个金额吧';
        error.hidden = false;
        amount.focus();
        return;
      }
      const date = dateInput && parseDateKey(dateInput.value) ? dateInput.value : todayKey();
      addTransaction({
        id: 'tx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        type: currentType,
        amountCents: Math.round(value * 100),
        category: currentCategory,
        note: note ? note.value.trim().slice(0, 200) : '',
        date: date,
        createdAt: Date.now()
      });
      renderToday();
      renderMonthSummary();
      const saveAgain = $('#save-again');
      if (saveAgain && saveAgain.checked) {
        showToast('已记 ' + (currentType === 'income' ? '+' : '−') + fmt(Math.round(value * 100)) + ' · ' + currentCategory + '，继续记录', 'check');
        amount.value = '';
        if (note) note.value = '';
        amount.focus();
        return;
      }
      setFlash('已记 ' + (currentType === 'income' ? '+' : '−') + fmt(Math.round(value * 100)) + ' · ' + currentCategory, 'check');
      window.location.href = 'index.html';
    });

    renderCategories();
    renderMonthSummary();
    renderToday();
  }

  /* ---------------- 设置 ---------------- */

  function initSettings() {
    const privacy = $('#privacy-switch');
    if (privacy) {
      try { privacy.checked = localStorage.getItem('qingji_demo_privacy') === '1'; } catch (e) { /* ignore */ }
      privacy.addEventListener('change', function () {
        try { localStorage.setItem('qingji_demo_privacy', privacy.checked ? '1' : '0'); } catch (e) { /* ignore */ }
        showToast(privacy.checked ? '隐私模式已开启，金额会在原型中模糊显示' : '隐私模式已关闭', 'check');
      });
    }
  }

  /* ---------------- 数据页 ---------------- */

  function initData() {
    const txCount = $('[data-tx-count]');
    if (txCount) txCount.textContent = readTransactions().length + ' 笔';
    const reminder = $('#backup-reminder');
    if (reminder) {
      try { reminder.checked = localStorage.getItem('qingji_demo_backup_reminder') !== '0'; } catch (e) { /* ignore */ }
      reminder.addEventListener('change', function () {
        try { localStorage.setItem('qingji_demo_backup_reminder', reminder.checked ? '1' : '0'); } catch (e) { /* ignore */ }
        showToast(reminder.checked ? '已开启备份提醒' : '已关闭备份提醒', 'check');
      });
    }
  }

  /* ---------------- 账号页 ---------------- */

  function openChangePassword() {
    openModal({
      title: '修改密码',
      body: '<div class="form-field"><label class="form-label" for="current-password">当前密码</label><div class="input-shell"><input class="input" id="current-password" type="password" autocomplete="current-password" placeholder="输入当前密码"></div></div>' +
        '<div class="form-field" style="margin-top:12px"><label class="form-label" for="new-password">新密码<span class="label-hint">8–64 位，需含字母和数字</span></label><div class="input-shell"><input class="input" id="new-password" type="password" autocomplete="new-password" placeholder="设置新密码"></div></div>' +
        '<div class="form-field" style="margin-top:12px"><label class="form-label" for="confirm-password">确认新密码</label><div class="input-shell"><input class="input" id="confirm-password" type="password" autocomplete="new-password" placeholder="再次输入新密码"></div></div>' +
        '<p class="form-error" id="password-error" hidden></p>',
      footer: '<button class="btn btn--outline" type="button" data-modal-close>取消</button><button class="btn btn--primary" type="button" id="save-password">保存</button>',
      onMount: function (root) {
        const save = $('#save-password', root);
        save.addEventListener('click', function () {
          const current = $('#current-password', root).value;
          const next = $('#new-password', root).value;
          const confirm = $('#confirm-password', root).value;
          const error = $('#password-error', root);
          if (!current) { error.textContent = '请输入当前密码'; error.hidden = false; return; }
          if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) { error.textContent = '新密码需要 8 位以上，并同时包含字母和数字'; error.hidden = false; return; }
          if (next !== confirm) { error.textContent = '两次输入的密码不一致'; error.hidden = false; return; }
          closeModal();
          showToast('密码已更新（原型演示）', 'check');
        });
      }
    });
  }

  function openRecoveryCode() {
    const user = window.QJAuth ? window.QJAuth.currentUser() : null;
    const code = user && user.recoveryCode ? user.recoveryCode : '未生成';
    openModal({
      title: '恢复码',
      body: '<p class="modal__note">恢复码是忘记密码时唯一的自助找回凭证。请把它保存在安全的地方。</p>' +
        '<div class="code-box"><span>' + esc(code) + '</span><button class="icon-button" type="button" data-copy-code aria-label="复制恢复码"' + (code === '未生成' ? ' disabled' : '') + '>' + icon('copy') + '</button></div>' +
        '<p class="form-hint">原型演示中可在此查看；正式版本只在注册成功时显示一次，重新生成会使旧码失效。</p>',
      onMount: function (root) {
        const button = $('[data-copy-code]', root);
        if (!button || button.disabled) return;
        button.addEventListener('click', async function () {
          const ok = await copyText(code);
          showToast(ok ? '恢复码已复制' : '复制失败，请手动选择', ok ? 'check' : 'info');
        });
      }
    });
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

  /* ---------------- 数据与备份 ---------------- */

  function openCopyBackup() {
    const sample = JSON.stringify({
      format: 'qingji-backup',
      version: 1,
      exportedAt: Date.now(),
      summary: { transactionCount: readTransactions().length, categoryCount: 19 }
    }, null, 2);
    openModal({
      title: '复制备份内容',
      body: '<p class="modal__note" style="margin-bottom:10px">把下面的内容保存到备忘录或文件里。恢复时使用「导入备份」。</p>' +
        '<textarea class="textarea" id="backup-text" readonly style="min-height:170px;font-size:12px;line-height:1.45">' + esc(sample) + '</textarea>',
      footer: '<button class="btn btn--outline" type="button" data-modal-close>关闭</button><button class="btn btn--primary" type="button" id="copy-backup">' + icon('copy', 'icon--sm') + '复制内容</button>',
      onMount: function (root) {
        $('#copy-backup', root).addEventListener('click', async function () {
          const ok = await copyText(sample);
          showToast(ok ? '备份内容已复制（原型演示）' : '复制失败，请手动选择', ok ? 'check' : 'info');
          if (ok) closeModal();
        });
      }
    });
  }

  /* ---------------- 分类管理 ---------------- */

  function initCategories() {
    const tabs = $$('[data-category-tab]');
    const lists = $$('[data-category-list]');
    const addButtons = $$('[data-category-add]');
    let currentType = 'expense';

    const switchType = function (type) {
      currentType = type;
      tabs.forEach(function (button) {
        const on = button.dataset.categoryTab === type;
        button.classList.toggle('is-active', on);
        button.setAttribute('aria-pressed', String(on));
      });
      lists.forEach(function (list) { list.hidden = list.dataset.categoryList !== type; });
    };

    tabs.forEach(function (button) {
      button.addEventListener('click', function () { switchType(button.dataset.categoryTab); });
    });
    addButtons.forEach(function (button) {
      button.addEventListener('click', function () { openCategoryModal(currentType); });
    });

    document.addEventListener('click', function (event) {
      const el = event.target.closest('[data-category-action]');
      if (!el) return;
      const row = el.closest('[data-category-row]');
      if (!row) return;
      const action = el.dataset.categoryAction;
      if (action === 'edit') openCategoryModal(currentType, row);
      if (action === 'toggle') {
        row.classList.toggle('is-hidden');
        const hidden = row.classList.contains('is-hidden');
        row.dataset.hidden = hidden ? '1' : '0';
        showToast(hidden ? '分类已隐藏，历史账目仍保留' : '分类已恢复显示', 'check');
      }
      if (action === 'delete') {
        confirmDialog({
          title: '删除这个分类？',
          message: '如果分类下有账目，需要先把账目迁移到其他分类。当前原型会直接移除示例分类。',
          confirmLabel: '删除',
          danger: true,
          onConfirm: function () { row.remove(); showToast('分类已删除（原型演示）', 'check'); }
        });
      }
    });
  }

  function openCategoryModal(type, row) {
    const isEdit = !!row;
    const name = row ? ($('[data-category-name]', row) || {}).textContent || '' : '';
    openModal({
      title: isEdit ? '编辑分类' : '新增分类',
      body: '<div class="form-field"><label class="form-label" for="category-name">分类名称</label><input class="input" id="category-name" maxlength="12" autocomplete="off" placeholder="例如：下午茶" value="' + esc(name) + '"></div>' +
        '<div class="form-field" style="margin-top:12px"><label class="form-label" for="category-parent">归属</label><select class="select" id="category-parent"><option value="">一级分类</option><option value="餐饮">餐饮</option><option value="交通">交通</option><option value="购物">购物</option><option value="其他">其他</option></select></div>' +
        '<p class="form-hint" style="margin-top:8px">隐藏或删除分类不会删除历史账目；删除前需要迁移账目。</p>',
      footer: '<button class="btn btn--outline" type="button" data-modal-close>取消</button><button class="btn btn--primary" type="button" id="save-category">' + (isEdit ? '保存' : '添加') + '</button>',
      onMount: function (root) {
        const input = $('#category-name', root);
        input.focus();
        $('#save-category', root).addEventListener('click', function () {
          const value = input.value.trim();
          if (!value) { input.focus(); showToast('先给分类起个名字吧', 'info'); return; }
          if (isEdit) {
            const title = $('[data-category-name]', row);
            if (title) title.textContent = value;
            showToast('分类已更新（原型演示）', 'check');
          } else {
            const list = $('[data-category-list="' + type + '"]');
            if (list) {
              const node = document.createElement('div');
              node.className = 'category-row';
              node.setAttribute('data-category-row', '');
              node.innerHTML = '<span class="category-icon category-icon--violet category-icon--sm">' + icon('tag') + '</span>' +
                '<span class="category-row__copy"><span class="category-row__name"><span data-category-name>' + esc(value) + '</span><span class="pill">自定义</span></span><span class="category-row__meta">一级分类 · 0 笔</span></span>' +
                '<span class="category-row__actions">' +
                '<button class="mini-btn" type="button" data-category-action="edit" aria-label="编辑分类">' + icon('edit') + '</button>' +
                '<button class="mini-btn" type="button" data-category-action="toggle" aria-label="隐藏分类">' + icon('eye-off') + '</button>' +
                '<button class="mini-btn mini-btn--danger" type="button" data-category-action="delete" aria-label="删除分类">' + icon('trash') + '</button>' +
                '</span>';
              list.appendChild(node);
            }
            showToast('分类已添加（原型演示）', 'check');
          }
          closeModal();
        });
      }
    });
  }

  /* ---------------- 本地认证表单 / 用户展示 ---------------- */

  function formatUserDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function initUserDisplay() {
    const user = window.QJAuth ? window.QJAuth.currentUser() : null;
    if (!user) return;
    const chars = Array.from(user.username || '');
    const initial = chars.length ? (/^[A-Za-z]/.test(chars[0]) && chars.length > 1 ? (chars[0] + chars[1]).toUpperCase() : chars[0].toUpperCase()) : '林';
    $$('[data-user-name]').forEach(function (el) { el.textContent = '@' + user.username; });
    $$('[data-user-created]').forEach(function (el) { el.textContent = formatUserDate(user.createdAt); });
    $$('[data-user-initial]').forEach(function (el) { el.textContent = initial; });
  }

  function initAuthForms() {
    const loginForm = $('form[data-auth-form="login"]');
    if (loginForm) {
      loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (!loginForm.reportValidity()) return;
        const error = $('#login-error');
        const submit = loginForm.querySelector('button[type="submit"]');
        const original = submit.textContent;
        error.hidden = true;
        submit.disabled = true;
        submit.textContent = '正在登录…';
        try {
          const user = await window.QJAuth.login($('#login-username').value, $('#login-password').value);
          const next = window.QJAuth.safeNext(new URLSearchParams(location.search).get('next'));
          setFlash('欢迎回来，@' + user.username, 'check');
          window.location.href = next;
        } catch (err) {
          error.textContent = err.message || '用户名或密码不正确';
          error.hidden = false;
          submit.disabled = false;
          submit.textContent = original;
        }
      });
    }

    const registerForm = $('form[data-auth-form="register"]');
    if (registerForm) {
      registerForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const submit = $('[data-register-submit]');
        if (submit && submit.disabled) return;
        if (!registerForm.reportValidity()) return;
        const error = $('#register-error');
        const original = submit.textContent;
        error.hidden = true;
        submit.disabled = true;
        submit.textContent = '正在创建…';
        try {
          const user = await window.QJAuth.register($('#register-username').value, $('#register-password').value);
          setFlash('注册成功，@' + user.username + '。恢复码可在「账号与安全」查看（原型演示）。', 'check');
          window.location.href = 'index.html';
        } catch (err) {
          error.textContent = err.message || '注册失败，请检查输入';
          error.hidden = false;
          submit.disabled = false;
          submit.textContent = original;
        }
      });
    }

    const forgotForm = $('form[data-auth-form="forgot"]');
    if (forgotForm) {
      forgotForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (!forgotForm.reportValidity()) return;
        const error = $('#forgot-error');
        const submit = forgotForm.querySelector('button[type="submit"]');
        const original = submit.textContent;
        error.hidden = true;
        submit.disabled = true;
        submit.textContent = '正在重置…';
        try {
          await window.QJAuth.resetPassword($('#recover-username').value, $('#recovery-code-input').value, $('#recover-password').value);
          setFlash('密码已重置，请使用新密码登录（原型演示）', 'check');
          window.location.href = 'login.html';
        } catch (err) {
          error.textContent = err.message || '用户名或恢复码不正确';
          error.hidden = false;
          submit.disabled = false;
          submit.textContent = original;
        }
      });
    }
  }

  /* ---------------- 启动 ---------------- */

  function init() {
    ensureRoots();
    initPasswordToggles();
    initForms();
    initAuthForms();
    initUserDisplay();
    initCommonActions();
    const page = document.body.dataset.page;
    if (page === 'home') initHome();
    if (page === 'stats') initStats();
    if (page === 'record') initRecord();
    if (page === 'settings') initSettings();
    if (page === 'data') initData();
    if (page === 'categories') initCategories();
    const flash = readFlash();
    if (flash) showToast(flash.message, flash.tone);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
