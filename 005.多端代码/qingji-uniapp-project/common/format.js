const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export const CHART_COLORS = [
  '#e87ba4', '#2a78d6', '#eb6834', '#1baf7a',
  '#eda100', '#6250d6', '#008300', '#e34948'
]

const CATEGORY_EMOJI = {
  bowl: '🍜',
  food: '🍚',
  meal: '🍱',
  coffee: '☕',
  drink: '🧋',
  cart: '🛒',
  shopping: '🛍️',
  bag: '👜',
  train: '🚇',
  bus: '🚌',
  car: '🚗',
  taxi: '🚕',
  plane: '✈️',
  home: '🏠',
  house: '🏡',
  play: '🎮',
  game: '🕹️',
  movie: '🎬',
  music: '🎵',
  medical: '💊',
  health: '🏥',
  book: '📚',
  study: '📖',
  gift: '🎁',
  phone: '📱',
  digital: '💻',
  paw: '🐾',
  pet: '🐱',
  wallet: '💰',
  salary: '💼',
  bonus: '🏆',
  invest: '📈',
  receipt: '🧾',
  redpacket: '🧧',
  sport: '🏃',
  travel: '🧳',
  beauty: '💄',
  clothes: '👗',
  baby: '🧸',
  box: '📦'
}

const CATEGORY_COLOR = {
  bowl: '#e87ba4',
  food: '#f08a4b',
  coffee: '#b07a5a',
  cart: '#2a78d6',
  shopping: '#d05a9a',
  train: '#2f7d6d',
  bus: '#4e9b8c',
  car: '#6250d6',
  plane: '#3c8fd9',
  home: '#b47a45',
  play: '#7c5bd6',
  medical: '#d84b60',
  book: '#4b7bd8',
  gift: '#e86193',
  phone: '#4f6d8c',
  paw: '#c47a45',
  wallet: '#2f9d7a',
  salary: '#32a36b',
  invest: '#2a78d6',
  receipt: '#8a6d5b',
  redpacket: '#d63c4c',
  default: '#c9bbc1'
}

export function pad2(value) {
  return String(value).padStart(2, '0')
}

export function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`
}

export function monthRange(key = monthKey()) {
  const parts = String(key).split('-').map(Number)
  const year = parts[0]
  const month = parts[1]
  const lastDay = new Date(year, month, 0).getDate()
  return {
    from: `${year}-${pad2(month)}-01`,
    to: `${year}-${pad2(month)}-${pad2(lastDay)}`
  }
}

export function shiftMonth(key, delta) {
  const parts = String(key).split('-').map(Number)
  const date = new Date(parts[0], parts[1] - 1 + delta, 1)
  return monthKey(date)
}

export function monthLabel(key = monthKey()) {
  const parts = String(key).split('-')
  return `${parts[0]}年${Number(parts[1])}月`
}

export function yearLabel(key = monthKey()) {
  return `${String(key).split('-')[0]}年`
}

export function money(cents) {
  const value = Math.abs(Number(cents) || 0) / 100
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function signedMoney(cents, type) {
  return `${type === 'income' ? '+' : '-'}¥${money(cents)}`
}

export function dateLabel(key) {
  if (!key) return ''
  const today = todayKey()
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = todayKey(yesterdayDate)
  if (key === today) return '今天'
  if (key === yesterday) return '昨天'

  const date = new Date(`${key}T00:00:00`)
  if (Number.isNaN(date.getTime())) return key
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export function weekdayLabel(key) {
  const date = new Date(`${key}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return WEEKDAYS[date.getDay()]
}

export function dateTimeLabel(createdAt) {
  if (!createdAt) return ''
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function registeredLabel(createdAt) {
  if (!createdAt) return '刚刚加入'
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '刚刚加入'
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日加入`
}

export function categoryEmoji(icon, name) {
  if (icon && CATEGORY_EMOJI[String(icon).toLowerCase()]) {
    return CATEGORY_EMOJI[String(icon).toLowerCase()]
  }
  const text = String(name || '')
  if (/餐|饭|食|早餐|午餐|晚餐|外卖/.test(text)) return '🍜'
  if (/咖啡|奶茶|饮/.test(text)) return '☕'
  if (/交通|地铁|公交|打车|车/.test(text)) return '🚇'
  if (/购物|超市|日用/.test(text)) return '🛒'
  if (/住|房|租/.test(text)) return '🏠'
  if (/玩|娱乐|游戏/.test(text)) return '🎮'
  if (/医|药|健康/.test(text)) return '💊'
  if (/书|学习|教育/.test(text)) return '📚'
  if (/礼|人情/.test(text)) return '🎁'
  if (/工资|薪/.test(text)) return '💼'
  if (/奖|奖金/.test(text)) return '🏆'
  if (/理财|投资|基金/.test(text)) return '📈'
  if (/红包/.test(text)) return '🧧'
  if (/宠物|猫|狗/.test(text)) return '🐾'
  if (/通讯|话费|手机/.test(text)) return '📱'
  return '📦'
}

export function categoryColor(category, index = 0) {
  if (category && category.color) return category.color
  const icon = category && category.icon ? String(category.icon).toLowerCase() : ''
  if (CATEGORY_COLOR[icon]) return CATEGORY_COLOR[icon]
  return CHART_COLORS[index % CHART_COLORS.length]
}

export function groupByDate(transactions) {
  const groups = []
  const map = {}
  const sorted = [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return (b.createdAt || 0) - (a.createdAt || 0)
  })

  sorted.forEach((item) => {
    if (!map[item.date]) {
      map[item.date] = {
        date: item.date,
        label: dateLabel(item.date),
        weekday: weekdayLabel(item.date),
        items: [],
        expenseCents: 0,
        incomeCents: 0
      }
      groups.push(map[item.date])
    }
    const group = map[item.date]
    group.items.push(item)
    if (item.type === 'income') group.incomeCents += item.amountCents
    else group.expenseCents += item.amountCents
  })
  return groups
}

export function safeError(error) {
  if (!error) return '操作失败，请稍后再试'
  return error.message || '操作失败，请稍后再试'
}

export function clampPercent(value) {
  const number = Number(value)
  if (Number.isNaN(number)) return 0
  return Math.max(0, Math.min(100, number))
}
