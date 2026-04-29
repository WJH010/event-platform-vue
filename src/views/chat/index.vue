<template>
  <div class="chat-container">
    <div class="group-list-panel">
      <div class="panel-header">
        <h3>群聊列表</h3>
      </div>
      <div class="group-list" v-loading="loading">
        <div
          v-for="group in groupList"
          :key="group.group_id"
          class="group-item"
          :class="{ active: activeGroup && activeGroup.group_id === group.group_id }"
          @click="selectGroup(group)"
        >
          <div class="group-avatar">
            {{ group.group_name.charAt(0) }}
          </div>
          <div class="group-info">
            <div class="group-name">{{ group.group_name }}</div>
            <div class="last-message">
              <span v-if="group.last_message">{{ group.last_message_sender }}: {{ group.last_message }}</span>
              <span v-else class="no-message">暂无消息</span>
            </div>
          </div>
          <div class="group-meta">
            <div class="last-message-time">{{ formatTime(group.last_message_time) }}</div>
            <el-badge :is-dot="group.has_unread" class="unread-badge"></el-badge>
          </div>
        </div>
        <el-empty v-if="!loading && groupList.length === 0" description="您还没有加入任何群聊"></el-empty>
      </div>
    </div>
    <div class="chat-panel">
      <template v-if="activeGroup">
        <div class="chat-header">
          <h3>{{ activeGroup.group_name }}</h3>
          <el-button type="info" :icon="MoreFilled" circle @click="openGroupDetails" />
        </div>
        <div class="message-area" ref="messageAreaRef">
          <div class="load-more-trigger">
            <el-button v-if="hasMoreMessages" @click="loadMoreMessages" :loading="messageLoading" text>
              加载更多消息
            </el-button>
            <p v-else-if="messages.length > 0" class="no-more-messages">--- 没有更多消息了 ---</p>
          </div>
          <div
            v-for="message in messages"
            :key="message.message_id"
            class="message-wrapper"
            :class="{ sent: message.sender_id === currentUser.user_id, received: message.sender_id !== currentUser.user_id }"
          >
            <el-avatar :src="message.sender_avatar" class="message-avatar"></el-avatar>
            <div class="message-body">
              <div class="sender-name" v-if="message.sender_id !== currentUser.user_id">{{ message.sender_name }}</div>
              <div class="message-bubble">
                <div class="message-text">{{ message.content }}</div>
              </div>
              <div class="message-timestamp">{{ formatMessageTime(message.send_at) }}</div>
            </div>
          </div>
        </div>
        <div class="chat-input-area">
          <el-input
            v-model="messageContent"
            type="textarea"
            :rows="3"
            placeholder="输入消息，按 Enter 发送"
            @keydown.enter.prevent="sendMessage"
          ></el-input>
          <div class="input-actions">
            <el-button type="primary" @click="sendMessage" :disabled="isSendDisabled">发送</el-button>
          </div>
        </div>
      </template>
      <div v-else class="chat-placeholder">
        <el-icon><ChatDotRound /></el-icon>
        <p>选择一个群聊开始对话</p>
      </div>
    </div>

    <!-- Group Details Drawer -->
    <el-drawer
      v-model="isDrawerVisible"
      :title="`群组信息 - ${activeGroup?.group_name}`"
      direction="rtl"
      size="360px"
    >
      <div class="drawer-content" v-if="activeGroup">
        <h4>群组描述</h4>
        <p class="group-description">{{ activeGroup.desc || '暂无描述' }}</p>
        
        <h4>群成员 ({{ groupMembers.length }})</h4>
        <div class="member-list" v-loading="isMembersLoading">
          <div v-for="member in groupMembers" :key="member.user_id" class="member-item">
            <el-avatar :src="member.avatar_url" size="small"></el-avatar>
            <span class="member-name">{{ member.nickname }}</span>
          </div>
        </div>
      </div>
    </el-drawer>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { getUserGroups, getGroupMessages, getGroupMembers } from '@/api/chat'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'
import { ChatDotRound, MoreFilled } from '@element-plus/icons-vue'

const userStore = useUserStore()
const currentUser = computed(() => userStore.userInfo)

const loading = ref(false)
const groupList = ref([])
const activeGroup = ref(null)

const messages = ref([])
const messageLoading = ref(false)
const messagePagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})
const messageAreaRef = ref(null)

const hasMoreMessages = computed(() => {
  return messages.value.length < messagePagination.total
})

const messageContent = ref('')
const ws = ref(null)

// For Group Details Drawer
const isDrawerVisible = ref(false)
const groupMembers = ref([])
const isMembersLoading = ref(false)

const isSendDisabled = computed(() => {
  return !messageContent.value.trim() || !ws.value || ws.value.readyState !== WebSocket.OPEN
})

