<template>
  <div class="user-event-detail-page" v-loading="loading">
    <!-- 1. 固定在顶部的操作栏 -->
    <div class="top-action-bar">
      <el-button @click="goBack">返回</el-button>
      <span class="title">活动详情</span>
    </div>

    <div v-if="eventDetail.title" class="detail-layout">
      <!-- 左侧详情区 -->
      <div class="left-panel">
        <el-card class="box-card">
          <div class="header-section">
            <div class="cover">
              <img :src="eventDetail.cover_image_url || defaultCover" alt="封面">
            </div>
            <div class="basic-info">
              <h1>{{ eventDetail.title }}</h1>
              <el-descriptions :column="1" border>
                <el-descriptions-item label-class-name="info-label" label="活动状态">
                  <el-tag :type="registrationStatus.type" effect="dark">{{ registrationStatus.text }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label-class-name="info-label" label="活动时间">{{ formatDate(eventDetail.event_start_time) }} 至 {{ formatDate(eventDetail.event_end_time) }}</el-descriptions-item>
                <el-descriptions-item label-class-name="info-label" label="报名时间">{{ formatDate(eventDetail.registration_start_time) }} 至 {{ formatDate(eventDetail.registration_end_time) }}</el-descriptions-item>
                <el-descriptions-item label-class-name="info-label" label="活动地点">{{ eventDetail.event_address }}</el-descriptions-item>
                <el-descriptions-item label-class-name="info-label" label="报名费用">
                  <span v-if="eventDetail.registration_fee > 0">{{ eventDetail.registration_fee }} 元</span>
                  <span v-else>免费</span>
                </el-descriptions-item>
                <el-descriptions-item label-class-name="info-label" label="报名人数">
                  <span>{{ eventDetail.current_registrants || 0 }} 人已报名</span>
                  <span v-if="eventDetail.max_registrants > 0" style="margin-left: 8px; color: #909399;">
                    （上限 {{ eventDetail.max_registrants }} 人，剩余 {{ eventDetail.remaining_quota ?? '不限' }} 名额）
                  </span>
                  <span v-else style="margin-left: 8px; color: #909399;">（不限人数）</span>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
          <div class="description-section">
            <h2>活动介绍</h2>
            <div style="border: 1px solid #ccc;">
              <Editor
                style="height: 500px; overflow-y: hidden;"
                v-model="eventDetail.detail"
                :defaultConfig="{ readOnly: true }"
              />
            </div>
          </div>
        </el-card>
      </div>

      <!-- 右侧报名区 -->
      <div class="right-panel">
        <el-card class="box-card user-info-card">
          <template #header>
            <div class="card-header">
              <span>报名信息确认</span>
              <div v-if="!isEditingUserInfo">
                <el-button class="button" type="primary" text @click="handleEditUserInfo" :disabled="isRegistered">修改个人信息</el-button>
              </div>
              <div v-else>
                <el-button class="button" type="primary" text @click="handleSaveUserInfo" :loading="isSavingUserInfo">保存</el-button>
                <el-button class="button" text @click="handleCancelEdit">取消</el-button>
              </div>
            </div>
          </template>
          
          <!-- 显示模式 -->
          <div v-if="!isEditingUserInfo">
            <div v-if="requiredUserInfo.length > 0">
              <el-descriptions :column="1" border>
                <el-descriptions-item v-for="item in requiredUserInfo" :key="item.label" :label="item.label">
                  <span v-if="item.value">{{ item.value }}</span>
                  <el-tag v-else type="warning" size="small">待完善</el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </div>
            <el-empty v-else description="该活动无需提供额外信息即可报名" />
          </div>

          <!-- 编辑模式 -->
          <div v-else>
            <el-form ref="userInfoFormRef" :model="editableUserInfo" label-width="100px">
              <el-form-item v-for="item in requiredUserInfo" :key="item.code" :label="item.label">
                <el-input v-model="editableUserInfo[item.code]" />
              </el-form-item>
            </el-form>
          </div>
        </el-card>

        <div class="action-button-container">
          <el-button 
            :type="actionButton.type" 
            size="large" 
            @click="handleActionClick"
            :disabled="actionButton.disabled"
            :loading="actionButton.loading"
            class="registration-button"
          >
            {{ actionButton.text }}
          </el-button>
          <el-button
            v-if="isRegistered"
            type="danger"
            size="large"
            @click="handleCancelRegistration"
            :loading="cancelLoading"
            class="cancel-button"
          >
            取消报名
          </el-button>
        </div>
      </div>
    </div>

    <el-empty v-else-if="!loading" description="活动不存在或已删除" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getEventDetail, isUserRegistered, registerForEvent, cancelRegistration } from '../../api/event'
