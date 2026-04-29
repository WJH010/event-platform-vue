<template>
  <div class="conv-list-container">
    <!-- 操作栏 -->
    <div class="conv-list-header">
      <span class="conv-list-title">会话列表</span>
      <button class="new-conv-btn" @click="handleCreate">
        <el-icon><Plus /></el-icon>
      </button>
    </div>

    <!-- 会话列表 -->
    <div class="conv-list-scroll" v-if="agentStore.conversations.length > 0">
      <div
        v-for="conv in agentStore.conversations"
        :key="conv.id"
        class="conv-item"
        :class="{ 'is-active': conv.id === agentStore.currentConversationId }"
        @click="agentStore.openConversation(conv.id)"
      >
        <div class="conv-icon">
          <el-icon><ChatDotRound /></el-icon>
        </div>
        <div class="conv-info">
          <div class="conv-title">{{ conv.title }}</div>
          <div class="conv-meta">
            <span class="conv-preview" v-if="conv.lastMessage">{{ conv.lastMessage }}</span>
            <span class="conv-time" v-if="conv.time">{{ conv.time }}</span>
          </div>
        </div>
        <button
          class="conv-delete-btn"
          title="删除会话"
          @click.stop="handleDelete(conv)"
        >
          <el-icon><Delete /></el-icon>
        </button>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="conv-empty" v-else>
      <div class="empty-illustration">
        <el-icon class="empty-icon"><ChatDotRound /></el-icon>
      </div>
      <span class="empty-text">点击上方按钮开始与 AI 助手对话</span>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { Plus, ChatDotRound, Delete } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useAgentStore } from '../../store/agent'

const agentStore = useAgentStore()

function handleCreate() {
  agentStore.createConversation()
}

async function handleDelete(conv) {
  try {
    await ElMessageBox.confirm(
      `确定删除会话「${conv.title}」吗？`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning', zIndex: 10001 }
    )
    await agentStore.removeConversation(conv.id)
    ElMessage.success('已删除')
  } catch {
    // 用户取消
  }
}

onMounted(() => {
  agentStore.fetchModelList()
  agentStore.fetchSessionList()
})
</script>
