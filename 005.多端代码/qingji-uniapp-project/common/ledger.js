import { request } from './request'
import { monthKey, monthRange, pad2, todayKey } from './format'

function normalizeCategory(category) {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    icon: category.icon || '',
    color: category.color || '',
    sort: category.sort || 0,
    parentId: category.parentId || null,
    system: Boolean(category.system),
    hidden: Boolean(category.hidden)
  }
}

function normalizeTransaction(tx) {
  return {
    id: tx.id,
    type: tx.type,
    amountCents: Number(tx.amountCents) || 0,
    categoryId: tx.categoryId,
    category: tx.categoryName || '未分类',
    categoryIcon: tx.categoryIcon || '',
    categoryColor: tx.categoryColor || '',
    note: tx.note || '',
    date: tx.occurredOn,
    createdAt: Date.parse(tx.createdAt) || 0
  }
}

/**
 * 账本 API 客户端。日期一律使用 YYYY-MM-DD。
 */
export const ledger = {
  async listCategories() {
    const rows = await request('/api/ledger/categories')
    return (rows || []).map(normalizeCategory)
  },

  async listRange(from, to) {
    const rows = await request(`/api/ledger/transactions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
    return (rows || []).map(normalizeTransaction)
  },

  listMonth(key = monthKey()) {
    const range = monthRange(key)
    return this.listRange(range.from, range.to)
  },

  async createTransaction(payload) {
    const tx = await request('/api/ledger/transactions', {
      method: 'POST',
      data: {
        type: payload.type,
        amountCents: payload.amountCents,
        categoryId: payload.categoryId,
        note: payload.note || '',
        occurredOn: payload.occurredOn || todayKey()
      }
    })
    return normalizeTransaction(tx)
  }
}

export function rangeForSearch() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const end = monthRange(monthKey(now)).to
  return {
    from: `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-01`,
    to: end
  }
}

export function rangeForStats() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 23, 1)
  const end = monthRange(monthKey(now)).to
  return {
    from: `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-01`,
    to: end
  }
}
