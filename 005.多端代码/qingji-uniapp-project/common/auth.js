import { request, clearLocalSession } from './request'
import { STORAGE_KEYS } from './config'

export function currentUser() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEYS.user)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    return null
  }
}

function saveUser(user) {
  if (!user) {
    uni.removeStorageSync(STORAGE_KEYS.user)
    return
  }
  uni.setStorageSync(STORAGE_KEYS.user, JSON.stringify({
    id: user.id,
    username: user.username,
    createdAt: user.createdAt
  }))
}

export async function me() {
  try {
    const user = await request('/api/auth/me', { skipAuthRedirect: true })
    saveUser(user)
    return user
  } catch (error) {
    if (error.statusCode === 401) {
      clearLocalSession()
      return null
    }
    throw error
  }
}

export async function login(username, password) {
  const user = await request('/api/auth/login', {
    method: 'POST',
    skipAuthRedirect: true,
    data: { username, password }
  })
  saveUser(user)
  return user
}

export async function register(username, password) {
  const result = await request('/api/auth/register', {
    method: 'POST',
    skipAuthRedirect: true,
    data: { username, password }
  })
  if (result && result.user) saveUser(result.user)
  return result
}

export async function recover(username, recoveryCode, newPassword) {
  return request('/api/auth/recover', {
    method: 'POST',
    skipAuthRedirect: true,
    data: { username, recoveryCode, newPassword }
  })
}

export async function changePassword(currentPassword, newPassword) {
  return request('/api/auth/password', {
    method: 'POST',
    data: { currentPassword, newPassword }
  })
}

export async function logout() {
  try {
    await request('/api/auth/logout', {
      method: 'POST',
      skipAuthRedirect: true
    })
  } catch (error) {
    // 网络异常也允许本地退出
  }
  clearLocalSession()
}

/**
 * 受保护页面使用：优先读公开缓存，没有缓存时向后端验证一次。
 */
export async function requireUser() {
  const cached = currentUser()
  if (cached) return cached
  const user = await me()
  if (user) return user
  uni.reLaunch({ url: '/pages/login/login' })
  return null
}

export function goLogin() {
  uni.reLaunch({ url: '/pages/login/login' })
}
