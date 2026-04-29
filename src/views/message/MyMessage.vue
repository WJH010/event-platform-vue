<template>
  <div class="my-message-page">
    <div class="page-header">
      <h2>我的消息</h2>
      <el-button 
        type="primary" 
        size="small" 
        @click="handleMarkAllRead"
        :disabled="!globalHasUnread"
      >
        一键已读
      </el-button>
    </div>

    <!-- 仅保留：系统消息 + 分组消息 筛选 -->
    <div class="search-card">
      <el-radio-group v-model="queryParams.type_code" @change="getList">
        <el-radio label="SYSTEM">系统消息</el-radio>
        <el-radio label="GROUP">分组消息</el-radio>
      </el-radio-group>
    </div>

    <!-- 消息群组列表 -->
    <div class="list-card" v-loading="loading">
      <div 
        class="group-item" 
        v-for="item in groupList" 
        :key="item.msg_group_id"
        @click="toDetail(item.msg_group_id)"
      >
        <div class="group-head">
          <span class="group-name">{{ item.group_name }}</span>
          <el-badge :is-dot="item.has_unread === 'Y'" />
          <span class="count">{{ item.member_count }}人</span>
        </div>
        <div class="latest-content" v-html="item.latest_content"></div>
        <div class="time">{{ item.latest_send_time }}</div>
      </div>

      <el-empty v-if="!loading && groupList.length === 0" description="暂无消息群组" />
    </div>

    <!-- 分页 -->
    <el-pagination
      v-model:current-page="queryParams.page"
      v-model:page-size="queryParams.page_size"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="getList"
      @current-change="getList"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getUserMessageGroups, hasUnreadMessages, markAllAsRead } from '../../api/message'

const router = useRouter()
const loading = ref(false)
const globalHasUnread = ref(false)

// 查询参数：默认加载系统消息
const queryParams = reactive({
  page: 1,
  page_size: 10,
  type_code: 'SYSTEM'
})

const groupList = ref([])
const total = ref(0)

// 获取列表
const getList = async () => {
  loading.value = true
  try {
    const res = await getUserMessageGroups(queryParams)
    groupList.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (e) {
    ElMessage.error('获取消息群组失败')
    console.error('接口错误:', e)
  } finally {
    loading.value = false
  }
}

// 获取全局未读状态
const getUnreadStatus = async () => {
  try {
    const res = await hasUnreadMessages()
    globalHasUnread.value = res.data.hasUnread === 'Y'
  } catch (e) {
    console.error('获取未读状态失败:', e)
  }
}

// 一键已读
const handleMarkAllRead = async () => {
  try {
    await markAllAsRead()
    ElMessage.success('已标记所有消息为已读')
    getUnreadStatus()
    getList()
  } catch (e) {
    ElMessage.error('操作失败')
    console.error('接口错误:', e)
  }
}

// 跳转群组详情
const toDetail = (id) => {
  router.push(`/my-message/group/${id}`)
}

onMounted(() => {
  getList()
  getUnreadStatus()
})
</script>

<style scoped>
.my-message-page { padding: 20px; }
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px;
}
.search-card {
  background: #fff; border-radius: 8px; padding: 15px 20px;
  margin-bottom: 20px;
}
.list-card {
  background: #fff; border-radius: 8px; padding: 20px;
  margin-bottom: 20px;
}
.group-item {
  padding: 15px; border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background 0.2s;
}
.group-item:hover {
  background-color: #f5f7fa;
}
.group-item:last-child { border-bottom: none; }
.group-head {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 8px;
}
.group-name { font-size: 16px; font-weight: 500; }
.count { font-size: 12px; color: #999; }
.latest-content {
  color: #666; font-size: 14px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  margin-bottom: 5px;
}
.time { font-size: 12px; color: #999; }
</style>