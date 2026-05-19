// src/api/message.js
import request from '../utils/request'

// ============== 消息群组接口 ==============
// 分页获取群组列表
export function getMessageGroupList(params) {
  return request({
    url: '/messages/groups',
    method: 'get',
    params
  })
}

// 获取群组详情
export function getGroupDetail(id) {
  return request({
    url: `/messages/groups/${id}`,
    method: 'get'
  })
}

// 创建群组
export function createGroup(data) {
  return request({
    url: '/messages/groups',
    method: 'post',
    data
  })
}

// 更新群组
export function updateGroup(id, data) {
  return request({
    url: `/messages/groups/${id}`,
    method: 'put',
    data
  })
}

// 删除群组
export function deleteGroup(id) {
  return request({
    url: `/messages/groups/${id}`,
    method: 'delete'
  })
}

// ============== 群内消息接口 ==============
// 获取群内消息列表
export function getGroupMessages(id, params) {
  return request({
    url: `/messages/groups/${id}/all`,
    method: 'get',
    params
  })
}

// 发送消息
export function sendMessage(id, data) {
  return request({
    url: `/messages/groups/${id}/messages`,
    method: 'post',
    data
  })
}

// 撤销消息
export function revokeMessage(id) {
  return request({
    url: `/messages/${id}`,
    method: 'delete'
  })
}

// ============== 群内用户接口 ==============
// 获取群内用户列表
export function getGroupUsers(id, params) {
  return request({
    url: `/messages/groups/${id}/users`,
    method: 'get',
    params
  })
}

// 获取不在群内的用户列表
export function getNotInGroupUsers(id, params) {
  return request({
    url: `/messages/groups/${id}/users/not-in`,
    method: 'get',
    params
  })
}

// 添加用户到群组
export function addUserToGroup(id, data) {
  return request({
    url: `/messages/groups/${id}/members`,
    method: 'post',
    data
  })
}

// 从群组移除用户
export function removeUserFromGroup(id, data) {
  return request({
    url: `/messages/groups/${id}/members`,
    method: 'delete',
    data
  })
}

// 获取全部用户列表
export function getAllUserList(params) {
  return request({
    url: '/users',
    method: 'get',
    params
  })
}

// 新增：获取消息详情
export function getMessageDetail(id) {
  return request({
    url: `/messages/${id}`,
    method: 'get'
  })
}

// ================== 用户端消息接口（新增）==================
// 1.分页查询当前用户消息群组列表
export function getUserMessageGroups(params) {
  return request({
    url: '/messages/groups',
    method: 'get',
    params
  })
}
// 2.分页查询组内消息列表
export function getGroupMessageList(groupId, params) {
  return request({
    url: `/messages/groups/${groupId}/messages`,
    method: 'get',
    params
  })
}
// 4.查询是否有未读消息
export function hasUnreadMessages(type_code = '') {
  return request({
    url: '/messages/unread',
    method: 'get',
    params: { type_code }
  })
}
// 5.标记当前用户所有消息为已读
export function markAllAsRead() {
  return request({
    url: '/messages/read',
    method: 'patch'
  })
}