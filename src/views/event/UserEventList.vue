<template>
  <div class="user-event-list-page">
    <div class="page-header">
      <h2>活动中心</h2>
    </div>

    <!-- 搜索栏 -->
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
        </el-form-item>
      </el-form>
    </div>

    <!-- 活动列表区域 -->
    <div class="list-card">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="进行中" name="InProgress">
          <div>
            <div class="event-grid" v-if="eventList.length > 0">
              <div class="event-item-card" v-for="item in eventList" :key="item.id" @click="toDetail(item.id)">
                <div class="cover">
                  <img :src="item.cover_image_url || defaultCover" alt="封面" />
                  <div class="status-tag">
                    <el-tag :type="item.registrationStatus.type" size="small" effect="dark">
                      {{ item.registrationStatus.text }}
                    </el-tag>
                  </div>
                </div>
                <div class="info">
                  <h3 class="title">{{ item.title }}</h3>
                  <div class="meta">
                    <div class="meta-item">
                      <el-icon><Calendar /></el-icon>
                      <span>{{ item.formatted_start_time }}</span>
                    </div>
                    <div class="meta-item">
                      <el-icon><Location /></el-icon>
                      <span>{{ item.event_address }}</span>
                    </div>
                    <div class="meta-item">
                      <el-icon><User /></el-icon>
                      <span>{{ item.member_count || 0 }} 人已报名</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="empty" v-if="eventList.length === 0 && !loading">暂无活动</div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="未开始" name="NotBegun">
          <div>
            <div class="event-grid" v-if="eventList.length > 0">
              <div class="event-item-card" v-for="item in eventList" :key="item.id" @click="toDetail(item.id)">
                <div class="cover">
                  <img :src="item.cover_image_url || defaultCover" alt="封面" />
                  <div class="status-tag">
                    <el-tag :type="item.registrationStatus.type" size="small" effect="dark">
                      {{ item.registrationStatus.text }}
                    </el-tag>
                  </div>
                </div>
                <div class="info">
                  <h3 class="title">{{ item.title }}</h3>
                  <div class="meta">
                    <div class="meta-item">
                      <el-icon><Calendar /></el-icon>
                      <span>{{ item.formatted_start_time }}</span>
                    </div>
                    <div class="meta-item">
                      <el-icon><Location /></el-icon>
                      <span>{{ item.event_address }}</span>
                    </div>
                    <div class="meta-item">
                      <el-icon><User /></el-icon>
                      <span>{{ item.member_count || 0 }} 人已报名</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="empty" v-if="eventList.length === 0 && !loading">暂无活动</div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="已结束" name="Completed">
          <div>
            <div class="event-grid" v-if="eventList.length > 0">
              <div class="event-item-card" v-for="item in eventList" :key="item.id" @click="toDetail(item.id)">
                <div class="cover">
                  <img :src="item.cover_image_url || defaultCover" alt="封面" />
                  <div class="status-tag">
                    <el-tag :type="item.registrationStatus.type" size="small" effect="dark">
                      {{ item.registrationStatus.text }}
                    </el-tag>
                  </div>
                </div>
                <div class="info">
                  <h3 class="title">{{ item.title }}</h3>
                  <div class="meta">
                    <div class="meta-item">
                      <el-icon><Calendar /></el-icon>
                      <span>{{ item.formatted_start_time }}</span>
                    </div>
                    <div class="meta-item">
                      <el-icon><Location /></el-icon>
                      <span>{{ item.event_address }}</span>
                    </div>
                    <div class="meta-item">
                      <el-icon><User /></el-icon>
                      <span>{{ item.member_count || 0 }} 人已报名</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="empty" v-if="eventList.length === 0 && !loading">暂无活动</div>
          </div>
        </el-tab-pane>
      </el-tabs>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="queryParams.page"
        v-model:page-size="queryParams.page_size"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchEventList"
        @current-change="fetchEventList"
        style="margin-top: 20px; justify-content: flex-end;"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getEventList } from '../../api/event'
import { Calendar, Location, User } from '@element-plus/icons-vue'
import defaultCover from '../../assets/images/default/Default_cover.png'

const router = useRouter()
const loading = ref(false)
const eventList = ref([])
const total = ref(0)
const activeTab = ref('InProgress')

const queryParams = reactive({
  page: 1,
  page_size: 10,
  title: '',
  event_status: 'InProgress' // 默认查询进行中的活动
})

const fetchEventList = async () => {
  try {
    loading.value = true
    const res = await getEventList(queryParams)
    // 处理数据，添加动态计算的报名状态和预格式化的日期
    eventList.value = (res.data.list || []).map(item => {
      return {
        ...item,
        registrationStatus: calculateRegistrationStatus(item.registration_start_time, item.registration_end_time),
        formatted_start_time: formatDate(item.event_start_time) // 预先格式化日期
      }
    })
    total.value = res.data.total || 0
  } catch (e) {
    ElMessage.error('获取活动列表失败')
    eventList.value = []
  } finally {
    loading.value = false
  }
}


const handleTabChange = (tabName) => {
  queryParams.page = 1
  queryParams.event_status = tabName
  fetchEventList()
}

const resetQuery = () => {
  queryParams.title = ''
  fetchEventList()
}

const toDetail = (id) => {
  router.push(`/activity-center/detail/${id}`)
}

// 动态计算报名状态
const calculateRegistrationStatus = (startTimeStr, endTimeStr) => {
  if (!startTimeStr || !endTimeStr) return { text: '未知', type: 'info' }
  
  const now = new Date().getTime()
  const start = new Date(startTimeStr).getTime()
  const end = new Date(endTimeStr).getTime()

  if (now < start) {
    return { text: '报名未开始', type: 'warning' }
  } else if (now >= start && now <= end) {
    return { text: '正在报名', type: 'success' }
  } else {
    return { text: '报名已结束', type: 'info' }
  }
}

// 格式化日期
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
.user-event-list-page { padding: 20px; }
.page-header { margin-bottom: 20px; }
.search-card, .list-card { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px; }

/* 复用网格布局样式 */
.event-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 15px;
}

.event-item-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  background: #fff;
}

.event-item-card:hover {
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.cover {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 Aspect Ratio */
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #303133;
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

.empty {
  text-align: center;
  color: #999;
  padding: 60px 0;
}
</style>