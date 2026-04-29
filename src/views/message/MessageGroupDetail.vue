<template>
  <div class="group-detail-page">
    <!-- 顶部固定操作栏 -->
    <div class="top-action-bar">
      <div>
        <el-button @click="handleBack" icon="el-icon-arrow-left">返回列表</el-button>
        <el-button 
          v-if="groupInfo.event_id" 
          type="primary" 
          @click="toEventDetail(groupInfo.event_id)"
        >
          关联活动
        </el-button>
      </div>
      <div class="right-btns">
        <el-button type="warning" @click="openEditDialog">编辑群组</el-button>
        <el-button type="danger" @click="handleDelete">删除群组</el-button>
      </div>
    </div>

    <!-- 群组基础信息 -->
    <div class="info-card">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="群组名称" label-align="left">{{ groupInfo.group_name }}</el-descriptions-item>
        <el-descriptions-item label="群组描述" label-align="left">{{ groupInfo.desc }}</el-descriptions-item>
        <el-descriptions-item label="关联活动" label-align="left">
          <el-link 
            v-if="groupInfo.event_id" 
            type="primary" 
            @click="toEventDetail(groupInfo.event_id)"
          >
            查看详情
          </el-link>
          <span v-else>无</span>
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" class="detail-card">
      <!-- 群内消息 - 点击展开/收起 + 自动换行 -->
      <el-tab-pane label="群内消息" name="messages">
        <div class="message-section">
          <!-- 发送消息：富文本编辑器 -->
          <div class="send-box">
            <el-input v-model="messageForm.title" placeholder="请输入消息标题" style="margin-bottom: 10px" />
            <div class="editor-container">
              <Toolbar :editor="editorRef" :default-config="toolbarConfig" />
              <Editor v-model="messageForm.content" :default-config="editorConfig" @onCreated="handleEditorCreated" class="editor-content" />
            </div>
            <el-button type="primary" style="margin-top: 10px" @click="sendMessageFn" :loading="sending">发送消息</el-button>
          </div>

          <!-- 消息列表 -->
          <div class="message-expand-list">
            <div class="message-item-card" v-for="item in messageList" :key="item.id">
              <!-- 标题栏：点击展开/收起 -->
              <div class="item-header" @click="toggleMessage(item.id)">
                <div class="title-wrap">
                  <el-link type="primary" :underline="false" class="msg-title">
                    {{ item.title }}
                  </el-link>
                  <span class="send-time">{{ item.send_time }}</span>
                </div>
                <el-icon :class="{'rotate-icon': expandedMsgId === item.id}" size="16">
                  <ArrowDown />
                </el-icon>
              </div>

              <!-- 收起时显示摘要 -->
              <div class="item-summary" v-if="expandedMsgId !== item.id" v-html="getMessageSummary(item.content)"></div>

              <!-- 展开时显示完整内容（强制自动换行） -->
              <div 
                class="item-content" 
                v-if="expandedMsgId === item.id" 
                v-html="item.content"
              ></div>

              <!-- 操作按钮 -->
              <div class="item-footer" v-if="expandedMsgId === item.id">
                <el-button type="danger" size="small" @click.stop="revokeMessageFn(item.map_id)">撤销消息</el-button>
              </div>
            </div>
            <el-empty v-if="messageList.length === 0" description="暂无消息" />
          </div>

          <!-- 分页 -->
          <el-pagination
            v-model:current-page="msgQuery.page"
            v-model:page-size="msgQuery.page_size"
            :total="msgTotal"
            layout="total, sizes, prev, pager, next"
            style="text-align:center;margin-top:20px"
          />
        </div>
      </el-tab-pane>

      <!-- 群内用户 -->
      <el-tab-pane label="群内用户" name="users">
        <div class="user-section">
          <div class="user-header">
            <el-button type="success" @click="openAddUserDialog">添加用户</el-button>
          </div>
          <el-table :data="userList" style="width: 100%">
            <el-table-column prop="user_id" label="用户ID" width="80" />
            <el-table-column prop="nickname" label="昵称" width="150" />
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column prop="phone_number" label="手机号" width="130" />
            <el-table-column prop="unit" label="单位" />
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="scope">
                <el-button type="danger" size="small" @click="removeUserFn(scope.row.user_id)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 编辑群组 -->
    <el-dialog title="编辑群组" v-model="editDialogVisible" width="500px">
      <el-form ref="editFormRef" :model="editFormData" :rules="formRules" label-width="100px">
        <el-form-item label="群组名称" prop="group_name">
          <el-input v-model="editFormData.group_name" />
        </el-form-item>
        <el-form-item label="群组描述" prop="desc">
          <el-input v-model="editFormData.desc" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEditForm" :loading="loading">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加用户 -->
    <el-dialog title="添加用户" v-model="addUserDialogVisible" width="700px">
      <el-form :model="addUserQuery" inline style="margin-bottom: 10px">
        <el-form-item label="姓名">
          <el-input v-model="addUserQuery.name" placeholder="请输入姓名" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchNotInGroupUsers">搜索</el-button>
        </el-form-item>
      </el-form>
      <el-table :data="notInGroupUserList" @selection-change="handleSelectionChange" style="width: 100%">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="user_id" label="用户ID" width="80" />
        <el-table-column prop="nickname" label="昵称" width="150" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="phone_number" label="手机号" width="130" />
        <el-table-column prop="unit" label="单位" />
      </el-table>
      <template #footer>
        <el-button @click="addUserDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAddUser" :loading="adding">添加选中用户</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import { uploadArticleImage } from '../../api/article'