import { updateUserInfo } from '../../api/user'
import { useUserStore } from '../../store/user'
import { Editor } from '@wangeditor/editor-for-vue'
import defaultCover from '../../assets/images/default/Default_cover.png'
import '@wangeditor/editor/dist/css/style.css'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const eventId = route.params.id

const loading = ref(true)
const eventDetail = ref({})
const isRegistered = ref(false)
const actionButton = reactive({ loading: false })

// 用户信息编辑相关
const isEditingUserInfo = ref(false)
const editableUserInfo = ref({})
const userInfoFormRef = ref(null)
const isSavingUserInfo = ref(false)
const cancelLoading = ref(false)


// --- 数据获取 ---
const fetchData = async () => {
  loading.value = true
  try {
    const detailRes = await getEventDetail(eventId)
    eventDetail.value = detailRes.data || {}
  } catch (e) {
    ElMessage.error('获取活动详情失败')
  }

  try {
    const statusRes = await isUserRegistered(eventId)
    // 后端返回 'Y' 或 'N'，需要做严格判断
    isRegistered.value = statusRes.data.is_registered === 'Y'
  } catch (e) {
    console.error('获取用户报名状态失败', e)
    // 发生错误时，假定用户未报名，以保证后续逻辑安全
    isRegistered.value = false
  } finally {
    loading.value = false
  }
}

// --- 动态数据计算 ---

// 1. 计算活动报名状态 (报名中/未开始/已结束)
const registrationStatus = computed(() => {
  if (!eventDetail.value.registration_start_time) return { text: '未知', type: 'info' }
  const now = new Date().getTime()
  const start = new Date(eventDetail.value.registration_start_time).getTime()
  const end = new Date(eventDetail.value.registration_end_time).getTime()

  if (now < start) return { text: '报名未开始', type: 'warning' }
  if (now > end) return { text: '报名已结束', type: 'info' }
  return { text: '正在报名', type: 'success' }
})

// 2. 根据活动要求，提取并格式化需要确认的用户信息
const requiredUserInfo = computed(() => {
  if (!eventDetail.value.user_info || !userStore.userInfo) return []
  
  return eventDetail.value.user_info.map(infoField => {
    const userValue = userStore.userInfo[infoField.code] || ''
    return {
      label: infoField.name,
      code: infoField.code,
      value: userValue,
    }
  })
})

// 3. 动态计算底部按钮的状态
Object.assign(actionButton, {
  text: computed(() => {
    if (isRegistered.value) return '已报名'
    if (registrationStatus.value.text !== '正在报名') return registrationStatus.value.text
    return '立即报名'
  }),
  type: computed(() => {
    if (isRegistered.value) return 'info' // 已报名时显示灰色
    return 'primary'
  }),
  disabled: computed(() => {
    // 如果已报名，或者报名未开始/已结束，则禁用按钮
    return isRegistered.value || registrationStatus.value.text !== '正在报名'
  })
})

// --- 事件处理 ---

const handleActionClick = () => {
  // 如果按钮被禁用，或者用户已报名，则不执行任何操作
  if (actionButton.disabled || isRegistered.value) {
    return
  }
  // 当前只剩下“立即报名”可以点击
  handleRegistration()
}

