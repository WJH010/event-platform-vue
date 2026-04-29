<template>
  <div class="group-form-container">
    <el-card class="form-card">
      <template #header>
        <div class="card-header">
          <span>创建群聊</span>
        </div>
      </template>
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="群聊名称" prop="group_name">
          <el-input v-model="formData.group_name" placeholder="请输入群聊名称"></el-input>
        </el-form-item>
        <el-form-item label="群聊描述" prop="desc">
          <el-input
            v-model="formData.desc"
            type="textarea"
            :rows="4"
            placeholder="请输入群聊描述"
          ></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitForm" :loading="loading">立即创建</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createGroup } from '@/api/chat'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)

const formData = reactive({
  group_name: '',
  desc: ''
})

const formRules = {
  group_name: [
    { required: true, message: '请输入群聊名称', trigger: 'blur' }
  ],
  desc: [
    { required: true, message: '请输入群聊描述', trigger: 'blur' }
  ]
}

const submitForm = () => {
  formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        await createGroup(formData)
        ElMessage.success('群聊创建成功')
        router.push('/chat-groups')
      } catch (error) {
        console.error('创建群聊失败:', error)
        ElMessage.error('群聊创建失败，请稍后重试')
      } finally {
        loading.value = false
      }
    }
  })
}

const resetForm = () => {
  formRef.value.resetFields()
}
</script>

<style scoped>
.group-form-container {
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.form-card {
  width: 600px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>