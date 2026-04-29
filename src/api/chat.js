import request from '@/utils/request'

export function createGroup(data) {
  return request({
    url: '/chat/groups',
    method: 'post',
    data
  })
}

export function getAllGroups(params) {
  return request({
    url: '/chat/allGroups',
    method: 'get',
    params
  })
}

export function deleteGroup(groupId) {
  return request({
    url: `/chat/groups/${groupId}`,
    method: 'delete'
  })
}

export function addMembersToGroup(groupId, data) {
  return request({
    url: `/chat/groups/${groupId}/members`,
    method: 'post',
    data
  })
}

export function getNotInGroupMembers(groupId, params) {
  return request({
    url: `/chat/groups/${groupId}/notInMembers`,
    method: 'get',
    params
  })
}

export function getGroupMembers(groupId, params) {
  return request({
    url: `/chat/groups/${groupId}/members`,
    method: 'get',
    params
  })
}

export function removeMembersFromGroup(groupId, data) {
  return request({
    url: `/chat/groups/${groupId}/members`,
    method: 'delete',
    data
  })
}

export function getGroupMessages(groupId, params) {
  return request({
    url: `/chat/groups/${groupId}/messages`,
    method: 'get',
    params
  })
}

export function getUserGroups() {
  return request({
    url: '/chat/groups',
    method: 'get'
  })
}