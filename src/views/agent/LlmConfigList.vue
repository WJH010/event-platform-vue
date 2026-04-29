<template>
  <div class="llm-config-page">
    <div class="page-header">
      <h2>LLM配置管理</h2>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        新增配置
      </el-button>
    </div>

    <!-- 列表 -->
    <div class="list-card">
      <el-table :data="configList" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="display_name" label="配置名称" min-width="150" />
        <el-table-column prop="provider_type" label="提供商" width="140">
          <template #default="{ row }">
            <el-tag>{{ providerDisplayName(row.provider_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="model_name" label="模型名称" min-width="160" />
        <el-table-column prop="api_url" label="API地址" min-width="220" show-overflow-tooltip />
        <el-table-column prop="api_key" label="API Key" width="180" show-overflow-tooltip />
        <el-table-column prop="is_enabled" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_enabled === 1 ? 'success' : 'info'" size="small">
              {{ row.is_enabled === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" size="small" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <div class="empty" v-if="configList.length === 0 && !loading">暂无配置数据</div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑LLM配置' : '新增LLM配置'"
      width="560px"
      :close-on-click-modal="false"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="提供商" prop="provider_type">
          <el-select
            v-model="formData.provider_type"
            placeholder="请选择提供商"
            style="width: 100%"
            :teleported="false"
            @change="onProviderChange"
          >
            <el-option
              v-for="p in providerList"
              :key="p.type"
              :label="p.display_name"
              :value="p.type"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="配置名称" prop="display_name">
          <el-input v-model="formData.display_name" placeholder="请输入配置名称" />
        </el-form-item>
        <el-form-item label="模型名称" prop="model_name">
          <el-select
            v-model="formData.model_name"
            filterable
            allow-create
            default-first-option
            placeholder="请选择或输入模型名称"
            style="width: 100%"
            :teleported="false"
          >
            <el-option
              v-for="m in currentPopularModels"
              :key="m"
              :label="m"
              :value="m"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="API地址" prop="api_url">
          <el-input v-model="formData.api_url" placeholder="请输入API地址" />
        </el-form-item>
        <el-form-item label="API Key" prop="api_key" v-if="currentProviderNeedKey">
          <el-input v-model="formData.api_key" placeholder="请输入API Key" show-password />
        </el-form-item>
        <el-form-item label="状态" prop="is_enabled">
          <el-switch
            v-model="formData.is_enabled"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getLlmConfigList, getLlmProviders, createLlmConfig, updateLlmConfig, deleteLlmConfig } from '../../api/llmConfig'

const loading = ref(false)
const configList = ref([])
const providerList = ref([])

// 弹窗相关
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)
const editingId = ref(null)

const formData = reactive({
  provider_type: '',
  display_name: '',
  model_name: '',
  api_url: '',
  api_key: '',
  is_enabled: 1
})

// 当前选中的提供商是否需要 API Key
const currentProviderNeedKey = computed(() => {
  const p = providerList.value.find(item => item.type === formData.provider_type)
  return p ? p.need_api_key : true
})

// 当前提供商的热门模型列表
const currentPopularModels = computed(() => {
  const p = providerList.value.find(item => item.type === formData.provider_type)
  return p?.popular_models || []
})

// 动态校验规则：API Key 按需必填
const formRules = computed(() => ({
  provider_type: [{ required: true, message: '请选择提供商', trigger: 'change' }],
  display_name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
  model_name: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
  api_url: [{ required: true, message: '请输入API地址', trigger: 'blur' }],
  api_key: currentProviderNeedKey.value
    ? [{ required: true, message: '请输入API Key', trigger: 'blur' }]
    : []
}))

// 提供商显示名
const providerDisplayName = (type) => {
  const p = providerList.value.find(item => item.type === type)
  return p ? p.display_name : type
}

// 切换提供商时自动填充默认URL，清空模型和API Key
const onProviderChange = (type) => {
  const p = providerList.value.find(item => item.type === type)
  if (p) {
    // 新增时自动填充默认地址，编辑时仅在不匹配时填充
    if (!isEdit.value || !formData.api_url) {
      formData.api_url = p.default_url || ''
    }
    formData.model_name = ''
    if (!p.need_api_key) {
      formData.api_key = ''
    }
  }
}

// 获取提供商列表
const fetchProviders = async () => {
  try {
    const res = await getLlmProviders()
    providerList.value = res.data || []
  } catch (e) {
    console.error('获取提供商列表失败:', e)
  }
}

// 获取配置列表
const getList = async () => {
  try {
    loading.value = true
    const res = await getLlmConfigList()
    configList.value = res.data || []
  } catch (e) {
    ElMessage.error('获取LLM配置列表失败')
  } finally {
    loading.value = false
  }
}

// 重置表单
const resetForm = () => {
  formData.provider_type = ''
  formData.display_name = ''
  formData.model_name = ''
  formData.api_url = ''
  formData.api_key = ''
  formData.is_enabled = 1
  editingId.value = null
  nextTick(() => formRef.value?.clearValidate())
}

// 新增
const handleCreate = () => {
  isEdit.value = false
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row) => {
  isEdit.value = true
  editingId.value = row.id
  formData.provider_type = row.provider_type
  formData.display_name = row.display_name
  formData.model_name = row.model_name
  formData.api_url = row.api_url
  formData.api_key = row.api_key
  formData.is_enabled = row.is_enabled
  dialogVisible.value = true
}

// 提交
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
  } catch { return }

  submitLoading.value = true
  try {
    const data = { ...formData }
    // 不需要 API Key 的提供商，不传该字段
    if (!currentProviderNeedKey.value) {
      delete data.api_key
    }
    if (isEdit.value) {
      await updateLlmConfig(editingId.value, data)
      ElMessage.success('更新成功')
    } else {
      await createLlmConfig(data)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    getList()
  } catch (e) {
    // 错误已由拦截器处理
  } finally {
    submitLoading.value = false
  }
}

// 删除
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除配置「${row.display_name}」？`, '提示', { type: 'warning' })
    await deleteLlmConfig(row.id)
    ElMessage.success('删除成功')
    getList()
  } catch {
    // 取消或错误
  }
}

onMounted(() => {
  fetchProviders()
  getList()
})
</script>

<style scoped>
.llm-config-page { padding: 20px; }
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header h2 { margin: 0; font-size: 18px; }
.list-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}
.empty { text-align: center; padding: 40px; color: #999; }
</style>
