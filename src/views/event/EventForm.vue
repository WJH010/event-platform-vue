<template>
  <div class="event-form-page">
    <div class="top-action-bar">
      <div>
        <el-button @click="handleBack">返回列表</el-button>
        <span class="title">{{ isEdit ? '编辑活动' : '创建新活动' }}</span>
      </div>
      <div class="right-btns">
        <el-button @click="handleBack">取消</el-button>
        <el-button type="primary" @click="submit" :loading="loading">保存活动</el-button>
      </div>
    </div>

    <div class="form-card">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="140px">
        <el-form-item label="活动标题" prop="title">
          <el-input v-model="formData.title" placeholder="请输入活动标题" />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="活动开始时间" prop="event_start_time">
              <el-date-picker v-model="formData.event_start_time" type="datetime" placeholder="选择日期时间" style="width: 100%;" format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="活动结束时间" prop="event_end_time">
              <el-date-picker v-model="formData.event_end_time" type="datetime" placeholder="选择日期时间" style="width: 100%;" format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="报名开始时间" prop="registration_start_time">
              <el-date-picker v-model="formData.registration_start_time" type="datetime" placeholder="选择日期时间" style="width: 100%;" format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="报名截止时间" prop="registration_end_time">
              <el-date-picker v-model="formData.registration_end_time" type="datetime" placeholder="选择日期时间" style="width: 100%;" format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="活动地点" prop="event_address">
          <el-input v-model="formData.event_address" placeholder="请输入活动地点" />
        </el-form-item>

        <el-form-item label="报名费用" prop="registration_fee">
          <el-input-number v-model="formData.registration_fee" :precision="2" :step="1" :min="0" />
        </el-form-item>

        <el-form-item label="最大报名人数" prop="max_registrants">
          <el-input-number v-model="formData.max_registrants" :min="0" :step="1" placeholder="0表示不限" />
          <span style="margin-left: 10px; color: #909399; font-size: 13px;">0 表示不限制报名人数</span>
        </el-form-item>

        <el-form-item label="活动封面URL" prop="cover_image_url">
          <el-upload
            :show-file-list="false"
            :before-upload="beforeCoverUpload"
            :http-request="uploadCover"
            class="cover-uploader"
          >
            <img v-if="formData.cover_image_url" :src="formData.cover_image_url" class="cover-preview" />
            <el-icon v-else class="cover-uploader-icon"><Plus /></el-icon>
            <div class="tip">点击上传封面</div>
          </el-upload>
        </el-form-item>

        <el-form-item label="所需用户信息" prop="user_info_id_list">
          <el-select v-model="formData.user_info_id_list" multiple placeholder="请选择" style="width: 100%;" :disabled="isEdit">
            <el-option v-for="item in userInfoFields" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="活动详情" prop="detail">
          <div class="editor-container">
            <Toolbar
              :editor="editorRef"
              :default-config="editorConfig"
              class="editor-toolbar"
            />
            <Editor
              v-model="formData.detail"
              :default-config="editorConfig"
              class="editor-content"
              @onCreated="handleEditorCreated"
            />
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="submit" :loading="loading">保存</el-button>
          <el-button @click="handleBack">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { createEvent, updateEvent, getEventDetail, getUserInfoFields, uploadEventImage } from '../../api/event'
import { isEqual, cloneDeep } from 'lodash-es'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import { Plus } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const isEdit = !!id

const loading = ref(false)
const formRef = ref(null)
const userInfoFields = ref([])
let originalFormData = {}

// 富文本编辑器
const editorRef = shallowRef(null)
const editorConfig = {
  placeholder: '请输入活动详情...',
  MENU_CONF: {
    uploadImage: {
      async customUpload(file, insertFn) {
        try {
          const res = await uploadEventImage(file)
          insertFn(res.data.url, res.data.alt, res.data.url)
          ElMessage.success('图片上传成功')
        } catch (err) {
          ElMessage.error('图片上传失败')
        }
      }
    }
  }
}

const handleEditorCreated = (editor) => {
  editorRef.value = editor
}

onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor == null) return
  editor.destroy()
})

const formData = reactive({
  title: '',
  detail: '',
  event_start_time: '',
  event_end_time: '',
  registration_start_time: '',
  registration_end_time: '',
  event_address: '',
  registration_fee: 0,
  max_registrants: 0,
  cover_image_url: '',
  image_id_list: [],
  user_info_id_list: []
})

