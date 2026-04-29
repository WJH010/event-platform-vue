<template>
  <div class="chat-view-container">
    <!-- 顶部栏 -->
    <div class="chat-header">
      <button class="back-btn" @click="agentStore.backToList()">
        <el-icon><ArrowLeft /></el-icon>
      </button>
      <span class="chat-title">{{ agentStore.currentConversation?.title || '对话' }}</span>
    </div>

    <!-- 消息列表 -->
    <div class="chat-messages" ref="messagesRef">
      <div
        v-for="msg in agentStore.currentMessages"
        :key="msg.id"
        v-show="msg.content || msg.isStreaming"
        class="message-row"
        :class="msg.role === 'user' ? 'is-user' : 'is-assistant'"
      >
        <div class="message-avatar" :class="msg.role === 'user' ? 'user-avatar' : 'ai-avatar'">
          <span v-if="msg.role === 'assistant'">🤖</span>
          <el-icon v-else><User /></el-icon>
        </div>
        <div class="message-content">
          <div class="message-bubble" :class="{ 'is-streaming': msg.isStreaming }">
            {{ msg.content }}<span v-if="msg.isStreaming" class="streaming-cursor">▎</span>
          </div>
          <div class="message-time" v-if="msg.time">{{ msg.time }}</div>
        </div>
      </div>

      <!-- 等待首个流式内容 -->
      <div v-if="agentStore.isLoading && !agentStore.isStreaming" class="message-row is-assistant">
        <div class="message-avatar ai-avatar">🤖</div>
        <div class="message-content">
          <div class="message-bubble">
            <div class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="chat-input-area">
      <div class="input-box">
        <el-input
          v-model="inputText"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 4 }"
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          @keydown.enter.exact.prevent="handleSend"
          :disabled="agentStore.isLoading"
        />
        <div class="input-box-footer">
          <el-select
            v-model="agentStore.selectedModelId"
            size="small"
            class="model-select-inline"
            placeholder="选择模型"
            :loading="agentStore.modelLoading"
            popper-class="agent-model-select-popper"
            @change="agentStore.selectModel"
          >
            <el-option
              v-for="model in agentStore.modelList"
              :key="model.id"
              :label="model.model_name"
              :value="model.id"
            />
          </el-select>
          <button
            class="send-btn-inline"
            :disabled="!inputText.trim() || agentStore.isLoading"
            @click="handleSend"
          >
            <el-icon><Promotion /></el-icon>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { ArrowLeft, User, Promotion } from '@element-plus/icons-vue'
import { useAgentStore } from '../../store/agent'

const agentStore = useAgentStore()
const inputText = ref('')
const messagesRef = ref(null)

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

// 监听消息数量变化
watch(() => agentStore.currentMessages.length, () => scrollToBottom())

// 监听流式内容变化
const streamingContentLen = computed(() => {
  const msgs = agentStore.currentMessages
  if (!msgs.length) return 0
  const last = msgs[msgs.length - 1]
  return last.isStreaming ? last.content.length : 0
})
watch(streamingContentLen, () => scrollToBottom())

// loading 状态切换
watch(() => agentStore.isLoading, () => scrollToBottom())

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || agentStore.isLoading) return

  inputText.value = ''
  await agentStore.sendMessage(text)
  scrollToBottom()
}
</script>
