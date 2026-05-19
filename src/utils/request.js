import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../store/user'
import router from '../router'

const BASE_URL = '/api'
const service = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  // ✅ 关键修复：让所有HTTP状态码都进入成功回调，方便统一解析后端业务错误
  validateStatus: () => true
})

// ==================== 请求拦截器（携带Bearer Token）====================
service.interceptors.request.use(config => {
  const userStore = useUserStore()
  if (userStore.access_token) {
    config.headers.Authorization = `Bearer ${userStore.access_token}`
  }
  return config
})

// ==================== 响应拦截器（统一异常处理）====================
let refreshingPromise = null

service.interceptors.response.use(
  (response) => {
    const res = response.data
    // 后端成功：code = 200
    if (res.code === 200) {
      return res
    }

    // ==================== 后端业务异常（非200）====================
    console.error(`【接口异常】requestId: ${res.requestId} | 错误码: ${res.code} | 信息: ${res.message}`)
    
    // 1. Token过期/无效（401/40101/40002）
    if (res.code === 401 || res.code === 40101 || res.code === 40002) {
      const userStore = useUserStore()
      // 如果 refresh_token 本身就不存在，或正在刷新，则直接跳转登录页
      if (!userStore.refresh_token || refreshingPromise) {
        userStore.logout()
        router.push('/login')
        ElMessage.warning('登录已过期，请重新登录')
        return Promise.reject(new Error('Token expired or invalid'))
      }
      return handleRefreshToken(response.config)
    }

    // 2. 其他业务错误（密码错误/参数错误等）：直接显示后端返回的message
    ElMessage.error({
      message: res.message || '操作失败',
      duration: 3000
    })
    return Promise.reject(res)
  },
  // ==================== 真正的网络异常（跨域/后端宕机等）====================
  (error) => {
    console.error('【网络异常】', error)
    // 区分两种情况：
    // 1. 后端返回了响应，但解析失败（极少）
    // 2. 完全无响应（跨域/后端宕机）
    ElMessage.error({
      message: '网络请求失败，请检查后端服务',
      duration: 3000
    })
    return Promise.reject(error)
  }
)

// ==================== 自动刷新Token（修复版）====================
async function handleRefreshToken(originalRequest) {
  const userStore = useUserStore()

  // 关键修复：如果 refresh_token 本身就不存在，直接登出
  if (!userStore.refresh_token) {
    userStore.logout()
    router.push('/login')
    ElMessage.warning('登录已过期，请重新登录')
    return Promise.reject(new Error('No refresh_token'))
  }

  try {
    if (!refreshingPromise) {
      refreshingPromise = axios.post(`${BASE_URL}/users/refresh-token`, {
        refresh_token: userStore.refresh_token
      })
    }

    const res = await refreshingPromise
    refreshingPromise = null
    // 兼容刷新接口的响应格式
    if (res.data.code !== 200) {
      throw new Error(res.data.message || '刷新Token失败')
    }
    // ✅ 兼容后端返回data为数组的情况
    const { access_token, refresh_token } = Array.isArray(res.data.data) ? res.data.data[0] : res.data.data

    // 存储新Token
    userStore.setToken({ access_token, refresh_token })

    // 重试请求
    originalRequest.headers.Authorization = `Bearer ${access_token}`
    return service(originalRequest)
  } catch (e) {
    // 刷新Token失败：强制登出
    refreshingPromise = null
    userStore.logout()
    router.push('/login')
    ElMessage.warning('登录已过期，请重新登录')
    return Promise.reject(e)
  }
}

export default service