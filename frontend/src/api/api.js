import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
})

/** 로그인·회원가입·세션 확인 등 401이 정상인 요청은 리다이렉트하지 않음 */
function shouldRedirect401OnUnauthorized(config) {
  const url = config?.url || ''
  return !(
    url.includes('/auth/me') ||
    url.includes('/auth/login') ||
    url.includes('/auth/register')
  )
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && shouldRedirect401OnUnauthorized(error.config)) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
