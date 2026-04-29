<template>
  <div class="agent-panel" :style="panelStyle">
    <!-- 标题栏（可拖动移动面板） -->
    <div class="agent-panel-header" @mousedown="onDragStart">
      <div class="header-title">
        <el-icon><Monitor /></el-icon>
        <span>AI 助手</span>
      </div>
      <button class="close-btn" @mousedown.stop @click="$emit('close')">
        <el-icon><Close /></el-icon>
      </button>
    </div>

    <!-- 内容区 -->
    <div class="agent-panel-body">
      <AgentConversationList v-if="!agentStore.currentConversationId" />
      <AgentChatView v-else />
    </div>

    <!-- 调整大小手柄 -->
    <div class="resize-handle resize-handle-right" @mousedown.stop="onResizeStart($event, 'right')"></div>
    <div class="resize-handle resize-handle-bottom" @mousedown.stop="onResizeStart($event, 'bottom')"></div>
    <div class="resize-handle resize-handle-corner" @mousedown.stop="onResizeStart($event, 'corner')"></div>
    <div class="resize-handle resize-handle-topleft" @mousedown.stop="onResizeStart($event, 'topleft')"></div>
  </div>
</template>

<script setup>
import { reactive, computed, onUnmounted } from 'vue'
import { Monitor, Close } from '@element-plus/icons-vue'
import { useAgentStore } from '../../store/agent'
import AgentConversationList from './AgentConversationList.vue'
import AgentChatView from './AgentChatView.vue'

defineEmits(['close'])
const agentStore = useAgentStore()

// 面板尺寸与位置
const panel = reactive({
  width: 440,
  height: 640,
  x: window.innerWidth - 440 - 24,
  y: window.innerHeight - 640 - 24
})

const MIN_W = 360
const MIN_H = 480

const panelStyle = computed(() => ({
  width: panel.width + 'px',
  height: panel.height + 'px',
  left: panel.x + 'px',
  top: panel.y + 'px',
  right: 'auto',
  bottom: 'auto'
}))

// ========== 拖动移动面板 ==========
let dragState = null

function onDragStart(e) {
  e.preventDefault()
  dragState = {
    type: 'move',
    startX: e.clientX,
    startY: e.clientY,
    startLeft: panel.x,
    startTop: panel.y
  }
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
}

// ========== 拖动调整大小 ==========
let resizeState = null

function onResizeStart(e, dir) {
  e.preventDefault()
  resizeState = {
    dir,
    startX: e.clientX,
    startY: e.clientY,
    startW: panel.width,
    startH: panel.height,
    startXPos: panel.x,
    startYPos: panel.y
  }
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
}

function onDragMove(e) {
  if (!dragState) return
  const dx = e.clientX - dragState.startX
  const dy = e.clientY - dragState.startY
  panel.x = Math.max(0, Math.min(window.innerWidth - panel.width, dragState.startLeft + dx))
  panel.y = Math.max(0, Math.min(window.innerHeight - panel.height, dragState.startTop + dy))
}

function onResizeMove(e) {
  if (!resizeState) return
  const dx = e.clientX - resizeState.startX
  const dy = e.clientY - resizeState.startY
  const dir = resizeState.dir

  if (dir === 'right' || dir === 'corner') {
    panel.width = Math.max(MIN_W, Math.min(window.innerWidth - panel.x - 8, resizeState.startW + dx))
  }
  if (dir === 'bottom' || dir === 'corner') {
    panel.height = Math.max(MIN_H, Math.min(window.innerHeight - panel.y - 8, resizeState.startH + dy))
  }
  if (dir === 'topleft') {
    // 向左拉伸：增大宽度，同时移动 x
    const newW = Math.max(MIN_W, resizeState.startW - dx)
    panel.x = Math.max(0, resizeState.startXPos + resizeState.startW - newW)
    panel.width = Math.min(newW, window.innerWidth - panel.x - 8)
    // 向上拉伸：增大高度，同时移动 y
    const newH = Math.max(MIN_H, resizeState.startH - dy)
    panel.y = Math.max(0, resizeState.startYPos + resizeState.startH - newH)
    panel.height = Math.min(newH, window.innerHeight - panel.y - 8)
  }
}

function onDragEnd() {
  dragState = null
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
}

function onResizeEnd() {
  resizeState = null
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
})
</script>
