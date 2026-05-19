// src/api/article.js
import request from '../utils/request'

// ============== 文章接口 ==============
// 分页查询文章列表
export function getArticleList(params) {
  return request({
    url: '/articles',
    method: 'get',
    params
  })
}

// 查询文章详情
export function getArticleDetail(id) {
  return request({
    url: `/articles/${id}`,
    method: 'get'
  })
}

// 创建文章
export function createArticle(data) {
  return request({
    url: '/articles',
    method: 'post',
    data
  })
}

// 更新文章
export function updateArticle(id, data) {
  return request({
    url: `/articles/${id}`,
    method: 'put',
    data
  })
}

// 删除文章
export function deleteArticle(id) {
  return request({
    url: `/articles/${id}`,
    method: 'delete'
  })
}

// ============== 领域类型接口 ==============
export function getFieldTypeList() {
  return request({
    url: '/field-types',
    method: 'get'
  })
}

// ============== 文件上传（文章专用） ==============
export function uploadArticleImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('biz_type', 'ARTICLE')
  formData.append('biz_id', 0)
  return request({
    url: '/files',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}