const handleRegistration = async () => {
  const missingInfo = requiredUserInfo.value.filter(item => !item.value)
  if (missingInfo.length > 0) {
    const missingLabels = missingInfo.map(item => item.label).join('、')
    ElMessageBox.confirm(
      `您需要先完善个人信息中的【${missingLabels}】才能报名，是否现在就去？`,
      '信息不完整',
      { confirmButtonText: '去完善', cancelButtonText: '取消', type: 'warning' }
    ).then(() => router.push('/user-info')).catch(() => {})
    return
  }

  const confirmMessage = requiredUserInfo.value
    .map(item => `<div><strong>${item.label}:</strong> ${item.value}</div>`)
    .join('')

  try {
    await ElMessageBox.confirm(
      `请确认以下报名信息：<br><br>${confirmMessage}`,
      '确认报名',
      { dangerouslyUseHTMLString: true, confirmButtonText: '确认提交', cancelButtonText: '取消' }
    )
    
    actionButton.loading = true
    const registrationData = requiredUserInfo.value.reduce((acc, item) => {
      acc[item.code] = item.value
      return acc
    }, {})

    await registerForEvent({ event_id: parseInt(eventId), ...registrationData })
    ElMessage.success('报名成功！')
    await fetchData()

  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.response?.data?.message || '报名失败')
  } finally {
    actionButton.loading = false
  }
}

const handleCancelRegistration = async () => {
  try {
    await ElMessageBox.confirm('您确定要取消报名吗？取消后如需再次报名需重新提交信息。', '提示', {
      confirmButtonText: '确定取消', cancelButtonText: '再想想', type: 'warning'
    })
    
    cancelLoading.value = true
    await cancelRegistration(eventId)
    ElMessage.success('已取消报名')
    await fetchData()

  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.response?.data?.message || '取消报名失败')
  } finally {
    cancelLoading.value = false
  }
}

const handleEditUserInfo = () => {
  // 从当前显示的数据填充表单
  editableUserInfo.value = requiredUserInfo.value.reduce((acc, item) => {
    acc[item.code] = item.value
    return acc
  }, {})
  isEditingUserInfo.value = true
}

const handleSaveUserInfo = async () => {
  isSavingUserInfo.value = true
  try {
    // 步骤1: 调用API更新后端数据
    await updateUserInfo(editableUserInfo.value)

    // 步骤2: 更新成功后，尝试刷新Pinia中的状态
    try {
      await userStore.getUserInfo()
      // 步骤3: 前后端都成功后，给出最终成功提示
      ElMessage.success('个人信息更新成功！')
      isEditingUserInfo.value = false
    } catch (storeError) {
      // 后端保存成功，但前端状态刷新失败
      console.error("User info saved, but failed to refresh the store:", storeError)
      ElMessage.warning('信息已保存，但页面自动刷新失败，请手动刷新。')
      isEditingUserInfo.value = false // 同样退出编辑模式
    }
  } catch (updateError) {
    // 后端保存直接失败
    console.error("Failed to save user info:", updateError)
    ElMessage.error('更新失败，请稍后重试')
  } finally {
    isSavingUserInfo.value = false
  }
}

const handleCancelEdit = () => {
  isEditingUserInfo.value = false
}

const goBack = () => router.back()

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}

onMounted(fetchData)
</script>

<style scoped>
.user-event-detail-page {
  background-color: #f0f2f5;
  min-height: 100vh;
}
.top-action-bar {
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,.08);
  z-index: 1000;
  border-bottom: 1px solid #f0f0f0;
}
.top-action-bar .title {
  font-size: 18px;
  font-weight: 600;
  margin-left: 16px;
}
.detail-layout {
  display: flex;
  gap: 20px;
  padding: 20px;
  align-items: flex-start;
}
.left-panel {
  flex: 1;
  min-width: 0;
}
.right-panel {
  width: 400px;
  flex-shrink: 0;
  position: sticky;
  top: 80px; /* 顶部操作栏高度 + 一些间距 */
}
.header-section {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}
.cover {
  width: 300px;
  flex-shrink: 0;
}
.cover img {
  width: 100%;
  height: auto;
  border-radius: 8px;
  object-fit: cover;
}
.basic-info {
  flex-grow: 1;
}
.basic-info h1 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 16px;
}
.description-section {
  margin-top: 20px;
}
.description-section h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}
.action-button-container {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  width: 100%;
  padding: 0; /* 移除任何可能的内边距 */
  box-sizing: border-box;
}
.action-button-container :deep(.el-button) {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 100% !important;
  box-sizing: border-box !important;
  margin: 0 !important; /* 确保没有外边距 */
  padding: 0 15px !important; /* 统一内边距 */
}
.el-descriptions-item__label.info-label {
  width: 100px;
  font-weight: bold;
}
</style>