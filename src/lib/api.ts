/**
 * Zepp Life（原小米运动）API 封装
 *
 * 登录流程（参考 mimotion / stepwong 开源项目）：
 * 1. 调用用户登录接口获取 access_token
 * 2. 用 access_token 换取 login_token
 * 3. 用 login_token 换取 app_token
 * 4. 用 app_token 提交步数数据
 *
 * 为了避免浏览器 CORS 问题，所有请求通过 Cloudflare Worker 代理转发。
 * 开发环境可直接配置 VITE_API_BASE 指向本地 worker 或第三方代理。
 */

import { generateDeviceId } from './crypto'

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE || '/api'

export interface ZeppTokens {
  access_token?: string
  login_token?: string
  app_token?: string
  user_id?: string
  device_id: string
}

export interface SubmitResult {
  success: boolean
  message: string
  steps: number
}

function timestamp(): string {
  return String(Date.now())
}

function randomIp(): string {
  return `${223}.${Math.floor(Math.random() * 54) + 64}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`
}

async function request(path: string, options: {
  method?: string
  headers?: Record<string, string>
  body?: unknown
  query?: Record<string, string>
} = {}) {
  const url = new URL(`${DEFAULT_API_BASE}${path}`)
  if (options.query) {
    Object.entries(options.query).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Request-Id': generateDeviceId(),
    'X-Forwarded-For': randomIp(),
    ...options.headers,
  }
  let body: string | undefined
  if (options.body) {
    body = new URLSearchParams(options.body as Record<string, string>).toString()
  }
  const res = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers,
    body,
  })
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text, status: res.status }
  }
}

/**
 * 第一步：用户登录，获取 access_token
 * 接口：https://api-user.huami.com/registrations/{user}/tokens
 */
async function login(username: string, password: string, deviceId: string): Promise<{
  access_token?: string
  error?: string
}> {
  const result = await request('/registrations/tokens', {
    method: 'POST',
    body: {
      client_id: 'HuaMi',
      password,
      request_id: deviceId,
      redirect_uri: 'https://s3.huami.com/oauth2/callback',
      token: 'access',
    },
    query: { client_id: 'HuaMi' },
  })
  if (result?.error) {
    return { error: typeof result.error === 'string' ? result.error : result.error_description || '登录失败' }
  }
  if (result?.access_token) {
    return { access_token: result.access_token }
  }
  // 部分接口返回 location header 中的 token
  if (typeof result?.raw === 'string' && result.raw.includes('access=')) {
    const match = result.raw.match(/access=([^&]+)/)
    if (match) return { access_token: match[1] }
  }
  return { error: '登录失败，请检查账号密码' }
}

/**
 * 第二步：用 access_token 换取 login_token 和 app_token
 * 接口：https://app-api.huami.com/v1/client/auth
 */
async function getAppToken(access_token: string, deviceId: string): Promise<{
  login_token?: string
  app_token?: string
  user_id?: string
  error?: string
}> {
  const result = await request('/v1/client/auth', {
    method: 'POST',
    body: {
      dn: deviceId,
      token: access_token,
      login_token: '',
      method: 'ali.mini.server.token.apply',
      source: 'com.xiaomi.hm.health',
    },
  })
  if (result?.error) {
    return { error: result.error }
  }
  return {
    login_token: result?.login_token,
    app_token: result?.app_token,
    user_id: result?.user_id,
  }
}

/**
 * 第三步：提交步数数据
 * 接口：https://app-api.huami.com/v1/data/band_data.json
 *
 * 数据需要按特定格式构造，包含 device info 和 step data
 */
async function submitSteps(
  app_token: string,
  user_id: string,
  steps: number,
  deviceId: string
): Promise<{ ok: boolean; message: string }> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10)
  const findDate = `${dateStr} 00:00:00`

  // 构造步数数据 payload
  const dataJson = JSON.stringify({
    data: [
      {
        did: deviceId,
        date: findDate,
        summary: '[]',
        step: steps,
      },
    ],
    typeid: 12,
    userid: user_id,
    device: {
      device_id: deviceId,
      device_type: 'android',
      firm_version: '1.0',
      platform_version: '9',
    },
    date_time: findDate,
  })

  const result = await request('/v1/data/band_data.json', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${app_token}`,
    },
    body: {
      userid: user_id,
      device_id: deviceId,
      date_time: findDate,
      data: dataJson,
      typeid: '12',
      request_id: deviceId,
      token: app_token,
      method: 'ali.mini.server.step.save',
    },
  })

  if (result?.code === 1 || result?.result === 'ok' || result?.message === 'success') {
    return { ok: true, message: '步数提交成功' }
  }
  // 部分接口返回的 code 为 200 或无 error 即为成功
  if (!result?.error && !result?.errors) {
    return { ok: true, message: '步数提交成功' }
  }
  return { ok: false, message: result?.message || result?.error || '提交失败' }
}

export class ZeppClient {
  private tokens: ZeppTokens
  private username: string
  private password: string

  constructor(username: string, password: string, tokens?: ZeppTokens) {
    this.username = username
    this.password = password
    this.tokens = tokens || { device_id: generateDeviceId() }
  }

  getTokens(): ZeppTokens {
    return { ...this.tokens }
  }

  /**
   * 完整刷步流程
   */
  async submitSteps(steps: number): Promise<SubmitResult> {
    try {
      // 如果有缓存的 app_token，先尝试直接提交
      if (this.tokens.app_token && this.tokens.user_id) {
        const r = await submitSteps(
          this.tokens.app_token,
          this.tokens.user_id,
          steps,
          this.tokens.device_id
        )
        if (r.ok) {
          return { success: true, message: r.message, steps }
        }
        // token 失效，清空后重新登录
        this.tokens.app_token = undefined
      }

      // 第一步：登录
      const loginResult = await login(this.username, this.password, this.tokens.device_id)
      if (loginResult.error || !loginResult.access_token) {
        return { success: false, message: loginResult.error || '登录失败', steps }
      }
      this.tokens.access_token = loginResult.access_token

      // 第二步：获取 app_token
      const tokenResult = await getAppToken(this.tokens.access_token, this.tokens.device_id)
      if (tokenResult.error || !tokenResult.app_token) {
        return { success: false, message: tokenResult.error || '获取授权失败', steps }
      }
      this.tokens.login_token = tokenResult.login_token
      this.tokens.app_token = tokenResult.app_token
      this.tokens.user_id = tokenResult.user_id

      // 第三步：提交步数
      const submitResult = await submitSteps(
        this.tokens.app_token,
        this.tokens.user_id!,
        steps,
        this.tokens.device_id
      )
      return {
        success: submitResult.ok,
        message: submitResult.message,
        steps,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '网络错误'
      return { success: false, message: msg, steps }
    }
  }
}
