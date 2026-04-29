<template>
  <div class="user-info-page">
    <div class="page-header">
      <h2>个人信息管理</h2>
      <p>完善和修改您的个人资料</p>
    </div>

    <div class="info-card">
      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="formRules"
        label-width="100px"
        class="info-form"
      >
        <!-- 头像上传（对接后端官方接口） -->
        <el-form-item label="头像">
          <el-upload
            class="avatar-uploader"
            :show-file-list="false"
            :before-upload="handleBeforeAvatarUpload"
            :http-request="customUpload"
            accept="image/png,image/jpeg,image/jpg"
            :limit="1"
          >
            <img
              :src="userForm.avatar_url || defaultCover"
              class="avatar-preview"
              alt="用户头像"
            />
            <div class="avatar-tip">{{ uploadLoading ? "上传中..." : "点击上传头像" }}</div>
          </el-upload>
        </el-form-item>

        <!-- 基础信息 -->
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="昵称" prop="nickname">
              <el-input v-model="userForm.nickname" placeholder="请输入昵称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="真实姓名" prop="name">
              <el-input v-model="userForm.name" placeholder="请输入真实姓名" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone_number">
              <el-input v-model="userForm.phone_number" placeholder="请输入手机号" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="userForm.email" placeholder="请输入邮箱" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="性别">
              <el-radio-group v-model="userForm.gender_code">
                <el-radio label="M">男</el-radio>
                <el-radio label="F">女</el-radio>
                <el-radio label="U">未知</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="行业">
              <el-select v-model="userForm.industry" placeholder="请选择行业" clearable>
                <el-option
                  v-for="item in industryList"
                  :key="item.industry_code"
                  :label="item.industry_name"
                  :value="item.industry_code"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 单位/部门/职位 -->
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="单位" prop="unit">
              <el-input v-model="userForm.unit" placeholder="请输入单位名称" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="部门" prop="department">
              <el-input v-model="userForm.department" placeholder="请输入部门名称" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="职位" prop="position">
              <el-input v-model="userForm.position" placeholder="请输入职位名称" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 提交按钮 -->
        <el-form-item class="btn-group">
          <el-button type="primary" @click="handleSubmit" :loading="loading">保存修改</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../store/user'
import { getUserInfo, updateUserInfo, getIndustryList, uploadFile } from '../api/user'

// 常量配置
import defaultCover from '../assets/images/default/Default_cover.png'
const INDUSTRY_CACHE_KEY = 'industry_list_cache'
const CACHE_EXPIRE = 24 * 60 * 60 * 1000

// 状态管理
const userStore = useUserStore()
const loading = ref(false)
const uploadLoading = ref(false) // 头像上传加载
const userFormRef = ref(null)
const industryList = ref([])
const originalForm = ref({}) // 原始数据（对比修改）

// 表单数据
const userForm = reactive({
  nickname: '',
  avatar_url: '',
  name: '',
  gender_code: 'U',
  phone_number: '',
  email: '',
  unit: '',
  department: '',
  position: '',
  industry: ''
})

// 表单校验
const formRules = reactive({
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  name: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  phone_number: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式错误', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式错误', trigger: 'blur' }]
})

// 深拷贝（修复报错）
const deepClone = (obj) => JSON.parse(JSON.stringify(obj))

// ======================
// 🔥 头像上传核心逻辑
// ======================
// 上传前校验
const handleBeforeAvatarUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isImage) ElMessage.error('只能上传图片文件！')
  if (!isLt2M) ElMessage.error('图片大小不能超过2MB！')
  return isImage && isLt2M
}

// 自定义上传（对接后端 /file/upload 接口）
const customUpload = async (params) => {
  try {
    uploadLoading.value = true
    const file = params.file
    const userId = userStore.userInfo.id || 0 // 获取用户ID作为biz_id
    
    // 调用后端上传接口
    const res = await uploadFile(file, 'AVATAR', userId)
    
    // 赋值返回的图片URL
    userForm.avatar_url = res.data.url
    ElMessage.success('头像上传成功')
  } catch (e) {
    ElMessage.error('头像上传失败：' + (e.message || '服务器错误'))
    console.error(e)
  } finally {
    uploadLoading.value = false
  }
}

// ======================
// 行业列表缓存
// ======================
const getIndustryListWithCache = async () => {
  try {
    const cache = localStorage.getItem(INDUSTRY_CACHE_KEY)
    if (cache) {
      const { data, expireTime } = JSON.parse(cache)
      if (Date.now() < expireTime) {
        industryList.value = data
        return
      }
    }
    const res = await getIndustryList()
    industryList.value = res.data
    localStorage.setItem(INDUSTRY_CACHE_KEY, JSON.stringify({
      data: res.data,
      expireTime: Date.now() + CACHE_EXPIRE
    }))
  } catch (e) {
    ElMessage.error('行业列表加载失败')
  }
}

// ======================
// 增量更新：获取修改字段
// ======================
const getChangedData = () => {
  const changed = {}
  Object.keys(userForm).forEach(key => {
    if (key === 'phone_number') return // 跳过不可修改字段
    if (userForm[key] !== originalForm.value[key]) {
      changed[key] = userForm[key]
    }
  })
  return changed
}

// 初始化数据
const initData = async () => {
  try {
    await getIndustryListWithCache()
    const userRes = await getUserInfo()
    Object.assign(userForm, userRes.data)
    originalForm.value = deepClone(userForm) // 保存原始数据
  } catch (e) {
    ElMessage.error('数据加载失败，请刷新重试')
  }
}

// 提交修改（仅传修改字段）
const handleSubmit = async () => {
  if (!userFormRef.value) return
  try {
    await userFormRef.value.validate()
    loading.value = true

    const submitData = getChangedData()
    if (Object.keys(submitData).length === 0) {
      ElMessage.info('未修改任何内容')
      return
    }

    // 调用更新接口
    await updateUserInfo(submitData)
    ElMessage.success('个人信息修改成功')
    
    // 更新原始数据
    originalForm.value = deepClone(userForm)
    // 同步全局用户信息
    const newUserInfo = await getUserInfo()
    userStore.setUserInfo(newUserInfo.data)
  } catch (e) {
    ElMessage.error('修改失败：' + (e.message || '服务器错误'))
  } finally {
    loading.value = false
  }
}

// 重置表单
const resetForm = () => {
  userFormRef.value?.resetFields()
  Object.assign(userForm, originalForm.value)
}

onMounted(() => initData())
</script>

<style scoped>
.user-info-page { padding: 20px; }
.page-header { margin-bottom: 20px; }
.page-header h2 { font-size: 20px; color: #333; margin-bottom: 8px; }
.page-header p { color: #999; font-size: 14px; }
.info-card { background: #fff; border-radius: 8px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }

.avatar-uploader { display: flex; align-items: center; gap: 16px; cursor: pointer; }
.avatar-preview { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 1px solid #eee; }
.avatar-tip { color: #666; font-size: 12px; }

.btn-group { margin-top: 20px; text-align: center; }
.el-form-item { margin-bottom: 16px; }
</style>