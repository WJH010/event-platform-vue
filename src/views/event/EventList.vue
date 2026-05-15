<template>
  <div class="event-list-page">
    <div class="page-header">
      <h2>活动管理</h2>
    </div>

    <!-- 筛选栏 -->
    <div class="search-card">
      <el-form :model="queryParams" inline @submit.prevent="fetchEventList">
        <el-form-item label="活动标题">
          <el-input 
            v-model="queryParams.title" 
            placeholder="请输入活动标题" 
            clearable
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchEventList">搜索</el-button>
          <el-button @click="resetQuery">重置</el-button>
          <el-button type="success" @click="toCreate" v-if="isAdmin">创建活动</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 活动列表 -->
    <div class="list-card">
      <div class="event-grid" v-if="eventList.length > 0">
        <div class="event-item-card" v-for="item in eventList" :key="item.id">
          <div class="cover">
            <img :src="item.cover_image_url || defaultCover" alt="封面" @click="toEdit(item.id)" />
            <div class="status-tag">
              <el-tag v-if="item.status" :type="getStatusInfo(item.status).type" size="small">{{ getStatusInfo(item.status).text }}</el-tag>
            </div>
          </div>
          <div class="info">
            <h3 class="title" @click="toEdit(item.id)">{{ item.title }}</h3>
            <div class="meta">
              <div class="meta-item">
                <el-icon><Calendar /></el-icon>
                <span>{{ formatDate(item.event_start_time) }}</span>
              </div>
              <div class="meta-item">
                <el-icon><Location /></el-icon>
                <span>{{ item.event_address }}</span>
              </div>
              <div class="meta-item">
                <el-icon><User /></el-icon>
                <span>{{ item.current_registrants || 0 }} 人已报名</span>
              </div>
              <div class="meta-item" v-if="item.max_registrants > 0">
                <el-icon><User /></el-icon>
                <span>名额 {{ item.current_registrants || 0 }}/{{ item.max_registrants }}（剩余 {{ item.remaining_quota ?? '不限' }}）</span>
              </div>
            </div>
          </div>
          <div class="footer">
            <div class="operate">
              <el-button type="primary" size="small" @click="toEdit(item.id)">查看详情</el-button>
              <el-button type="success" size="small" @click="toGroupDetail(item.group_id)" v-if="item.group_id">管理群组</el-button>
              <el-button type="info" size="small" @click="viewRegistrants(item.id)">查看报名</el-button>
              <el-button type="warning" size="small" @click="toEdit(item.id)" v-if="isAdmin">编辑</el-button>
              <el-button type="danger" size="small" @click="handleDelete(item.id)" v-if="isAdmin">删除</el-button>
            </div>
          </div>
        </div>
      </div>
      <div class="empty" v-if="eventList.length === 0 && !loading">暂无数据</div>
    </div>

    <!-- 分页 -->
    <el-pagination
      v-model:current-page="queryParams.page"
      v-model:page-size="queryParams.page_size"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="fetchEventList"
      @current-change="fetchEventList"
    />

    <!-- 查看报名用户弹窗 -->
    <el-dialog v-model="registrantsDialogVisible" title="报名用户列表" width="60%">
      <el-table :data="registrantsList" v-loading="registrantsLoading">
        <el-table-column property="name" label="姓名" />
        <el-table-column property="phone_number" label="手机号" />
        <el-table-column property="email" label="邮箱" />
        <el-table-column property="unit" label="单位" />
        <el-table-column property="position" label="职位" />
      </el-table>
      <el-pagination
        v-model:current-page="registrantsParams.page"
        v-model:page-size="registrantsParams.page_size"
        :total="registrantsTotal"
        layout="total, prev, pager, next"
        @current-change="fetchRegistrants"
        style="margin-top: 20px; justify-content: flex-end;"
      />
      <template #footer>
        <el-button @click="registrantsDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../store/user'
import { getEventList, deleteEvent, getRegisteredUsers } from '../../api/event'
import { Calendar, Clock, Location, User } from '@element-plus/icons-vue'
import defaultCover from '../../assets/images/default/Default_cover.png'

const router = useRouter()
const userStore = useUserStore()

const isAdmin = ref(['SUPERADMIN', 'ADMIN'].includes(userStore.userInfo.role))
const loading = ref(false)
const eventList = ref([])
const total = ref(0)

// 报名用户弹窗相关
const registrantsDialogVisible = ref(false)
const registrantsLoading = ref(false)
const registrantsList = ref([])
const registrantsTotal = ref(0)
const currentEventId = ref(null)
const registrantsParams = reactive({
  page: 1,
  page_size: 10,
})


const queryParams = reactive({
  page: 1,
  page_size: 10,
  title: '',
})

const fetchEventList = async () => {
  try {
    loading.value = true
    const res = await getEventList(queryParams)
    eventList.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (e) {
    ElMessage.error('获取活动列表失败')
    eventList.value = []
  } finally {
    loading.value = false
  }
}

const resetQuery = () => {
  queryParams.title = ''
  fetchEventList()
}

const toEdit = (id) => {
  router.push(`/events/edit/${id}`)
}

const toGroupDetail = (groupId) => {
  if (!groupId) {
    ElMessage.warning('该活动没有关联的群组')
    return
  }
  router.push(`/message-groups/detail/${groupId}`)
}

const toCreate = () => {
  router.push('/events/create')
}

const viewRegistrants = (id) => {
  currentEventId.value = id
  registrantsDialogVisible.value = true
  registrantsParams.page = 1 // 重置到第一页
  fetchRegistrants()
}

// 获取报名用户列表
const fetchRegistrants = async () => {
  if (!currentEventId.value) return
  registrantsLoading.value = true
  try {
    const res = await getRegisteredUsers(currentEventId.value, registrantsParams)
    // 假设接口返回的数据结构是 { data: { list: [], total: 0 } }
    registrantsList.value = res.data.list || []
    registrantsTotal.value = res.data.total || 0
  } catch (error) {
    ElMessage.error('获取报名用户列表失败')
    registrantsList.value = []
    registrantsTotal.value = 0
  } finally {
    registrantsLoading.value = false
  }
}

const getStatusInfo = (status) => {
  switch (status) {
    case 'NotBegun':
      return { text: '未开始', type: 'info' }
    case 'InProgress':
      return { text: '进行中', type: 'success' }
    case 'Completed':
      return { text: '已结束', type: 'warning' }
    default:
      return { text: status, type: 'info' }
  }
}

const handleDelete = async (id) => {
  try {
    await ElMessageBox.confirm('确定删除该活动？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteEvent(id)
    ElMessage.success('删除成功')
    fetchEventList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/\//g, '-')
}

onMounted(() => {
  fetchEventList()
})
</script>

<style scoped>
.event-list-page { padding: 20px; }
.page-header { margin-bottom: 20px; }
.search-card, .list-card { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px; }

.event-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.event-item-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.3s;
  display: flex;
  flex-direction: column;
}

.event-item-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.cover {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 Aspect Ratio */
  cursor: pointer;
}

.cover img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-tag {
  position: absolute;
  top: 10px;
  right: 10px;
}

.info {
  padding: 15px;
  flex-grow: 1;
}

.title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 10px 0;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title:hover {
  color: #409eff;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #666;
  font-size: 14px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 10px 15px;
  border-top: 1px solid #f5f5f5;
}

.operate {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.empty {
  text-align: center;
  color: #999;
  padding: 40px 0;
}
.operate { display: flex; gap: 10px; margin-top: auto; padding-top: 10px; border-top: 1px solid #f5f5f5; }
.empty { text-align: center; padding: 40px; color: #999; }
</style>