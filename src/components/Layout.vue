<template>
  <div class="layout-container" id="app-layout-container">
    <!-- 侧边栏 -->
    <div class="sidebar">
      <div class="sidebar-logo">活动管理平台</div>
      <el-menu
        :default-active="route.path"
        class="el-menu-vertical"
        router
      >
        <!-- 控制台 -->
        <el-menu-item index="/home">
          <el-icon><HomeFilled /></el-icon>
          <span>控制台</span>
        </el-menu-item>
        <!-- 个人信息 -->
        <el-menu-item index="/user/info">
          <el-icon><User /></el-icon>
          <span>个人信息</span>
        </el-menu-item>

        <!-- 群聊 -->
        <el-menu-item index="/chat">
          <el-icon><ChatDotRound /></el-icon>
          <span>群聊</span>
        </el-menu-item>

        <!-- 消息中心 -->
        <el-sub-menu index="my-message-group">
          <template #title>
            <el-icon><Message /></el-icon>
            <span>消息中心</span>
          </template>
          <el-menu-item index="/my-message">我的消息</el-menu-item>
        </el-sub-menu>

        <!-- 活动中心 -->
        <el-sub-menu index="activity-center-group">
          <template #title>
            <el-icon><Flag /></el-icon>
            <span>活动中心</span>
          </template>
          <el-menu-item index="/activity-center">活动列表</el-menu-item>
          <el-menu-item index="/my-registrations">我的报名</el-menu-item>
        </el-sub-menu>

        <!-- 管理员菜单 -->
        <el-menu-item-group v-if="isAdmin">
          <!-- 文章管理 -->
          <el-menu-item index="/articles">
            <el-icon><Document /></el-icon>
            <span>文章管理</span>
          </el-menu-item>
          <!-- 活动管理 -->
          <el-menu-item index="/events">
            <el-icon><Calendar /></el-icon>
            <span>活动管理</span>
          </el-menu-item>
          <!-- 消息群组管理 -->
          <el-menu-item index="/message-groups">
            <el-icon><ChatDotRound /></el-icon>
            <span>消息群组管理</span>
          </el-menu-item>
          <!-- 群聊管理 -->
          <el-menu-item index="/chat-groups">
            <el-icon><ChatLineSquare /></el-icon>
            <span>群聊管理</span>
          </el-menu-item>
          <!-- Agent管理 -->
          <el-menu-item index="/llm-configs">
            <el-icon><Setting /></el-icon>
            <span>Agent管理</span>
          </el-menu-item>
        </el-menu-item-group>
      </el-menu>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <div class="top-bar">
        <div class="top-title">{{ route.meta.title || '控制台' }}</div>
        <div class="user-info">
          <img class="avatar" :src="userStore.userInfo.avatar_url || defaultCover" alt="头像">
          <span class="name" @click="toPage('/user/info')" style="cursor: pointer;">
            {{ userStore.userInfo.nickname || '管理员' }}
          </span>
          <span class="role-tag" :class="roleClass">{{ userStore.userInfo.role_name || '游客' }}</span>
          <button class="logout-btn" @click="handleLogout">退出</button>
        </div>
      </div>

      <div class="page-container">
        <router-view />
      </div>
    </div>
    <!-- AI 智能助手悬浮组件 -->
    <AgentAssistant />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../store/user'
import defaultCover from '../assets/images/default/Default_cover.png'
import { userLogout } from '../api/user'
import { HomeFilled, User, Document, Message, Calendar, ChatDotRound, Flag, ChatLineSquare, Setting } from '@element-plus/icons-vue'
import AgentAssistant from './AgentAssistant/index.vue'
// 仅引入外部CSS文件
import '../styles/layout.css'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const isAdmin = computed(() => {
  const role = userStore.role
  return role === 'SUPERADMIN' || role === 'ADMIN'
})

const roleClass = computed(() => {
  const role = userStore.role
  if (role === 'SUPERADMIN') return 'super-admin'
  if (role === 'ADMIN') return 'admin'
  return 'user'
})

const toPage = (path) => router.push(path)

const handleLogout = async () => {
  try {
    await userLogout()
    ElMessage.success('退出成功')
  } catch (e) {
    ElMessage.error('退出失败')
  } finally {
    userStore.logout()
    router.push('/login')
  }
}
</script>

<style>
#app-layout-container {
  height: 100%;
}

/* 移除 scoped，使用 ID 限定作用域 */
#app-layout-container .el-menu {
  border-right: none;
  /* 强制设置菜单背景色，覆盖默认的白色 */
  background-color: #304156;
}

/* 统一所有菜单项的颜色和悬浮效果 */
#app-layout-container .el-menu-item,
#app-layout-container .el-sub-menu__title {
  color: #bfcbd9;
}

#app-layout-container .el-menu-item:hover,
#app-layout-container .el-sub-menu__title:hover {
  background-color: #263445 !important;
  color: #fff !important;
}

/* 激活菜单项的样式 */
#app-layout-container .el-menu-item.is-active {
  color: #409EFF !important;
  background-color: #263445 !important;
}



/* 
  关键修复：
  由于 el-menu 的 popup 是挂载在 body 下的，
  我们需要一个全局选择器来修改它的样式。
*/
.el-menu--popup {
  background-color: #304156 !important;
}
.el-menu--popup .el-menu-item {
  color: #bfcbd9;
}
.el-menu--popup .el-menu-item:hover {
  background-color: #263445 !important;
  color: #fff !important;
}
.el-menu--popup .el-menu-item.is-active {
  color: #409EFF !important;
  background-color: #263445 !important;
}
</style>