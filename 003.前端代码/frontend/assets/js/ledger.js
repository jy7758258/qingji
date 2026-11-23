/* 轻记 · 账本 API 客户端 */
(function () {
  'use strict';

  function normalizeCategory(category) {
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      icon: category.icon || 'box',
      color: category.color || '#C9BBC1',
      sort: category.sort || 0,
      parentId: category.parentId || null,
      isSystem: !!category.system,
      hidden: !!category.hidden
    };
  }

  function normalizeTransaction(tx) {
    const created = tx.createdAt ? Date.parse(tx.createdAt) : Date.now();
    return {
      id: tx.id,
      type: tx.type,
      amountCents: tx.amountCents,
      categoryId: tx.categoryId,
      category: tx.categoryName,
      categoryIcon: tx.categoryIcon,
      categoryColor: tx.categoryColor,
      note: tx.note || '',
      date: tx.occurredOn,
      occurredOn: tx.occurredOn,
      createdAt: Number.isNaN(created) ? Date.now() : created
    };
  }

  function monthRange(monthKey) {
    const parts = String(monthKey).split('-').map(Number);
    const lastDay = new Date(parts[0], parts[1], 0).getDate();
    return {
      from: parts[0] + '-' + String(parts[1]).padStart(2, '0') + '-01',
      to: parts[0] + '-' + String(parts[1]).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0')
    };
  }

  async function listCategories() {
    const list = await window.QJAuth.request('/api/ledger/categories', { method: 'GET' });
    return Array.isArray(list) ? list.map(normalizeCategory) : [];
  }

  async function listRange(from, to) {
    const query = '?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to);
    const list = await window.QJAuth.request('/api/ledger/transactions' + query, { method: 'GET' });
    return Array.isArray(list) ? list.map(normalizeTransaction) : [];
  }

  async function listMonth(monthKey) {
    const range = monthRange(monthKey);
    return listRange(range.from, range.to);
  }

  async function createTransaction(payload) {
    const tx = await window.QJAuth.request('/api/ledger/transactions', {
      method: 'POST',
      body: JSON.stringify({
        type: payload.type,
        amountCents: payload.amountCents,
        categoryId: payload.categoryId,
        note: payload.note || '',
        occurredOn: payload.occurredOn
      })
    });
    return normalizeTransaction(tx);
  }

  window.QJLedger = {
    listCategories,
    listRange,
    listMonth,
    createTransaction
  };
})();
