import request from '../utils/request'

// 1. 登录
export function userLogin(data) {
  return request.post('/users/bg-login', data)
}

// 2. 刷新Token（内部自动调用）
export function refreshToken(data) {
  return request.post('/users/refresh-token', data)
}

// 3. 获取当前用户信息
export function getUserInfo() {
  return request.get('/users/me')
}

// 4. 退出登录
export function userLogout() {
  return request.post('/users/logout')
}

// 5. 更新用户信息
export function updateUserInfo(data) {
  return request({
    url: '/users/me',
    method: 'put',
    data
  })
}

// 6. 获取行业列表
export function getIndustryList() {
  return request({
    url: '/industries',
    method: 'get'
  })
}

// 头像上传
export function uploadFile(file, bizType, bizId) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('biz_type', bizType)
  formData.append('biz_id', bizId)
  return request({
    url: '/files',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}