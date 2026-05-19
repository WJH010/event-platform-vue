// ================== User-End Event APIs ==================

/**
 * 报名活动
 * @param {object} data - 包含 event_id 和其他所需用户信息字段
 */
export function registerForEvent(eventId, data) {
  return request({
    url: `/events/${eventId}/registrations`,
    method: 'post',
    data
  })
}

/**
 * 查询当前用户是否已报名指定活动
 * @param {number} eventId - 活动ID
 */
export function isUserRegistered(eventId) {
  return request({
    url: `/events/${eventId}/registration`,
    method: 'get'
  })
}

/**
 * 取消报名活动
 * @param {number} eventId - 活动ID
 */
export function cancelRegistration(eventId) {
  return request({
    url: `/events/${eventId}/registrations`,
    method: 'delete'
  })
}

/**
 * 获取当前用户已报名的活动列表
 * @param {object} params - 查询参数，如 page, page_size, event_status
 */
export function getUserRegisteredEvents(params) {
  return request({
    url: '/events/registered',
    method: 'get',
    params
  })
}
import request from '@/utils/request'

// 分页查询活动列表
export function getEventList(params) {
  return request({
    url: '/events',
    method: 'get',
    params
  })
}

// 获取指定活动详情
export function getEventDetail(id) {
  return request({
    url: `/events/${id}`,
    method: 'get'
  })
}

// 创建活动
export function createEvent(data) {
  return request({
    url: '/events',
    method: 'post',
    data
  })
}

// 更新活动
export function updateEvent(id, data) {
  return request({
    url: `/events/${id}`,
    method: 'put',
    data
  })
}

// 删除活动
export function deleteEvent(id) {
  return request({
    url: `/events/${id}`,
    method: 'delete'
  })
}

// 分页查询报名指定活动的用户列表
export function getRegisteredUsers(eventId, params) {
  return request({
    url: `/events/${eventId}/registrations/users`,
    method: 'get',
    params
  })
}

// 文件上传（活动专用）
export function uploadEventImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('biz_type', 'EVENT')
  formData.append('biz_id', 0) // 创建时 biz_id 可为0或省略
  return request({
    url: '/files',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// 查询用户信息字段列表
export function getUserInfoFields(params) {
  return request({
    url: '/events/user-info-fields',
    method: 'get',
    params
  })
}