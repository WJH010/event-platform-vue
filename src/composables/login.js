import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { userLogin, getUserInfo } from '../api/user'
import { useUserStore } from '../store/user'
import { useRouter } from 'vue-router'

export function useLogin() {
  const router = useRouter()
  const userStore = useUserStore()
  
  const loginForm = reactive({
    phone_number: '',
    password: ''
  })

  const handleLogin = async () => {
    // 表单校验
    if (!loginForm.phone_number) {
      ElMessage.warning('请输入手机号')
      return
    }
    if (!/^1[3-9]\d{9}$/.test(loginForm.phone_number)) {
      ElMessage.warning('手机号格式错误')
      return
    }
    if (!loginForm.password) {
      ElMessage.warning('请输入密码')
      return
    }

    try {
      // 1. 登录获取双Token
      const loginRes = await userLogin(loginForm)
      const { access_token, refresh_token } = loginRes.data
      userStore.setToken({ access_token, refresh_token })

      // 2. 获取用户信息
      const infoRes = await getUserInfo()
      userStore.setUserInfo(infoRes.data)

      ElMessage.success('登录成功')
      router.push('/home')
    } catch (error) {
      console.error('登录失败：', error)
    }
  }

  return { loginForm, handleLogin }
}