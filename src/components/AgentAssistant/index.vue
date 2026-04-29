<template>
  <Teleport to="body">
    <!-- 浮动球 -->
    <div
      v-show="!agentStore.panelOpen"
      class="agent-float-ball"
      :class="{ 'is-dragging': isDragging }"
      :style="ballStyle"
      @mousedown="onMouseDown"
    >
      <svg class="ball-ai-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="8" width="14" height="11" rx="3" stroke="currentColor" stroke-width="1.8" fill="none"/>
        <circle cx="9.5" cy="13.5" r="1.3" fill="currentColor"/>
        <circle cx="14.5" cy="13.5" r="1.3" fill="currentColor"/>
        <path d="M9 16.5c0 0 1.2 1.2 3 1.2s3-1.2 3-1.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>
        <line x1="12" y1="5" x2="12" y2="8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="12" cy="4.2" r="1.2" fill="currentColor"/>
        <line x1="3" y1="12" x2="5" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="19" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    </div>

    <!-- 聊天面板 -->
    <transition name="agent-panel">
      <AgentPanel v-if="agentStore.panelOpen" @close="closePanel" />
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import AgentPanel from './AgentPanel.vue'
import { useAgentStore } from '../../store/agent'
// 引入样式文件 —— 之前遗漏了这行！
import './agent.css'

const agentStore = useAgentStore()

const isDragging = ref(false)

// 浮动球位置
const ballPos = reactive({
  x: window.innerWidth - 80,
  y: window.innerHeight - 100
})

const dragState = reactive({
  startX: 0,
  startY: 0,
  startPosX: 0,
  startPosY: 0,
  hasMoved: false
})

const ballStyle = ref({
  right: '24px',
  bottom: '24px'
})

function onMouseDown(e) {
  e.preventDefault()
  isDragging.value = true
  dragState.startX = e.clientX
  dragState.startY = e.clientY
  dragState.startPosX = ballPos.x
  dragState.startPosY = ballPos.y
  dragState.hasMoved = false

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e) {
  if (!isDragging.value) return

  const dx = e.clientX - dragState.startX
  const dy = e.clientY - dragState.startY

  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    dragState.hasMoved = true
  }

  const newX = dragState.startPosX + dx
  const newY = dragState.startPosY + dy

  // 限制在窗口内
  ballPos.x = Math.max(0, Math.min(window.innerWidth - 56, newX))
  ballPos.y = Math.max(0, Math.min(window.innerHeight - 56, newY))

  ballStyle.value = {
    left: ballPos.x + 'px',
    top: ballPos.y + 'px',
    right: 'auto',
    bottom: 'auto'
  }
}

function onMouseUp() {
  isDragging.value = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)

  // 如果几乎没有移动，视为点击
  if (!dragState.hasMoved) {
    openPanel()
    return
  }

  // 吸附到最近边缘
  snapToEdge()
}

function snapToEdge() {
  const midX = window.innerWidth / 2
  if (ballPos.x + 28 < midX) {
    ballPos.x = 16
  } else {
    ballPos.x = window.innerWidth - 72
  }

  ballStyle.value = {
    left: ballPos.x + 'px',
    top: ballPos.y + 'px',
    right: 'auto',
    bottom: 'auto',
    transition: 'left 0.3s ease'
  }

  // 清除过渡
  setTimeout(() => {
    ballStyle.value = {
      left: ballPos.x + 'px',
      top: ballPos.y + 'px',
      right: 'auto',
      bottom: 'auto'
    }
  }, 300)
}

function openPanel() {
  agentStore.openPanel()
}

function closePanel() {
  agentStore.closePanel()
  // 重置浮动球位置
  ballPos.x = window.innerWidth - 80
  ballPos.y = window.innerHeight - 100
  ballStyle.value = {
    right: '24px',
    bottom: '24px'
  }
}

// 窗口 resize 处理
function onResize() {
  if (!agentStore.panelOpen) {
    ballPos.x = Math.min(ballPos.x, window.innerWidth - 56)
    ballPos.y = Math.min(ballPos.y, window.innerHeight - 56)
  }
}

onMounted(() => {
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})
</script>
