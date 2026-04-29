<template>
  <div class="login-page">
    <div class="login-card">
      <h2 class="login-title">后台管理系统</h2>
      
      <!-- 手机号输入框（带图标） -->
      <div class="login-item phone">
        <input
          v-model="loginForm.phone_number"
          type="text"
          class="login-input"
          placeholder="请输入手机号"
          maxlength="11"
        />
      </div>

      <!-- 密码输入框（带图标） -->
      <div class="login-item pwd">
        <input
          v-model="loginForm.password"
          type="password"
          class="login-input"
          placeholder="请输入密码"
        />
      </div>

      <!-- 登录按钮（带加载状态） -->
      <button 
        class="login-btn" 
        @click="handleLoginWithLoading"
        :disabled="loading"
      >
        {{ loading ? '登录中...' : '登录' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useLogin } from '../composables/login'
import '../styles/login.css'

// 引入登录逻辑
const { loginForm, handleLogin } = useLogin()
// 加载状态（防止重复点击）
const loading = ref(false)

// 包装登录方法，添加加载状态
const handleLoginWithLoading = async () => {
  loading.value = true
  try {
    await handleLogin()
  } finally {
    loading.value = false
  }
}
</script>