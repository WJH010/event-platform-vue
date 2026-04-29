<template>
  <div class="dashboard-page">
    <!-- 欢迎横幅 -->
    <div class="welcome-banner">
      <div class="welcome-left">
        <h1>{{ greeting }}，{{ userStore.userInfo.nickname || '用户' }} 👋</h1>
        <p>{{ todayStr }} · <span class="role-tag">{{ roleLabel }}</span></p>
      </div>
      <div class="welcome-right">
        <div class="quick-nav">
          <div class="quick-item" @click="toPage('/articles')">
            <el-icon :size="20"><Document /></el-icon>
            <span>文章</span>
          </div>
          <div class="quick-item" @click="toPage('/activity-center')">
            <el-icon :size="20"><Calendar /></el-icon>
            <span>活动</span>
          </div>
          <div class="quick-item" @click="agentStore.openPanel()">
            <el-icon :size="20"><ChatDotRound /></el-icon>
            <span>AI助手</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-row">
      <div class="stat-card" style="--accent: #409EFF; --accent-bg: #ecf5ff">
        <div class="stat-icon"><el-icon :size="26"><Document /></el-icon></div>
        <div class="stat-detail">
          <div class="stat-value">{{ stats.articleCount }}</div>
          <div class="stat-label">文章总数</div>
        </div>
      </div>
      <div class="stat-card" style="--accent: #67C23A; --accent-bg: #f0f9eb">
        <div class="stat-icon"><el-icon :size="26"><Calendar /></el-icon></div>
        <div class="stat-detail">
          <div class="stat-value">{{ stats.eventCount }}</div>
          <div class="stat-label">活动总数</div>
        </div>
      </div>
      <div class="stat-card" style="--accent: #E6A23C; --accent-bg: #fdf6ec">
        <div class="stat-icon"><el-icon :size="26"><ChatDotRound /></el-icon></div>
        <div class="stat-detail">
          <div class="stat-value">{{ stats.sessionCount }}</div>
          <div class="stat-label">AI对话数</div>
        </div>
      </div>
      <div class="stat-card" v-if="isAdmin" style="--accent: #F56C6C; --accent-bg: #fef0f0">
        <div class="stat-icon"><el-icon :size="26"><Setting /></el-icon></div>
        <div class="stat-detail">
          <div class="stat-value">{{ stats.llmConfigCount }}</div>
          <div class="stat-label">LLM配置</div>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-grid">
      <!-- 最近活动 -->
      <div class="section-card">
        <div class="section-header">
          <div class="section-title">
            <span class="title-dot" style="background: #67C23A"></span>
            <h3>最近活动</h3>
          </div>
          <el-button type="primary" link @click="toPage('/activity-center')">查看全部 →</el-button>
        </div>
        <div class="section-body">
          <div v-if="recentEvents.length === 0" class="section-empty">暂无活动数据</div>
          <div v-else class="list-item" v-for="item in recentEvents" :key="item.id" @click="toPage(`/activity-center/detail/${item.id}`)">
            <img class="item-cover" :src="item.cover_image_url || defaultCover" alt="" />
            <div class="item-info">
              <div class="item-title">{{ item.title }}</div>
              <div class="item-meta">
                <span><el-icon><Calendar /></el-icon> {{ formatDate(item.event_start_time) }}</span>
                <span v-if="item.event_address"><el-icon><Location /></el-icon> {{ item.event_address }}</span>
              </div>
            </div>
            <el-tag size="small" :type="eventStatusType(item.status)">{{ eventStatusText(item.status) }}</el-tag>
          </div>
        </div>
      </div>

      <!-- 最近文章 -->
      <div class="section-card">
        <div class="section-header">
          <div class="section-title">
            <span class="title-dot" style="background: #409EFF"></span>
            <h3>最近文章</h3>
          </div>
          <el-button type="primary" link @click="toPage('/articles')">查看全部 →</el-button>
        </div>
        <div class="section-body">
          <div v-if="recentArticles.length === 0" class="section-empty">暂无文章数据</div>
          <div v-else class="list-item" v-for="item in recentArticles" :key="item.article_id" @click="toPage(`/articles/detail/${item.article_id}`)">
            <img class="item-cover" :src="item.cover_image_url || defaultCover" alt="" />
            <div class="item-info">
              <div class="item-title">{{ item.article_title }}</div>
              <div class="item-meta">
                <el-tag size="small" :type="item.article_type === 'POLICY' ? 'warning' : ''">{{ item.article_type === 'POLICY' ? '政策' : '新闻' }}</el-tag>
                <span v-if="item.release_time">{{ item.release_time }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import { Document, Calendar, ChatDotRound, Setting, Location } from '@element-plus/icons-vue'
import { getArticleList } from '../api/article'
import { getEventList } from '../api/event'
import { getSessionList } from '../api/agent'
import { getLlmConfigList } from '../api/llmConfig'
import { useAgentStore } from '../store/agent'
import defaultCover from '../assets/images/default/Default_cover.png'
import '../styles/home.css'

const router = useRouter()
const userStore = useUserStore()
const agentStore = useAgentStore()

const isAdmin = computed(() => {
  const role = userStore.role
  return role === 'SUPERADMIN' || role === 'ADMIN'
})

// 问候语
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const todayStr = new Date().toLocaleDateString('zh-CN', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
})

const roleLabel = computed(() => {
  const map = { SUPERADMIN: '超级管理员', ADMIN: '管理员', USER: '普通用户' }
  return map[userStore.role] || '用户'
})

// 统计数据
const stats = reactive({
  articleCount: 0,
  eventCount: 0,
  sessionCount: 0,
  llmConfigCount: 0
})

const recentArticles = ref([])
const recentEvents = ref([])

// 格式化日期
const formatDate = (str) => {
  if (!str) return ''
  const d = new Date(str)
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// 活动状态
const eventStatusText = (status) => {
  const map = { InProgress: '进行中', NotBegun: '未开始', Completed: '已结束' }
  return map[status] || status || '未知'
}
const eventStatusType = (status) => {
  const map = { InProgress: 'success', NotBegun: 'warning', Completed: 'info' }
  return map[status] || 'info'
}

const toPage = (path) => router.push(path)

// 加载数据
const fetchDashboard = async () => {
  try {
    const [articleRes, eventRes, sessionRes] = await Promise.allSettled([
      getArticleList({ page: 1, page_size: 5 }),
      getEventList({ page: 1, page_size: 5 }),
      getSessionList()
    ])

    if (articleRes.status === 'fulfilled') {
      stats.articleCount = articleRes.value.data?.total || 0
      recentArticles.value = articleRes.value.data?.list || []
    }
    if (eventRes.status === 'fulfilled') {
      stats.eventCount = eventRes.value.data?.total || 0
      recentEvents.value = eventRes.value.data?.list || []
    }
    if (sessionRes.status === 'fulfilled') {
      const sessions = sessionRes.value.data || []
      stats.sessionCount = Array.isArray(sessions) ? sessions.length : 0
    }
  } catch (e) {
    console.error('加载仪表盘数据失败:', e)
  }

  // 管理员额外加载LLM配置数
  if (isAdmin.value) {
    try {
      const res = await getLlmConfigList()
      const list = res.data || []
      stats.llmConfigCount = list.length
    } catch { /* ignore */ }
  }
}

onMounted(fetchDashboard)
</script>
