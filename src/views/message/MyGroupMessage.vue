<template>
  <div class="group-detail-page">
    <!-- 顶部固定操作栏（和参考完全一致） -->
    <div class="top-action-bar">
      <el-button @click="$router.back()" icon="el-icon-arrow-left">返回列表</el-button>
    </div>

    <!-- 消息列表区域（纯查看，无标签页） -->
    <div class="detail-card">
      <div class="message-section">
        <!-- 消息展开列表 -->
        <div class="message-expand-list">
          <div class="message-item-card" v-for="item in messageList" :key="item.id">
            <!-- 标题栏：点击展开/收起 -->
            <div class="item-header" @click="toggleMessage(item.id)">
              <div class="title-wrap">
                <el-link type="primary" :underline="false" class="msg-title">
                  {{ item.title }}
                </el-link>
                <span class="send-time">{{ item.send_time }}</span>
              </div>
              <el-icon :class="{'rotate-icon': expandedMsgId === item.id}" size="16">
                <ArrowDown />
              </el-icon>
            </div>

            <!-- 收起时显示摘要 -->
            <div class="item-summary" v-if="expandedMsgId !== item.id" v-html="getMessageSummary(item.content)"></div>

            <!-- 展开时显示完整内容（强制自动换行） -->
            <div 
              class="item-content" 
              v-if="expandedMsgId === item.id" 
              v-html="item.content"
            ></div>
          </div>

          <el-empty v-if="!loading && messageList.length === 0" description="暂无消息" />
        </div>

        <!-- 分页（和参考样式一致） -->
        <el-pagination
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.page_size"
          :total="total"
          layout="total, sizes, prev, pager, next"
          style="text-align:center;margin-top:20px"
          v-if="total > 0"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { getGroupMessageList, getMessageDetail } from '../../api/message'

const route = useRoute()
const groupId = route.params.id

// 加载状态
const loading = ref(false)
// 展开消息ID（核心：控制展开收起）
const expandedMsgId = ref(null)

// 分页参数
const queryParams = reactive({
  page: 1,
  page_size: 10
})

const messageList = ref([])
const total = ref(0)

// 展开/收起消息（和参考逻辑一致）
const toggleMessage = (msgId) => {
  expandedMsgId.value = expandedMsgId.value === msgId ? null : msgId
}

// 获取消息摘要（图片/文本截断）
const getMessageSummary = (content) => {
  if (!content) return '无内容'
  // 识别图片
  if (content.includes('<img')) {
    return '<span style="color:#409eff">[图片] 点击标题查看完整内容</span>'
  }
  // 去除HTML标签，截断文本
  const text = content.replace(/<[^>]+>/g, '')
  return text.length > 50 ? text.substring(0, 50) + '...' : text
}

// 获取群组消息列表
const getList = async () => {
  loading.value = true
  try {
    const res = await getGroupMessageList(groupId, queryParams)
    messageList.value = res.data.list || []
    total.value = res.data.total || 0
    expandedMsgId.value = null // 切换分页重置展开状态
  } catch (e) {
    ElMessage.error('获取消息失败')
    console.error('接口错误:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => getList())
</script>

<style scoped>
/* 完全复刻你的项目样式，100%统一 */
.group-detail-page { padding: 20px; }
.top-action-bar {
  position: sticky; top: 0; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.08);
  display: flex; align-items: center; padding: 12px 20px;
  border-radius: 8px; margin-bottom: 20px; z-index: 999;
}
.detail-card { background: #fff; padding: 20px; border-radius: 8px; }
.message-section { margin-top: 0; }

/* 消息列表样式（和参考完全一致） */
.message-expand-list { margin-top: 20px; }
.message-item-card {
  background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 15px;
  margin-bottom: 12px; transition: all .3s;
}
.message-item-card:hover { border-color: #409eff; background: #fff; }

/* 标题栏 */
.item-header {
  display: flex; justify-content: space-between; align-items: center;
  cursor: pointer; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;
}
.title-wrap { display: flex; align-items: center; gap: 15px; }
.msg-title { font-size: 16px; font-weight: 500; }
.send-time { font-size: 12px; color: #999; }
.rotate-icon { transform: rotate(180deg); transition: transform .3s; }

/* 摘要 */
.item-summary { padding: 10px 0; color: #666; line-height: 1.5; }

/* 核心：强制自动换行 + 富文本适配 */
.item-content {
  padding: 15px 0; 
  line-height: 1.8; 
  color: #333;
  max-height: 60vh; 
  overflow-y: auto;
  width: 100% !important;
  word-break: break-all;         
  overflow-wrap: break-word;     
  white-space: pre-wrap;         
  box-sizing: border-box;
}
.item-content * {
  max-width: 100% !important;
  box-sizing: border-box;
  word-break: inherit;
}
.item-content img {
  height: auto !important;
  border-radius: 4px; 
  margin: 10px 0;
}
</style>