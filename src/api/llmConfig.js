import request from '../utils/request'

// 获取LLM配置列表
export function getLlmConfigList() {
  return request.get('/agent/llm-configs')
}

// 获取提供商列表
export function getLlmProviders() {
  return request.get('/agent/llm-configs/providers')
}

// 创建LLM配置
export function createLlmConfig(data) {
  return request.post('/agent/llm-configs', data)
}

// 更新LLM配置
export function updateLlmConfig(id, data) {
  return request.put(`/agent/llm-configs/${id}`, data)
}

// 删除LLM配置
export function deleteLlmConfig(id) {
  return request.delete(`/agent/llm-configs/${id}`)
}
