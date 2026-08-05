/**
 * Cloudflare Worker - Zepp Life API 代理
 *
 * 部署方式：
 * 1. npm install -g wrangler
 * 2. wrangler login
 * 3. wrangler deploy worker/index.js
 * 4. 将 Worker URL 配置到前端的 VITE_API_BASE 环境变量
 *
 * 或使用 Vercel/Netlify 的 rewrites 规则做同样代理。
 */

const API_HOSTS = {
  user: 'https://api-user.huami.com',
  app: 'https://app-api.huami.com',
}

export default {
  async fetch(request, env, ctx) {
    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() })
    }

    const url = new URL(request.url)
    const path = url.pathname.replace(/^\/api/, '')

    // 路由到对应主机
    let targetHost = API_HOSTS.app
    if (path.startsWith('/registrations')) {
      targetHost = API_HOSTS.user
    }

    const targetUrl = targetHost + path + (url.search || '')

    // 转发请求
    const headers = new Headers(request.headers)
    headers.delete('host')
    headers.set('Content-Type', 'application/x-www-form-urlencoded')

    const body = request.method !== 'GET' ? await request.text() : undefined

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    })

    // 返回响应并附加 CORS 头
    const result = new Response(response.body, {
      status: response.status,
      headers: {
        ...corsHeaders(),
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    })

    return result
  },
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id, X-Forwarded-For',
  }
}
