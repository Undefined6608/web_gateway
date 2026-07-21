import axios, { AxiosError } from 'axios'
import { APP_BASE_PATH } from '../config/app'
import type { ApiErrorBody, Endpoint, EndpointType, GatewaySystem, LoginResponse, Person, RevealedSystemAccount, SystemAccount } from '../types/api'

const TOKEN_KEY = 'gateway_access_token'
const USER_KEY = 'gateway_user'
const REVEAL_TOKEN_KEY = 'credentialRevealToken'
const REVEAL_EXPIRES_AT_KEY = 'credentialRevealExpiresAt'

export const credentialRevealSession = {
  token: () => {
    const token = sessionStorage.getItem(REVEAL_TOKEN_KEY)
    const expiresAt = Number(sessionStorage.getItem(REVEAL_EXPIRES_AT_KEY) || 0)
    if (!token || !expiresAt || expiresAt <= Date.now()) {
      sessionStorage.removeItem(REVEAL_TOKEN_KEY)
      sessionStorage.removeItem(REVEAL_EXPIRES_AT_KEY)
      return null
    }
    return token
  },
  save: (token: string, expiresIn: number) => {
    if (!token || expiresIn <= 0) return
    sessionStorage.setItem(REVEAL_TOKEN_KEY, token)
    sessionStorage.setItem(REVEAL_EXPIRES_AT_KEY, String(Date.now() + expiresIn * 1000))
  },
  clear: () => {
    sessionStorage.removeItem(REVEAL_TOKEN_KEY)
    sessionStorage.removeItem(REVEAL_EXPIRES_AT_KEY)
  },
}

credentialRevealSession.token()

export const auth = {
  token: () => sessionStorage.getItem(TOKEN_KEY),
  user: () => {
    try { return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null') as LoginResponse['user'] | null }
    catch { return null }
  },
  save: (data: LoginResponse) => {
    sessionStorage.setItem(TOKEN_KEY, data.access_token)
    sessionStorage.setItem(USER_KEY, JSON.stringify(data.user))
  },
  clear: () => {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
  },
}

const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || APP_BASE_PATH, timeout: 12000 })
client.interceptors.request.use((config) => {
  const token = auth.token()
  if (token && config.url?.startsWith('/api/admin/')) config.headers.Authorization = `Bearer ${token}`
  return config
})
client.interceptors.response.use((response) => response, (error: AxiosError<ApiErrorBody>) => {
  if (error.response?.status === 401 && error.config?.url?.startsWith('/api/admin/')) {
    auth.clear()
    window.dispatchEvent(new Event('gateway:unauthorized'))
  }
  return Promise.reject(error)
})

export function errorMessage(error: unknown) {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return '操作未完成，请稍后重试'
  const status = error.response?.status
  if (status === 429) return '检测过于频繁，请 10 秒后再试'
  if (status === 409) return '名称、账号或角色已存在'
  if (status === 423) return error.response?.data?.message || '账号已封禁，请 15 分钟后重试'
  if (status === 404) return '数据不存在，列表已刷新'
  if (status === 500) return '服务暂时不可用，请稍后重试'
  return error.response?.data?.message || (error.code === 'ECONNABORTED' ? '请求超时，请检查服务状态' : '无法连接到网关服务')
}

export const api = {
  login: (body: { username: string; password: string }) => client.post<LoginResponse>('/api/auth/login', body).then(r => r.data),
  logout: () => client.post('/api/admin/auth/logout').then(() => undefined),
  systems: (admin = false) => client.get<GatewaySystem[]>(admin ? '/api/admin/systems' : '/api/systems').then(r => r.data),
  revealAccounts: async (endpointId: number, credentials?: { username: string; password: string }) => {
    const jwt = auth.token()
    const revealToken = jwt ? null : credentialRevealSession.token()
    const headers: Record<string, string> = { 'Cache-Control': 'no-store' }
    let authentication: 'jwt' | 'temporary' | 'credentials'

    if (jwt) {
      headers.Authorization = `Bearer ${jwt}`
      authentication = 'jwt'
    } else if (revealToken) {
      headers['X-Credential-Reveal-Token'] = revealToken
      authentication = 'temporary'
    } else {
      if (!credentials) throw new Error('credential_reveal_authentication_required')
      authentication = 'credentials'
    }

    try {
      const response = await client.post<RevealedSystemAccount[]>(`/api/endpoints/${endpointId}/accounts/reveal`, credentials || {}, { headers })
      if (authentication === 'credentials') {
        const token = response.headers['x-credential-reveal-token']
        const expiresIn = Number(response.headers['x-credential-reveal-expires-in'] || 0)
        if (typeof token === 'string' && expiresIn > 0) credentialRevealSession.save(token, expiresIn)
      }
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        if (authentication === 'temporary') credentialRevealSession.clear()
        if (authentication === 'jwt') {
          auth.clear()
          window.dispatchEvent(new Event('gateway:unauthorized'))
        }
      }
      throw error
    }
  },
  checkEndpoint: (id: number) => client.post<Endpoint>(`/api/endpoints/${id}/check`).then(r => r.data),
  createSystem: (body: Partial<GatewaySystem>) => client.post<GatewaySystem>('/api/admin/systems', body).then(r => r.data),
  updateSystem: (id: number, body: Partial<GatewaySystem>) => client.put<GatewaySystem>(`/api/admin/systems/${id}`, body).then(r => r.data),
  deleteSystem: (id: number) => client.delete(`/api/admin/systems/${id}`).then(() => undefined),
  people: () => client.get<Person[]>('/api/admin/people').then(r => r.data),
  createPerson: (body: Partial<Person>) => client.post<Person>('/api/admin/people', body).then(r => r.data),
  updatePerson: (id: number, body: Partial<Person>) => client.put<Person>(`/api/admin/people/${id}`, body).then(r => r.data),
  deletePerson: (id: number) => client.delete(`/api/admin/people/${id}`).then(() => undefined),
  updateDevelopers: (id: number, body: Array<{ person_id: number; developer_type: string }>) => client.put<GatewaySystem>(`/api/admin/systems/${id}/developers`, body).then(r => r.data),
  accounts: (id: number) => client.get<SystemAccount[]>(`/api/admin/systems/${id}/accounts`).then(r => r.data),
  createAccount: (id: number, body: Partial<SystemAccount> & { password: string }) => client.post<SystemAccount>(`/api/admin/systems/${id}/accounts`, body).then(r => r.data),
  updateAccount: (systemId: number, accountId: number, body: Partial<SystemAccount> & { password: string | null }) => client.put<SystemAccount>(`/api/admin/systems/${systemId}/accounts/${accountId}`, body).then(r => r.data),
  deleteAccount: (systemId: number, accountId: number) => client.delete(`/api/admin/systems/${systemId}/accounts/${accountId}`).then(() => undefined),
  saveEndpoint: (id: number, body: { endpoint_type: EndpointType; url: string; requires_vpn: boolean; is_internal_network: boolean; is_public_network: boolean; remark: string | null }) => client.post<Endpoint>(`/api/admin/systems/${id}/endpoints`, body).then(r => r.data),
  deleteEndpoint: (systemId: number, endpointId: number) => client.delete(`/api/admin/systems/${systemId}/endpoints/${endpointId}`).then(() => undefined),
}
