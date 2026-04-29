<template>
  <div class="chat-group-list-container">
    <div class="top-bar">
      <el-button type="primary" @click="goToCreate">创建群聊</el-button>
    </div>
    <el-card>
      <el-table :data="groupList" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80"></el-table-column>
        <el-table-column prop="group_name" label="群聊名称"></el-table-column>
        <el-table-column prop="desc" label="群聊描述"></el-table-column>
        <el-table-column prop="owner_id" label="群主ID"></el-table-column>
        <el-table-column prop="create_time" label="创建时间">
          <template #default="scope">
            {{ formatTime(scope.row.create_time) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280">
          <template #default="scope">
            <el-button size="small" @click="viewMembers(scope.row.id)">成员列表</el-button>
            <el-button size="small" type="info" @click="openHistoryDialog(scope.row)">聊天记录</el-button>
            <el-button size="small" type="danger" @click="deleteGroup(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        class="pagination"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="pagination.page"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="pagination.pageSize"
        layout="total, sizes, prev, pager, next, jumper"
        :total="pagination.total"
      ></el-pagination>
    </el-card>

    <!-- 聊天记录弹窗 -->
    <el-dialog v-model="historyDialogVisible" :title="`'${activeGroup?.group_name}'的聊天记录`" width="800px" @close="resetHistory">
      <div class="history-search-form">
        <el-form :model="historySearchQuery" :inline="true" @submit.prevent="handleHistorySearch">
          <el-form-item label="日期范围">
            <el-date-picker
              v-model="historySearchQuery.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 240px;"
            />
          </el-form-item>
          <el-form-item label="内容">
            <el-input v-model="historySearchQuery.content" placeholder="搜索消息内容" clearable />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleHistorySearch">搜索</el-button>
            <el-button @click="resetHistorySearch">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
      <div v-loading="historyLoading" class="history-dialog-body">
        <div v-if="historyMessages.length > 0">
          <div v-for="message in historyMessages" :key="message.message_id" class="message-item">
            <el-avatar :src="message.sender_avatar" class="sender-avatar"></el-avatar>
            <div class="message-content">
              <div class="message-header">
                <span class="sender-name">{{ message.sender_name }} (ID: {{ message.sender_id }})</span>
                <span class="message-time">{{ formatTime(message.create_time) }}</span>
              </div>
              <div class="message-body">
                {{ message.content }}
              </div>
            </div>
          </div>
          <div class="load-more-container" v-if="hasMoreHistory">
            <el-button @click="loadMoreHistory" :loading="historyLoading">加载更多</el-button>
          </div>
        </div>
        <el-empty v-else description="暂无聊天记录" />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="historyDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getAllGroups, deleteGroup as deleteGroupApi, getGroupMessages } from '@/api/chat'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const groupList = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const fetchGroupList = async () => {
  loading.value = true
  try {
    const res = await getAllGroups({
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    groupList.value = res.data.list
    pagination.total = res.data.total
  } catch (error) {
    console.error('获取群聊列表失败:', error)
    ElMessage.error('获取群聊列表失败')
  } finally {
    loading.value = false
  }
}

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date.toLocaleString()
}

const goToCreate = () => {
  router.push('/chat-groups/create')
}

const viewMembers = (groupId) => {
  router.push(`/chat-groups/detail/${groupId}`)
}

const openHistoryDialog = (group) => {
  historyDialogVisible.value = true
  activeGroup.value = group
  fetchHistory()
}

const deleteGroup = (groupId) => {
  ElMessageBox.confirm('确定要删除这个群聊吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteGroupApi(groupId)
      ElMessage.success('删除成功')
      // 重新获取列表，刷新页面
      fetchGroupList()
    } catch (error) {
      console.error('删除群聊失败:', error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {
    // 用户取消删除
  });
}

const handleSizeChange = (val) => {
  pagination.pageSize = val
  fetchGroupList()
}

const handleCurrentChange = (val) => {
  pagination.page = val
  fetchGroupList()
}

onMounted(() => {
  fetchGroupList()
})

// --- 聊天记录弹窗相关 ---
const historyDialogVisible = ref(false)
const historyLoading = ref(false)
const activeGroup = ref(null)
const historyMessages = ref([])
const historyPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})
const historySearchQuery = reactive({
  dateRange: [],
  content: ''
})

const hasMoreHistory = computed(() => {
  return historyMessages.value.length < historyPagination.total
})

const fetchHistory = async () => {
  if (!activeGroup.value) return
  historyLoading.value = true
  try {
    const params = {
      page: historyPagination.page,
      pageSize: historyPagination.pageSize,
      content: historySearchQuery.content || null,
      start_date: historySearchQuery.dateRange?.[0] || null,
      end_date: historySearchQuery.dateRange?.[1] || null,
    }
    const res = await getGroupMessages(activeGroup.value.id, params)
    // 追加新消息而不是替换
    historyMessages.value.push(...res.data.list)
    historyPagination.total = res.data.total
  } catch (error) {
    console.error('获取聊天记录失败:', error)
    ElMessage.error('获取聊天记录失败')
  } finally {
    historyLoading.value = false
  }
}

const handleHistorySearch = () => {
  historyPagination.page = 1
  historyMessages.value = []
  historyPagination.total = 0
  fetchHistory()
}

const resetHistorySearch = () => {
  historySearchQuery.dateRange = []
  historySearchQuery.content = ''
  handleHistorySearch()
}

const loadMoreHistory = () => {
  historyPagination.page++
  fetchHistory()
}

const resetHistory = () => {
  historyMessages.value = []
  historyPagination.page = 1
  historyPagination.total = 0
  activeGroup.value = null
  historySearchQuery.dateRange = []
  historySearchQuery.content = ''
}
</script>

<style scoped>
.chat-group-list-container {
  padding: 20px;
}
.top-bar {
  margin-bottom: 20px;
}
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
.message-item {
  display: flex;
  margin-bottom: 20px;
}
.sender-avatar {
  margin-right: 15px;
}
.message-content {
  flex: 1;
}
.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.sender-name {
  font-weight: bold;
  color: #303133;
}
.message-time {
  font-size: 12px;
  color: #909399;
}
.message-body {
  background-color: #f4f4f5;
  padding: 10px;
  border-radius: 4px;
  word-break: break-all;
}
.history-dialog-body {
  max-height: 55vh;
  min-height: 300px;
  overflow-y: auto;
  padding: 0 10px;
  display: flex;
  flex-direction: column;
}
.history-search-form {
  padding: 0 10px 15px 10px;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 15px;
}
.load-more-container {
  text-align: center;
  margin-top: 15px;
  order: 1; /* Ensure load more button is at the bottom */
}

/* Custom Scrollbar Styles */
.history-dialog-body::-webkit-scrollbar {
  width: 6px;
}

.history-dialog-body::-webkit-scrollbar-track {
  background: transparent;
}

.history-dialog-body::-webkit-scrollbar-thumb {
  background: #dddee0;
  border-radius: 3px;
}

.history-dialog-body::-webkit-scrollbar-thumb:hover {
  background: #c7c9cc;
}
</style>