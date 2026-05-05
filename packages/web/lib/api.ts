import axios from 'axios'
import Cookies from 'js-cookie'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

export const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = Cookies.get('refresh_token')
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
          const newToken = data.data.accessToken
          Cookies.set('access_token', newToken, { expires: 1 / 3 }) // 8h
          original.headers.Authorization = `Bearer ${newToken}`
          return api(original)
        } catch {
          clearTokens()
          window.location.href = '/login'
        }
      } else {
        clearTokens()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

export function setTokens(accessToken: string, refreshToken: string) {
  Cookies.set('access_token', accessToken, { expires: 1 / 3 })
  Cookies.set('refresh_token', refreshToken, { expires: 7 })
}

export function clearTokens() {
  Cookies.remove('access_token')
  Cookies.remove('refresh_token')
  Cookies.remove('auth_user')
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null
  const raw = Cookies.get('auth_user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
