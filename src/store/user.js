import { defineStore } from 'pinia'
import { getUserInfo as getUserInfoApi } from '../api/user'

export const useUserStore = defineStore('user', {
  state: () => ({
    // 双Token
    access_token: localStorage.getItem('access_token') || '',
    refresh_token: localStorage.getItem('refresh_token') || '',
    // 用户信息
    userInfo: {},
    // 角色权限 SUPERADMIN/ADMIN/USER
    role: ''
  }),
  actions: {
    // 存储双Token
    setToken({ access_token, refresh_token }) {
      this.access_token = access_token
      this.refresh_token = refresh_token
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
    },
    // 存储用户信息+角色
    setUserInfo(info) {
      this.userInfo = info
      this.role = info.role
    },
    // 退出登录（清空所有状态）
    logout() {
      this.access_token = ''
      this.refresh_token = ''
      this.userInfo = {}
      this.role = ''
      localStorage.clear()
    },
    // 从后端获取最新用户信息
    async getUserInfo() {
      try {
        const res = await getUserInfoApi()
        this.setUserInfo(res.data)
        return res.data
      } catch (error) {
        console.error('Failed to get user info from server:', error)
        // 让调用方知道这里出错了
        throw error
      }
    }
  }
})