const initWebSocket = (groupId) => {
  // Close existing connection if it exists before creating a new one
  if (ws.value) {
    ws.value.close()
  }

  const token = userStore.access_token
  if (!token) {
    ElMessage.error('认证令牌不存在，无法连接聊天服务器。')
    return
  }

  // WebSocket API 不支持自定义请求头，因此将 token 作为查询参数传递
  const wsUrl = `ws://localhost:8080/api/chat/ws/${groupId}?token=${token}`
  ws.value = new WebSocket(wsUrl)

  ws.value.onopen = () => {
    console.log(`WebSocket connected to group ${groupId}`)
  }

  ws.value.onmessage = (event) => {
    const messageData = JSON.parse(event.data)

    // If the incoming message is from the current user, it's a confirmation
    // of the optimistic message we already displayed.
    if (messageData.user_id === currentUser.value.user_id) {
      // Find the temporary message in the array.
      const tempMessageIndex = messages.value.findIndex(m => m.message_id.startsWith('temp-'))
      if (tempMessageIndex !== -1) {
        // Replace its temporary ID and timestamp with the real one from the server.
        messages.value[tempMessageIndex].message_id = messageData.data.id
        messages.value[tempMessageIndex].send_at = messageData.data.send_at
        return // Stop processing to prevent duplication.
      }
    }
    
    // If it's a message from another user, add it to the list.
    const newMessage = {
      message_id: messageData.data.id,
      sender_id: messageData.user_id,
      sender_name: messageData.data.sender_name,
      sender_avatar: messageData.data.sender_avatar,
      content: messageData.data.content,
      type: messageData.data.type,
      send_at: messageData.data.send_at
    }
    messages.value.push(newMessage)
    scrollToBottom()
  }

  ws.value.onclose = () => {
    console.log(`WebSocket for group ${groupId} disconnected`)
  }

  ws.value.onerror = (error) => {
    console.error('WebSocket error:', error)
    ElMessage.error('WebSocket 连接发生错误')
  }
}

const sendMessage = () => {
  if (isSendDisabled.value) return

  const payload = {
    content: messageContent.value,
    type: 'text'
  }
  ws.value.send(JSON.stringify(payload))

  // Optimistic UI update
  const optimisticMessage = {
    message_id: `temp-${Date.now()}`,
    sender_id: currentUser.value.user_id,
    sender_name: currentUser.value.nickname,
    sender_avatar: currentUser.value.avatar_url,
    content: messageContent.value,
    type: 'text',
    send_at: new Date().toISOString()
  }
  messages.value.push(optimisticMessage)
  
  messageContent.value = ''
  scrollToBottom()
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messageAreaRef.value) {
      messageAreaRef.value.scrollTop = messageAreaRef.value.scrollHeight
    }
  })
}

const fetchUserGroups = async () => {
  loading.value = true
  try {
    const res = await getUserGroups()
    groupList.value = res.data
  } catch (error) {
    console.error('获取群聊列表失败:', error)
    ElMessage.error('获取群聊列表失败')
  } finally {
    loading.value = false
  }
}

const selectGroup = async (group) => {
  if (activeGroup.value?.group_id === group.group_id) return

  activeGroup.value = group
  // Reset state
  messages.value = []
  messagePagination.page = 1
  messagePagination.total = 0
  
  // Establish new WS connection for the selected group
  initWebSocket(group.group_id)

  // Fetch historical messages
  await fetchMessages(true)
}

const fetchMessages = async (isInitialLoad = false) => {
  if (!activeGroup.value) return
  messageLoading.value = true
  try {
    const res = await getGroupMessages(activeGroup.value.group_id, {
      page: messagePagination.page,
      pageSize: messagePagination.pageSize
    })
    
    const oldScrollHeight = messageAreaRef.value?.scrollHeight || 0
    
    messages.value = [...res.data.list.reverse(), ...messages.value]
    messagePagination.total = res.data.total

    await nextTick()

    if (isInitialLoad) {
      scrollToBottom()
    } else {
      if (messageAreaRef.value) {
        messageAreaRef.value.scrollTop = messageAreaRef.value.scrollHeight - oldScrollHeight
      }
    }
  } catch (error) {
    console.error('获取消息列表失败:', error)
    ElMessage.error('获取消息列表失败')
  } finally {
    messageLoading.value = false
  }
}

const loadMoreMessages = () => {
  if (messageLoading.value || !hasMoreMessages.value) return
  messagePagination.page++
  fetchMessages()
}

const openGroupDetails = async () => {
  isDrawerVisible.value = true
  if (!activeGroup.value) return

  isMembersLoading.value = true
  try {
    const res = await getGroupMembers(activeGroup.value.group_id)
    groupMembers.value = res.data.list
  } catch (error) {
    console.error('获取群成员列表失败:', error)
    ElMessage.error('获取群成员列表失败')
  } finally {
    isMembersLoading.value = false
  }
}

const formatMessageTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleDateString()
  }
}

onMounted(async () => {
  try {
    if (!userStore.userInfo.user_id) {
      await userStore.getUserInfo()
    }
  } catch (error) {
    ElMessage.error('无法获取用户信息，请重新登录')
    return
  }
  
  fetchUserGroups()
})

onUnmounted(() => {
  if (ws.value) {
    ws.value.close()
  }
})
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100%;
  background-color: #f5f5f5;
}

.group-list-panel {
  width: 300px;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.panel-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
}

.group-list {
  flex: 1;
  overflow-y: auto;
}

.group-item {
  display: flex;
  padding: 15px 20px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.group-item:hover {
  background-color: #f0f0f0;
}

.group-item.active {
  background-color: #e0e0e0;
}

.group-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #409eff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-right: 15px;
  flex-shrink: 0;
}

.group-info {
  flex: 1;
  overflow: hidden;
}

.group-name {
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.last-message {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-message {
  font-style: italic;
}

.group-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 12px;
  color: #999;
  margin-left: 10px;
}

.last-message-time {
  white-space: nowrap;
}

.unread-badge {
  margin-top: 5px;
}

.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-panel .chat-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ccc;
}

.chat-placeholder .el-icon {
  font-size: 64px;
}

.chat-placeholder p {
  margin-top: 20px;
  font-size: 18px;
}

.chat-header {
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #fcfcfc;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header h3 {
  margin: 0;
  font-size: 16px;
}

.message-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.load-more-trigger {
  text-align: center;
  margin-bottom: 15px;
}

.no-more-messages {
  color: #ccc;
  font-size: 12px;
}

.message-wrapper {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.message-wrapper.sent {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.message-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.message-wrapper.sent .message-body {
  align-items: flex-end;
}

.message-wrapper.received .message-body {
  align-items: flex-start;
}

.message-bubble {
  padding: 10px 14px;
  border-radius: 14px;
  position: relative;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  width: fit-content;
  max-width: 80%;
  word-break: break-word;
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 14px;
}

.message-wrapper.sent .message-bubble {
  background: linear-gradient(135deg, #409eff, #337ecc);
  color: white;
  border-top-right-radius: 4px;
}

.message-wrapper.received .message-bubble {
  background-color: #fff;
  color: #303133;
  border-top-left-radius: 4px;
}

.sender-name {
  font-size: 12px;
  color: #999;
  margin-bottom: 5px;
}

.message-timestamp {
  font-size: 12px;
  color: #a8abb2;
  margin-top: 5px;
}

.message-text {
  word-wrap: break-word;
}

.chat-input-area {
  padding: 15px 20px;
  border-top: 1px solid #e8e8e8;
  background-color: #fff;
}

/* 使用 :deep() 穿透 el-input 的 scoped 样式 */
.chat-input-area :deep(.el-textarea__inner) {
  border: none;
  box-shadow: none;
  background-color: transparent;
  padding: 0;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  color: #303133;
}

.chat-input-area :deep(.el-textarea__inner::placeholder) {
  color: #a8abb2;
}

.input-actions {
  margin-top: 10px;
  text-align: right;
}

/* Drawer Styles */
.drawer-content {
  padding: 0 20px;
}
.drawer-content h4 {
  margin-top: 24px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #606266;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8e8e8;
}
.drawer-content h4:first-of-type {
  margin-top: 0;
}
.group-description {
  font-size: 14px;
  color: #303133;
  line-height: 1.6;
  padding: 0 4px;
}
.member-list {
  max-height: 400px;
  overflow-y: auto;
}
.member-item {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}
.member-item:hover {
  background-color: #f5f7fa;
}
.member-name {
  margin-left: 10px;
  font-size: 14px;
}

/* Custom Scrollbar Styles */
.group-list::-webkit-scrollbar,
.message-area::-webkit-scrollbar,
.member-list::-webkit-scrollbar {
  width: 6px;
}

.group-list::-webkit-scrollbar-track,
.message-area::-webkit-scrollbar-track,
.member-list::-webkit-scrollbar-track {
  background: transparent;
}

.group-list::-webkit-scrollbar-thumb,
.message-area::-webkit-scrollbar-thumb,
.member-list::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 3px;
}

.group-list::-webkit-scrollbar-thumb:hover,
.message-area::-webkit-scrollbar-thumb:hover,
.member-list::-webkit-scrollbar-thumb:hover {
  background-color: #aaa;
}

/* For Firefox */
.group-list,
.message-area,
.member-list {
  scrollbar-width: thin;
  scrollbar-color: #ccc transparent;
}
</style>