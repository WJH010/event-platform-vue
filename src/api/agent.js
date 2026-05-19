import request from '../utils/request'

// ========== 模型配置相关 ==========

/**
 * 获取可选模型列表
 * GET /agent/llm-configs
 */
export function getModelList() {
  return request.get('/agent/llm-configs')
}

/**
 * 设置用户模型偏好
 * POST /agent/llm-configs/user-preference
 * @param {number} llm_config_id - 模型配置ID
 */
export function setModelPreference(llm_config_id) {
  return request.put('/agent/llm-configs/user-preference', { llm_config_id })
}

// ========== 会话相关 ==========

/**
 * 获取会话列表
 * GET /agent/sessions
 */
export function getSessionList() {
  return request.get('/agent/sessions')
}

/**
 * 获取指定会话的消息列表
 * GET /agent/sessions/{id}/messages
 * @param {string} sessionId - 会话ID
 */
export function getSessionMessages(sessionId) {
  return request.get(`/agent/sessions/${sessionId}/messages`)
}

/**
 * 删除会话
 * DELETE /agent/sessions/{id}
 * @param {string} sessionId - 会话ID
 */
export function deleteSession(sessionId) {
  return request.delete(`/agent/sessions/${sessionId}`)
}

/**
 * 发送聊天消息（SSE 流式）
 * POST /agent/chat
 * @param {Object} params - { content, sessionId? }
 * @param {Function} onEvent - 事件回调
 * @returns {Promise<void>}
 */
export function sendChatStream({ content, sessionId }, onEvent) {
  const token = localStorage.getItem('access_token')
  const body = { content }
  if (sessionId) body.session_id = sessionId

  return fetch('/api/agent/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  }).then(async response => {
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status}: ${text}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        let data = trimmed
        if (data.startsWith('data:')) {
          data = data.slice(5).trim()
        }
        if (!data) continue

        try {
          const parsed = JSON.parse(data)
          onEvent(parsed)
        } catch {
          // 非 JSON → session_id 字符串
          const cleaned = data.replace(/^"|"$/g, '')
          if (cleaned) onEvent(cleaned)
        }
      }
    }

    // 处理缓冲区剩余
    if (buffer.trim()) {
      let data = buffer.trim()
      if (data.startsWith('data:')) data = data.slice(5).trim()
      try {
        const parsed = JSON.parse(data)
        onEvent(parsed)
      } catch {
        const cleaned = data.replace(/^"|"$/g, '')
        if (cleaned) onEvent(cleaned)
      }
    }
  })
}
