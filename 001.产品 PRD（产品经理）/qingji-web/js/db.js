/* 轻记 · 本地数据层（IndexedDB） */
(function () {
  'use strict';

  const QJ = (window.QJ = window.QJ || {});
  const DB_NAME = 'qingji';
  const DB_VERSION = 1;

  const CHART = ['#E87BA4', '#2A78D6', '#EB6834', '#1BAF7A', '#EDA100', '#6250D6', '#008300', '#E34948'];

  const TOP_EXPENSE = [
    ['exp-food', '餐饮', 'bowl'],
    ['exp-transport', '交通', 'train'],
    ['exp-shopping', '购物', 'bag'],
    ['exp-housing', '居住', 'home'],
    ['exp-fun', '娱乐', 'play'],
    ['exp-medical', '医疗', 'medical'],
    ['exp-education', '教育', 'book'],
    ['exp-gift', '人情', 'gift'],
    ['exp-phone', '通讯', 'phone'],
    ['exp-pet', '宠物', 'paw'],
    ['exp-travel', '旅行', 'plane'],
    ['exp-other', '其他', 'box']
  ];

  const TOP_INCOME = [
    ['inc-salary', '工资', 'wallet'],
    ['inc-bonus', '奖金', 'trophy'],
    ['inc-side', '兼职', 'briefcase'],
    ['inc-invest', '理财', 'chart'],
    ['inc-reimburse', '报销', 'receipt'],
    ['inc-redpacket', '红包', 'redpacket'],
    ['inc-other', '其他', 'plus']
  ];

  const SUBS = {
    'exp-food': [
      ['exp-food-breakfast', '早餐', 'bowl'],
      ['exp-food-lunch', '午餐', 'bowl'],
      ['exp-food-dinner', '晚餐', 'bowl'],
      ['exp-food-takeout', '外卖', 'bowl'],
      ['exp-food-coffee', '咖啡茶饮', 'cup'],
      ['exp-food-snack', '零食', 'bowl']
    ],
    'exp-transport': [
      ['exp-transport-metro', '公交地铁', 'train'],
      ['exp-transport-taxi', '打车', 'train'],
      ['exp-transport-fuel', '加油', 'train'],
      ['exp-transport-parking', '停车', 'train']
    ],
    'exp-shopping': [
      ['exp-shopping-daily', '日用品', 'bag'],
      ['exp-shopping-clothes', '服饰', 'bag'],
      ['exp-shopping-digital', '数码', 'bag'],
      ['exp-shopping-beauty', '美妆', 'bag']
    ],
    'exp-housing': [
      ['exp-housing-rent', '房租', 'home'],
      ['exp-housing-utility', '水电燃气', 'home'],
      ['exp-housing-property', '物业', 'home'],
      ['exp-housing-internet', '宽带', 'home']
    ],
    'exp-fun': [
      ['exp-fun-movie', '电影', 'play'],
      ['exp-fun-game', '游戏', 'play'],
      ['exp-fun-subscription', '会员订阅', 'play'],
      ['exp-fun-show', '演出', 'play'],
      ['exp-fun-sport', '运动', 'play']
    ],
    'exp-medical': [
      ['exp-medical-clinic', '门诊', 'medical'],
      ['exp-medical-medicine', '药品', 'medical'],
      ['exp-medical-checkup', '体检', 'medical']
    ],
    'exp-education': [
      ['exp-education-course', '课程', 'book'],
      ['exp-education-books', '书籍', 'book']
    ],
    'exp-gift': [
      ['exp-gift-redpacket', '红包', 'gift'],
      ['exp-gift-present', '礼物', 'gift'],
      ['exp-gift-treat', '请客', 'gift']
    ],
    'exp-phone': [
      ['exp-phone-bill', '话费', 'phone'],
      ['exp-phone-data', '流量', 'phone']
    ],
    'exp-pet': [
      ['exp-pet-food', '主粮', 'paw'],
      ['exp-pet-medical', '医疗', 'paw'],
      ['exp-pet-supplies', '用品', 'paw']
    ],
    'exp-travel': [
      ['exp-travel-flight', '机票', 'plane'],
      ['exp-travel-hotel', '酒店', 'plane'],
      ['exp-travel-ticket', '门票', 'plane']
    ]
  };

  const DEFAULT_SETTINGS = {
    lastType: 'expense',
    recentCategoryIds: [],
    onboarded: false,
    backupReminderEnabled: true,
    lastBackupAt: null,
    backupReminderDismissedAt: null
  };

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function buildDefaultCategories() {
    const list = [];
    TOP_EXPENSE.forEach(function (row, index) {
      list.push({
        id: row[0],
        name: row[1],
        parentId: null,
        type: 'expense',
        icon: row[2],
        color: row[0] === 'exp-other' ? '#C9BBC1' : CHART[index % 8],
        sort: index,
        isSystem: true,
        hidden: false
      });
    });
    TOP_INCOME.forEach(function (row, index) {
      list.push({
        id: row[0],
        name: row[1],
        parentId: null,
        type: 'income',
        icon: row[2],
        color: CHART[index % 8],
        sort: index,
        isSystem: true,
        hidden: false
      });
    });
    Object.keys(SUBS).forEach(function (parentId) {
      const parent = list.find(function (c) { return c.id === parentId; });
      SUBS[parentId].forEach(function (row, index) {
        list.push({
          id: row[0],
          name: row[1],
          parentId: parentId,
          type: 'expense',
          icon: row[2],
          color: parent ? parent.color : CHART[index % 8],
          sort: index,
          isSystem: true,
          hidden: false
        });
      });
    });
    return list;
  }

  let dbPromise = null;

  function openDatabase() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error('当前浏览器不支持本地存储'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        const db = request.result;
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('occurredAt', 'occurredAt');
          txStore.createIndex('categoryId', 'categoryId');
          txStore.createIndex('type', 'type');
          txStore.createIndex('deletedAt', 'deletedAt');
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };
      request.onsuccess = function () {
        const db = request.result;
        db.onversionchange = function () { db.close(); };
        seed(db).then(function () { resolve(db); }).catch(reject);
      };
      request.onerror = function () { reject(request.error || new Error('无法打开本地数据库')); };
    });
    return dbPromise;
  }

  function promisify(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  function done(transaction) {
    return new Promise(function (resolve, reject) {
      transaction.oncomplete = function () { resolve(); };
      transaction.onerror = function () { reject(transaction.error); };
      transaction.onabort = function () { reject(transaction.error || new Error('数据写入被中断')); };
    });
  }

  function readAll(db, store) {
    return promisify(db.transaction(store, 'readonly').objectStore(store).getAll());
  }

  async function seed(db) {
    const categories = await readAll(db, 'categories');
    if (categories.length > 0) {
      const meta = await readAll(db, 'meta');
      if (!meta.some(function (m) { return m.key === 'seeded'; })) {
        const tx = db.transaction('meta', 'readwrite');
        tx.objectStore('meta').put({ key: 'seeded', value: true });
        await done(tx);
      }
      return;
    }

    const tx = db.transaction(['categories', 'settings', 'meta'], 'readwrite');
    const catStore = tx.objectStore('categories');
    buildDefaultCategories().forEach(function (cat) { catStore.put(cat); });

    const settingStore = tx.objectStore('settings');
    Object.keys(DEFAULT_SETTINGS).forEach(function (key) {
      settingStore.put({ key: key, value: DEFAULT_SETTINGS[key] });
    });

    const metaStore = tx.objectStore('meta');
    metaStore.put({ key: 'seeded', value: true });
    metaStore.put({ key: 'schemaVersion', value: 1 });
    metaStore.put({ key: 'createdAt', value: Date.now() });
    metaStore.put({ key: 'deviceId', value: uid() });
    await done(tx);
  }

  async function getSnapshot() {
    const db = await openDatabase();
    const tx = db.transaction(['transactions', 'categories', 'settings', 'meta'], 'readonly');
    const txs = promisify(tx.objectStore('transactions').getAll());
    const cats = promisify(tx.objectStore('categories').getAll());
    const settingRows = promisify(tx.objectStore('settings').getAll());
    const metaRows = promisify(tx.objectStore('meta').getAll());
    const results = await Promise.all([txs, cats, settingRows, metaRows]);
    const settings = {};
    results[2].forEach(function (row) { settings[row.key] = row.value; });
    const meta = {};
    results[3].forEach(function (row) { meta[row.key] = row.value; });
    return {
      transactions: results[0].filter(function (t) { return !t.deletedAt; }),
      allTransactions: results[0],
      categories: results[1],
      settings: settings,
      meta: meta
    };
  }

  async function saveSettings(patch) {
    const db = await openDatabase();
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    Object.keys(patch).forEach(function (key) {
      store.put({ key: key, value: patch[key] });
    });
    await done(tx);
  }

  async function putTransaction(transaction) {
    const db = await openDatabase();
    const tx = db.transaction('transactions', 'readwrite');
    tx.objectStore('transactions').put(transaction);
    await done(tx);
  }

  async function getTransaction(id) {
    const db = await openDatabase();
    return promisify(db.transaction('transactions', 'readonly').objectStore('transactions').get(id));
  }

  async function softDeleteTransaction(id) {
    const row = await getTransaction(id);
    if (!row) return null;
    row.deletedAt = Date.now();
    row.updatedAt = Date.now();
    const db = await openDatabase();
    const tx = db.transaction('transactions', 'readwrite');
    tx.objectStore('transactions').put(row);
    await done(tx);
    return row;
  }

  async function restoreTransaction(id) {
    const row = await getTransaction(id);
    if (!row) return null;
    row.deletedAt = null;
    row.updatedAt = Date.now();
    const db = await openDatabase();
    const tx = db.transaction('transactions', 'readwrite');
    tx.objectStore('transactions').put(row);
    await done(tx);
    return row;
  }

  async function putCategory(category) {
    const db = await openDatabase();
    const tx = db.transaction('categories', 'readwrite');
    tx.objectStore('categories').put(category);
    await done(tx);
  }

  async function putCategories(categories) {
    const db = await openDatabase();
    const tx = db.transaction('categories', 'readwrite');
    const store = tx.objectStore('categories');
    categories.forEach(function (cat) { store.put(cat); });
    await done(tx);
  }

  async function deleteCategoryById(id) {
    const db = await openDatabase();
    const tx = db.transaction('categories', 'readwrite');
    tx.objectStore('categories').delete(id);
    await done(tx);
  }

  async function migrateTransactions(fromId, toId) {
    const db = await openDatabase();
    const readTx = db.transaction('transactions', 'readonly');
    const rows = await promisify(readTx.objectStore('transactions').index('categoryId').getAll(fromId));
    const writeTx = db.transaction('transactions', 'readwrite');
    const store = writeTx.objectStore('transactions');
    rows.forEach(function (row) {
      row.categoryId = toId;
      row.updatedAt = Date.now();
      store.put(row);
    });
    await done(writeTx);
  }

  async function countTransactionsForCategory(id) {
    const db = await openDatabase();
    const index = db.transaction('transactions', 'readonly').objectStore('transactions').index('categoryId');
    return promisify(index.count(id));
  }

  async function makeBackup() {
    const db = await openDatabase();
    const tx = db.transaction(['transactions', 'categories', 'settings', 'meta'], 'readonly');
    const txs = await promisify(tx.objectStore('transactions').getAll());
    const cats = await promisify(tx.objectStore('categories').getAll());
    const settings = await promisify(tx.objectStore('settings').getAll());
    const meta = await promisify(tx.objectStore('meta').getAll());
    const active = txs.filter(function (t) { return !t.deletedAt; });
    const times = active.map(function (t) { return t.occurredAt; });
    return {
      format: 'qingji-backup',
      version: 1,
      exportedAt: Date.now(),
      summary: {
        transactionCount: active.length,
        categoryCount: cats.length,
        range: times.length ? { from: Math.min.apply(null, times), to: Math.max.apply(null, times) } : null
      },
      data: {
        transactions: txs,
        categories: cats,
        settings: settings,
        meta: meta
      }
    };
  }

  function validateBackup(payload) {
    if (!payload || typeof payload !== 'object') return '备份文件为空或格式不正确';
    if (payload.format !== 'qingji-backup') return '这不是轻记的备份文件';
    if (payload.version !== 1) return '备份版本不兼容，请使用当前版本导出的文件';
    if (!payload.data || !Array.isArray(payload.data.transactions) || !Array.isArray(payload.data.categories)) {
      return '备份内容不完整';
    }
    if (payload.data.categories.length === 0) return '备份中没有分类数据';
    return null;
  }

  async function replaceAll(payload) {
    const error = validateBackup(payload);
    if (error) throw new Error(error);
    const db = await openDatabase();
    const tx = db.transaction(['transactions', 'categories', 'settings', 'meta'], 'readwrite');
    tx.objectStore('transactions').clear();
    tx.objectStore('categories').clear();
    tx.objectStore('settings').clear();
    tx.objectStore('meta').clear();

    const txStore = tx.objectStore('transactions');
    payload.data.transactions.forEach(function (row) { txStore.put(row); });

    const catStore = tx.objectStore('categories');
    payload.data.categories.forEach(function (row) { catStore.put(row); });

    const settingStore = tx.objectStore('settings');
    const settings = Array.isArray(payload.data.settings) ? payload.data.settings : [];
    const seen = {};
    settings.forEach(function (row) {
      if (row && row.key) {
        seen[row.key] = true;
        settingStore.put(row);
      }
    });
    Object.keys(DEFAULT_SETTINGS).forEach(function (key) {
      if (!seen[key]) settingStore.put({ key: key, value: DEFAULT_SETTINGS[key] });
    });

    const metaStore = tx.objectStore('meta');
    const meta = Array.isArray(payload.data.meta) ? payload.data.meta : [];
    const metaSeen = {};
    meta.forEach(function (row) {
      if (row && row.key) {
        metaSeen[row.key] = true;
        metaStore.put(row);
      }
    });
    if (!metaSeen.seeded) metaStore.put({ key: 'seeded', value: true });
    if (!metaSeen.schemaVersion) metaStore.put({ key: 'schemaVersion', value: 1 });
    if (!metaSeen.deviceId) metaStore.put({ key: 'deviceId', value: uid() });
    await done(tx);
  }

  async function resetAll() {
    const db = await openDatabase();
    const tx = db.transaction(['transactions', 'categories', 'settings', 'meta'], 'readwrite');
    tx.objectStore('transactions').clear();
    tx.objectStore('categories').clear();
    tx.objectStore('settings').clear();
    tx.objectStore('meta').clear();

    const catStore = tx.objectStore('categories');
    buildDefaultCategories().forEach(function (cat) { catStore.put(cat); });
    const settingStore = tx.objectStore('settings');
    Object.keys(DEFAULT_SETTINGS).forEach(function (key) {
      settingStore.put({ key: key, value: DEFAULT_SETTINGS[key] });
    });
    const metaStore = tx.objectStore('meta');
    metaStore.put({ key: 'seeded', value: true });
    metaStore.put({ key: 'schemaVersion', value: 1 });
    metaStore.put({ key: 'createdAt', value: Date.now() });
    metaStore.put({ key: 'deviceId', value: uid() });
    await done(tx);
  }

  QJ.db = {
    init: openDatabase,
    getSnapshot: getSnapshot,
    saveSettings: saveSettings,
    putTransaction: putTransaction,
    getTransaction: getTransaction,
    softDeleteTransaction: softDeleteTransaction,
    restoreTransaction: restoreTransaction,
    putCategory: putCategory,
    putCategories: putCategories,
    deleteCategoryById: deleteCategoryById,
    migrateTransactions: migrateTransactions,
    countTransactionsForCategory: countTransactionsForCategory,
    makeBackup: makeBackup,
    validateBackup: validateBackup,
    replaceAll: replaceAll,
    resetAll: resetAll,
    buildDefaultCategories: buildDefaultCategories,
    uid: uid,
    CHART: CHART
  };
})();