const formRules = {
  title: [{ required: true, message: '请输入活动标题', trigger: 'blur' }],
  event_start_time: [{ required: true, message: '请选择活动开始时间', trigger: 'change' }],
  event_end_time: [{ required: true, message: '请选择活动结束时间', trigger: 'change' }],
  registration_start_time: [{ required: true, message: '请选择报名开始时间', trigger: 'change' }],
  registration_end_time: [{ required: true, message: '请选择报名截止时间', trigger: 'change' }],
  event_address: [{ required: true, message: '请输入活动地点', trigger: 'blur' }],
  detail: [{ required: true, message: '请输入活动详情', trigger: 'blur' }],
  user_info_id_list: [{ required: true, message: '请选择所需用户信息', trigger: 'change' }],
  cover_image_url: [{ type: 'url', message: '请输入有效的URL', trigger: 'blur' }]
}

const fetchUserInfoFields = async () => {
  try {
    const res = await getUserInfoFields({ is_deleted: 'N' })
    userInfoFields.value = res.data
  } catch (error) {
    ElMessage.error('获取用户信息字段失败')
  }
}

const fetchEventDetail = async () => {
  if (!isEdit) return
  try {
    const res = await getEventDetail(route.params.id)
    const data = res.data
    const processedData = {
      ...data,
      user_info_id_list: data.user_info.map(item => item.user_info_id)
    }
    Object.assign(formData, processedData)
    originalFormData = cloneDeep(processedData) // 保存原始数据副本
  } catch (error) {
    ElMessage.error('获取活动详情失败')
  }
}

const getChangedFields = () => {
  const changedFields = {}
  for (const key in formData) {
    // lodash.isEqual can do deep comparisons, which is great for arrays/objects
    if (!isEqual(formData[key], originalFormData[key])) {
      changedFields[key] = formData[key]
    }
  }
  return changedFields
}

const submit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        let payload
        if (isEdit) {
          payload = getChangedFields()
          if (Object.keys(payload).length === 0) {
            ElMessage.info('未作任何修改')
            loading.value = false
            return
          }
        } else {
          payload = { ...formData }
        }

        // The backend expects string dates, but the model can be a Date object.
        // We manually format them to ensure correctness.
        const dateFields = ['event_start_time', 'event_end_time', 'registration_start_time', 'registration_end_time']
        dateFields.forEach(field => {
          if (payload[field]) {
            const d = new Date(payload[field])
            const year = d.getFullYear()
            const month = (d.getMonth() + 1).toString().padStart(2, '0')
            const day = d.getDate().toString().padStart(2, '0')
            const hours = d.getHours().toString().padStart(2, '0')
            const minutes = d.getMinutes().toString().padStart(2, '0')
            const seconds = d.getSeconds().toString().padStart(2, '0')
            payload[field] = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
          }
        })

        if (isEdit) {
          await updateEvent(id, payload)
          ElMessage.success('更新成功')
        } else {
          await createEvent(payload)
          ElMessage.success('创建成功')
        }
        router.push('/events')
      } catch (error) {
        const message = error?.response?.data?.message || (isEdit ? '更新失败，请检查表单内容' : '创建失败，请检查表单内容');
        ElMessage.error(message)
      } finally {
        loading.value = false
      }
    }
  })
}

const handleBack = () => {
  router.push('/events')
}

const toGroupDetail = () => {
  if (formData.group_id) {
    router.push(`/message-groups/detail/${formData.group_id}`)
  }
}

// 封面上传
const beforeCoverUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isImage) ElMessage.error('只能上传图片文件！')
  if (!isLt5M) ElMessage.error('图片大小不能超过5MB！')
  return isImage && isLt5M
}
const uploadCover = async (options) => {
  try {
    const res = await uploadEventImage(options.file)
    formData.cover_image_url = res.data.url
    ElMessage.success('封面上传成功')
  } catch (error) {
    ElMessage.error('封面上传失败')
  }
}

onMounted(() => {
  fetchUserInfoFields()
  fetchEventDetail()
})
</script>

<style scoped>
.event-form-page {
  background-color: #f0f2f5;
  min-height: 100vh;
}
.top-action-bar {
  position: sticky;
  top: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,.08);
  z-index: 1000;
  border-bottom: 1px solid #f0f0f0;
}
.top-action-bar .title {
  font-size: 18px;
  font-weight: 600;
  margin-left: 16px;
}
.form-card {
  background: #fff;
  padding: 30px 20px;
  margin: 20px;
  border-radius: 8px;
}
.editor-container {
  border: 1px solid #ccc;
  border-radius: 4px;
}
.editor-toolbar {
  border-bottom: 1px solid #ccc;
}
.editor-content {
  height: 500px; 
}

.cover-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  width: 178px;
  height: 178px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  color: #8c939d;
  transition: var(--el-transition-duration-fast);
}
.cover-uploader:hover {
  border-color: var(--el-color-primary);
}
.cover-uploader-icon {
  font-size: 28px;
}
.cover-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
}
.tip {
  font-size: 12px;
  margin-top: 8px;
}
</style>