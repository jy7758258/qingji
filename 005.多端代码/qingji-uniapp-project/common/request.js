import { API_BASE_URL, STORAGE_KEYS } from './config'

function isH5() {
  // #ifdef H5
  return true
  // #endif
  return false
}

function readCookie() {
  try {
    return uni.getStorageSync(STORAGE_KEYS.cookie) || ''
  } catch (error) {
    return ''
  }
}

function saveCookie(cookie) {
  try {
    if (cookie) {
      uni.setStorageSync(STORAGE_KEYS.cookie, cookie)
    } else {
      uni.removeStorageSync(STORAGE_KEYS.cookie)
    }
  } catch (error) {
    // 缓存失败不阻断业务
  }
}

/**
 * uni.request 在 App / 小程序端不会像浏览器一样自动管理 Cookie。
 * 登录成功后从 Set-Cookie 中取出 QJ_SESSION，后续请求手动带上。
 */
function absorbSetCookie(header) {
  if (!header) return
  const raw = header['Set-Cookie']
    || header['set-cookie']
    || header['SET-COOKIE']
    || header['Set-cookie']
  if (!raw) return

  const list = Array.isArray(raw) ? raw : String(raw).split(/,(?=\s*[^;,]+=)/)
  let nextCookie = readCookie()

  list.forEach((item) => {
    const value = String(item || '')
    const matched = /(?:^|;\s*)QJ_SESSION=([^;,\s]*)/.exec(value)
    if (!matched) return
    const token = matched[1]
    const expired = !token || /max-age\s*=\s*0/i.test(value)
    nextCookie = expired ? '' : `QJ_SESSION=${token}`
  })

  saveCookie(nextCookie)
}

function errorMessage(statusCode, data) {
  if (data && data.error && data.error.message) return data.error.message
  if (statusCode === 401) return '登录已过期，请重新登录'
  if (statusCode === 429) return '尝试次数过多，请稍后再试'
  if (statusCode >= 500) return '服务暂时不可用，请稍后再试'
  return `请求失败（${statusCode}）`
}

function redirectToLogin() {
  try {
    uni.removeStorageSync(STORAGE_KEYS.user)
    uni.removeStorageSync(STORAGE_KEYS.cookie)
  } catch (error) {
    // ignore
  }
  const pages = getCurrentPages ? getCurrentPages() : []
  const current = pages.length ? pages[pages.length - 1].route : ''
  if (current === 'pages/login/login') return
  uni.reLaunch({ url: '/pages/login/login' })
}

/**
 * @param {string} path
 * @param {object} options { method, data, header, skipAuthRedirect }
 */
export function request(path, options = {}) {
  const header = Object.assign({
    'Content-Type': 'application/json'
  }, options.header || {})

  if (!isH5()) {
    const cookie = readCookie()
    if (cookie) header.Cookie = cookie
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method: options.method || 'GET',
      data: options.data,
      header,
      // H5 由浏览器管理 HttpOnly Cookie；App / 小程序不使用该参数
      // #ifdef H5
      withCredentials: true,
      // #endif
      success(res) {
        absorbSetCookie(res.header)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
          return
        }
        if (res.statusCode === 401 && !options.skipAuthRedirect) {
          redirectToLogin()
        }
        reject({
          statusCode: res.statusCode,
          code: res.data && res.data.error ? res.data.error.code : 'request_failed',
          message: errorMessage(res.statusCode, res.data)
        })
      },
      fail(error) {
        reject({
          statusCode: 0,
          code: 'network_error',
          message: '网络连接失败，请检查后端地址与网络',
          detail: error
        })
      }
    })
  })
}

export function clearLocalSession() {
  saveCookie('')
  try {
    uni.removeStorageSync(STORAGE_KEYS.user)
  } catch (error) {
    // ignore
  }
}
