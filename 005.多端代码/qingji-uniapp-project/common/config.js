/**
 * 轻记多端 · 后端地址
 *
 * 本地调试：
 * - iOS 模拟器 / 微信开发者工具：http://127.0.0.1:8080
 * - Android 模拟器：http://10.0.2.2:8080
 * - 真机：改成电脑局域网 IP，例如 http://192.168.1.20:8080
 *
 * 正式环境必须是 HTTPS，并在微信公众平台配置 request 合法域名。
 */
export const API_BASE_URL = 'http://192.168.0.19:8080'

/** 本地缓存键，和 Web 端保持独立，避免调试数据互相覆盖 */
export const STORAGE_KEYS = {
  user: 'qingji_uniapp_user_v1',
  cookie: 'qingji_uniapp_cookie_v1',
  privacy: 'qingji_uniapp_privacy_v1',
  lastType: 'qingji_uniapp_last_type_v1',
  backupReminder: 'qingji_uniapp_backup_reminder_v1'
}