import {
  getGroupDetail, updateGroup, deleteGroup,
  getGroupMessages, sendMessage, revokeMessage,
  getGroupUsers, getNotInGroupUsers, addUserToGroup, removeUserFromGroup
} from '../../api/message'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const activeTab = ref('messages')

// 群组信息
const groupInfo = ref({})

// 加载状态
const loading = ref(false)
const sending = ref(false)
const adding = ref(false)

// 展开消息ID
const expandedMsgId = ref(null)

// 富文本编辑器
const editorRef = ref(null)
const toolbarConfig = {}
const editorConfig = {
  placeholder: '请输入消息内容...',
  MENU_CONF: {
    uploadImage: {
      async customUpload(file, insertFn) {
        const res = await uploadArticleImage(file)
        insertFn(res.data.url)
      }
    }
  }
}
const handleEditorCreated = (editor) => {
  editorRef.value = editor
}

// 消息分页
const msgQuery = reactive({ page: 1, page_size: 10 })
const msgTotal = ref(0)
const messageList = ref([])

// 消息表单
const messageForm = reactive({ title: '', content: '' })

// 用户列表
const userList = ref([])

// 编辑群组
const editDialogVisible = ref(false)
const editFormRef = ref(null)
const editFormData = reactive({ group_name: '', desc: '' })

// 添加用户
const addUserDialogVisible = ref(false)
const notInGroupUserList = ref([])
const selectedUserIds = ref([])
const addUserQuery = reactive({ name: '' })

// 校验规则
const formRules = {
  group_name: [{ required: true, message: '请输入群组名称' }],
  desc: [{ required: true, message: '请输入群组描述' }]
}

// 展开/收起消息
const toggleMessage = (msgId) => {
  expandedMsgId.value = expandedMsgId.value === msgId ? null : msgId
}

// 业务方法
const getDetail = async () => {
  try {
    const res = await getGroupDetail(id)
    groupInfo.value = res.data
    // 兼容旧的编辑弹窗逻辑
    Object.assign(editFormData, {
      group_name: res.data.group_name,
      desc: res.data.desc
    })
  } catch (e) {
    ElMessage.error('获取详情失败')
  }
}

const getMessages = async () => {
  try {
    const res = await getGroupMessages(id, msgQuery)
    messageList.value = res.data.list || []
    msgTotal.value = res.data.total || 0
    expandedMsgId.value = null
  } catch (e) {
    ElMessage.error('获取消息失败')
  }
}

const getUsers = async () => {
  try {
    const res = await getGroupUsers(id, { page: 1, page_size: 100 })
    userList.value = res.data.list || []
  } catch (e) {
    ElMessage.error('获取用户失败')
  }
}

const sendMessageFn = async () => {
  if (!messageForm.title || !messageForm.content) return ElMessage.warning('请输入标题和内容')
  sending.value = true
  try {
    await sendMessage(id, messageForm)
    ElMessage.success('发送成功')
    messageForm.title = ''
    messageForm.content = ''
    getMessages()
  } catch (e) {
    ElMessage.error('发送失败')
  } finally {
    sending.value = false
  }
}

const revokeMessageFn = async (mapId) => {
  await ElMessageBox.confirm('确定撤销该消息？', '提示')
  await revokeMessage(mapId)
  ElMessage.success('撤销成功')
  getMessages()
}

// 消息摘要
const getMessageSummary = (content) => {
  if (!content) return '无内容'
  if (content.includes('<img')) {
    return '<span style="color:#409eff">[图片] 点击标题查看完整内容</span>'
  }
  const text = content.replace(/<[^>]+>/g, '')
  return text.length > 50 ? text.substring(0, 50) + '...' : text
}

