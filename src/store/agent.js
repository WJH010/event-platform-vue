import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getModelList, setModelPreference, getSessionList, getSessionMessages, deleteSession, sendChatStream } from '../api/agent'

export const useAgentStore = defineStore('agent', () => {
  // ========== 模型相关 ==========
  const modelList = ref([])
  const selectedModelId = ref(null)
  const modelLoading = ref(false)

  const selectedModel = computed(() => {
    const model = modelList.value.find(m => m.id === selectedModelId.value)
    return model ? model.model_name : ''
  })

  // ========== 会话相关 ==========
  const conversations = ref([])
  const currentConversationId = ref(null)

  // ========== 消息相关 ==========
  const messagesMap = ref({})

  // ========== 加载/流式状态 ==========
  const isLoading = ref(false)
  const isStreaming = ref(false)

  // ========== 面板开关状态 ==========
  const panelOpen = ref(false)

  function openPanel() {
    panelOpen.value = true
  }

  function closePanel() {
    panelOpen.value = false
  }

  // ========== 计算属性 ==========
  const currentMessages = computed(() => {
    if (!currentConversationId.value) return []
    return messagesMap.value[currentConversationId.value] || []
  })

  const currentConversation = computed(() => {
    if (!currentConversationId.value) return null
    return conversations.value.find(c => c.id === currentConversationId.value)
  })

  // ========== 方法 ==========

  async function fetchModelList() {
    modelLoading.value = true
    try {
      const res = await getModelList()
      if (res.code === 200 && res.data) {
        modelList.value = res.data.filter(item => item.is_enabled === 1)
        if (modelList.value.length > 0 && !selectedModelId.value) {
          selectedModelId.value = modelList.value[0].id
        }
      }
    } catch (e) {
      console.error('获取模型列表失败:', e)
    } finally {
      modelLoading.value = false
    }
  }

  async function selectModel(configId) {
    const prevId = selectedModelId.value
    selectedModelId.value = configId
    try {
      await setModelPreference(configId)
    } catch (e) {
      console.error('设置模型偏好失败:', e)
      selectedModelId.value = prevId
    }
  }

  /**
   * 从后端加载会话列表
   */
  async function fetchSessionList() {
    try {
      const res = await getSessionList()
      if (res.code === 200 && res.data) {
        conversations.value = res.data.map(s => ({
          id: s.id,
          sessionId: s.id,
          title: s.title || '新的对话',
          lastMessage: '',
          time: s.updated_at || s.created_at || '',
          model: ''
        }))
      }
    } catch (e) {
      console.error('获取会话列表失败:', e)
    }
  }

  /**
   * 创建新会话（本地占位，发送第一条消息时由后端分配 session_id）
   */
  function createConversation() {
    const id = 'local_' + Date.now().toString()
    const newConv = {
      id,
      sessionId: null,
      title: '新的对话',
      lastMessage: '',
      time: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      model: selectedModel.value
    }
    conversations.value.unshift(newConv)
    messagesMap.value[id] = []
    currentConversationId.value = id
    return id
  }

  /**
   * 打开已有会话，从后端加载消息历史
   */
  async function openConversation(id) {
    currentConversationId.value = id
    // 已有本地缓存则不重复请求
    if (messagesMap.value[id] && messagesMap.value[id].length > 0) return

    const conv = conversations.value.find(c => c.id === id)
    if (!conv?.sessionId) {
      messagesMap.value[id] = []
      return
    }

    try {
      const res = await getSessionMessages(conv.sessionId)
      if (res.code === 200 && res.data) {
        messagesMap.value[id] = res.data.map(m => ({
          id: m.id.toString(),
          role: m.role,
          content: m.content,
          time: m.created_at || '',
          isStreaming: false
        }))
      }
    } catch (e) {
      console.error('获取消息列表失败:', e)
      messagesMap.value[id] = []
    }
  }

  /**
   * 发送消息（流式）
   * - 新会话：不传 sessionId，后端返回新 session_id
   * - 继续会话：传已有 sessionId
   */
  async function sendMessage(content) {
    if (!currentConversationId.value) return
    let convId = currentConversationId.value
    const conv = conversations.value.find(c => c.id === convId)

    // 1. 添加用户消息
    messagesMap.value[convId].push({
      id: Date.now().toString(),
      role: 'user',
      content,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    })

    // 更新会话标题
    if (conv && conv.title === '新的对话') {
      conv.title = content.slice(0, 20) + (content.length > 20 ? '...' : '')
    }

    // 2. 添加空的 assistant 消息占位（isStreaming 在首个 content 到达时开启）
    const assistantMsgId = (Date.now() + 1).toString()
    messagesMap.value[convId].push({
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      time: '',
      isStreaming: false
    })

    isLoading.value = true

    try {
      await sendChatStream(
        { content, sessionId: conv?.sessionId },
        (event) => {
          const msgList = messagesMap.value[convId]
          const msg = msgList ? msgList.find(m => m.id === assistantMsgId) : null

          // 首个返回是 session_id 字符串
          if (typeof event === 'string') {
            if (conv) {
              conv.sessionId = event
              // 同步本地 id 为真实 session_id
              if (convId.startsWith('local_')) {
                const oldId = convId
                conv.id = event
                currentConversationId.value = event
                messagesMap.value[event] = messagesMap.value[oldId]
                delete messagesMap.value[oldId]
                convId = event  // 更新闭包中的 convId
              }
            }
            return
          }

          if (!msg) return

          switch (event.type) {
            case 'content':
              if (!msg.isStreaming) msg.isStreaming = true
              msg.content += event.content
              isStreaming.value = true
              if (!msg.time) {
                msg.time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
              }
              break

            case 'done':
              msg.isStreaming = false
              isStreaming.value = false
              isLoading.value = false
              if (event.session_id && conv) {
                conv.sessionId = event.session_id
              }
              if (conv) {
                conv.lastMessage = msg.content.slice(0, 30) + (msg.content.length > 30 ? '...' : '')
                conv.time = new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
              }
              break

            case 'error':
              msg.content += (msg.content ? '\n' : '') + (event.content || '发生错误，请重试')
              msg.isStreaming = false
              isStreaming.value = false
              isLoading.value = false
              break

            case 'tool_call':
            case 'tool_result':
              break
          }
        }
      )
    } catch (e) {
      console.error('发送消息失败:', e)
      const msgList = messagesMap.value[convId]
      const msg = msgList ? msgList.find(m => m.id === assistantMsgId) : null
      if (msg) {
        msg.content = msg.content || '发送失败，请重试'
        msg.isStreaming = false
      }
      isStreaming.value = false
      isLoading.value = false
    }
  }

  /**
   * 删除会话
   */
  async function removeConversation(id) {
    const conv = conversations.value.find(c => c.id === id)
    try {
      if (conv?.sessionId) {
        await deleteSession(conv.sessionId)
      }
    } catch (e) {
      console.error('删除会话失败:', e)
      return
    }
    // 本地清理
    conversations.value = conversations.value.filter(c => c.id !== id)
    delete messagesMap.value[id]
    if (currentConversationId.value === id) {
      currentConversationId.value = null
    }
  }

  function backToList() {
    currentConversationId.value = null
  }

  return {
    modelList,
    selectedModelId,
    selectedModel,
    modelLoading,
    conversations,
    currentConversationId,
    messagesMap,
    isLoading,
    isStreaming,
    panelOpen,
    openPanel,
    closePanel,
    currentMessages,
    currentConversation,
    fetchModelList,
    selectModel,
    fetchSessionList,
    createConversation,
    sendMessage,
    openConversation,
    removeConversation,
    backToList
  }
})
