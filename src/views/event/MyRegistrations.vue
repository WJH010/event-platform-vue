<template>
  <div class="my-registrations-page">
    <div class="page-header">
      <h2>我的报名</h2>
    </div>

    <div class="list-card">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="进行中" name="InProgress"></el-tab-pane>
        <el-tab-pane label="已结束" name="Completed"></el-tab-pane>
      </el-tabs>

      <div v-loading="loading" class="event-grid-container">
        <div class="event-grid" v-if="eventList.length > 0">
          <div class="event-item-card" v-for="item in eventList" :key="item.id" @click="toDetail(item.id)">
            <div class="cover">
              <img :src="item.cover_image_url || defaultCover" alt="封面" />
            </div>
            <div class="info">
              <h3 class="title">{{ item.title }}</h3>
              <div class="meta">
                <div class="meta-item">
                  <el-icon><Calendar /></el-icon>
                  <span>{{ formatDate(item.event_start_time) }}</span>
                </div>
                <div class="meta-item">
                  <el-icon><Location /></el-icon>
                  <span>{{ item.event_address }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <el-empty v-if="eventList.length === 0 && !loading" description="暂无相关活动" />
      </div>
    </div>

    <el-pagination
      v-if="total > 0"
      v-model:current-page="queryParams.page"
      v-model:page-size="queryParams.pageSize"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="fetchRegisteredEvents"
      @current-change="fetchRegisteredEvents"
      class="pagination-container"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getUserRegisteredEvents } from '../../api/event'
import { Calendar, Location } from '@element-plus/icons-vue'
import defaultCover from '../../assets/images/default/Default_cover.png'

const router = useRouter()

const loading = ref(true)
const eventList = ref([])
const total = ref(0)
const activeTab = ref('InProgress')

const queryParams = reactive({
  page: 1,
  pageSize: 10,
  event_status: 'InProgress', // 默认查询进行中的活动
})

const fetchRegisteredEvents = async () => {
  loading.value = true
  try {
    const res = await getUserRegisteredEvents(queryParams)
    eventList.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (e) {
    ElMessage.error('获取我报名的活动列表失败')
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleTabChange = (tabName) => {
  queryParams.page = 1
  queryParams.event_status = tabName
  fetchRegisteredEvents()
}

const toDetail = (id) => {
  router.push(`/activity-center/detail/${id}`)
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  // Just get date part for cleaner display
  return new Date(dateString).toLocaleDateString('zh-CN').replace(/\//g, '-')
}

onMounted(fetchRegisteredEvents)
</script>

<style scoped>
.my-registrations-page {
  padding: 20px;
  background-color: #f0f2f5;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.list-card {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);
}

.event-grid-container {
  min-height: 300px; /* Avoid layout shift while loading */
}

.event-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.event-item-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.3s;
  cursor: pointer;
}

.event-item-card:hover {
  box-shadow: 0 4px 20px rgba(0,0,0,.1);
}

.cover {
  width: 100%;
  height: 180px;
  position: relative;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info {
  padding: 16px;
}

.info .title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  font-size: 14px;
  color: #606266;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.meta-item:last-child {
  margin-bottom: 0;
}

.meta-item .el-icon {
  font-size: 16px;
}

.pagination-container {
  margin-top: 20px;
  justify-content: center;
}
</style>