const removeUserFn = async (userId) => {
  await ElMessageBox.confirm('确定移除该用户？', '提示')
  await removeUserFromGroup(id, { user_ids: [userId] })
  ElMessage.success('移除成功')
  getUsers()
}

const openAddUserDialog = async () => {
  addUserQuery.name = ''
  selectedUserIds.value = []
  await fetchNotInGroupUsers()
  addUserDialogVisible.value = true
}

const fetchNotInGroupUsers = async () => {
  try {
    const res = await getNotInGroupUsers(id, { ...addUserQuery, page: 1, page_size: 100 })
    notInGroupUserList.value = res.data.list || []
  } catch (e) {
    ElMessage.error('获取用户失败')
  }
}

const handleSelectionChange = (val) => {
  selectedUserIds.value = val.map(i => i.user_id)
}

const submitAddUser = async () => {
  if (!selectedUserIds.value.length) return ElMessage.warning('请选择用户')
  adding.value = true
  try {
    await addUserToGroup(id, { user_ids: selectedUserIds.value })
    ElMessage.success('添加成功')
    addUserDialogVisible.value = false
    getUsers()
  } catch (e) {
    ElMessage.error('添加失败')
  } finally {
    adding.value = false
  }
}

const submitEditForm = async () => {
  await editFormRef.value.validate()
  loading.value = true
  try {
    await updateGroup(id, { group_name: editFormData.group_name, desc: editFormData.desc })
    ElMessage.success('编辑成功')
    editDialogVisible.value = false
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    loading.value = false
  }
}

const handleDelete = async () => {
  await ElMessageBox.confirm('确定删除该群组？', '提示')
  await deleteGroup(id)
  ElMessage.success('删除成功')
  router.push('/message-groups')
}

const handleBack = () => router.push('/message-groups')

const toEventDetail = (eventId) => {
  if (eventId) {
    router.push(`/events/edit/${eventId}`)
  }
}

onMounted(() => {
  getDetail()
  getMessages()
  getUsers()
})
</script>

<style scoped>
.group-detail-page { padding: 20px; }
.top-action-bar {
  position: sticky; top: 0; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.08);
  display: flex; align-items: center; justify-content: space-between; padding: 12px 20px;
  border-radius: 8px; margin-bottom: 20px; z-index: 999;
}
.right-btns { display: flex; gap: 10px; }
.info-card {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}
.detail-card { background: #fff; padding: 20px; border-radius: 8px; }
.send-box { padding: 15px; background: #f8f9fa; border-radius: 8px; margin-bottom: 20px; }
.editor-container { border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden; margin-top: 10px; }
.editor-content { min-height: 200px; }

/* 消息列表样式 */
.message-expand-list { margin-top: 20px; }
.message-item-card {
  background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 15px;
  margin-bottom: 12px; transition: all .3s;
}
.message-item-card:hover { border-color: #409eff; background: #fff; }

/* 标题栏 */
.item-header {
  display: flex; justify-content: space-between; align-items: center;
  cursor: pointer; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;
}
.title-wrap { display: flex; align-items: center; gap: 15px; }
.msg-title { font-size: 16px; font-weight: 500; }
.send-time { font-size: 12px; color: #999; }
.rotate-icon { transform: rotate(180deg); transition: transform .3s; }

/* 摘要 */
.item-summary { padding: 10px 0; color: #666; line-height: 1.5; }

/* ==================== 核心优化：强制自动换行 ==================== */
.item-content {
  padding: 15px 0; 
  line-height: 1.8; 
  color: #333;
  max-height: 60vh; 
  overflow-y: auto;
  /* 强制所有文本自动换行（全场景适配） */
  width: 100% !important;
  word-break: break-all;         /* 长单词/长链接强制换行 */
  overflow-wrap: break-word;     /* 自动换行 */
  white-space: pre-wrap;         /* 保留原文换行 + 自动换行 */
  box-sizing: border-box;
}
/* 图片自适应 + 内容不溢出 */
.item-content * {
  max-width: 100% !important;
  box-sizing: border-box;
  word-break: inherit;
}
.item-content img {
  height: auto !important;
  border-radius: 4px; 
  margin: 10px 0;
}

/* 操作栏 */
.item-footer { padding-top: 10px; text-align: right; border-top: 1px solid #f0f0f0; }

/* 用户区域 */
.user-header { margin-bottom: 15px; }
</style>