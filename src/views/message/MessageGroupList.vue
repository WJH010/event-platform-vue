<template>
  <div class="message-group-page">
    <div class="page-header">
      <h2>消息群组管理</h2>
    </div>

    <!-- 搜索栏 -->
    <div class="search-card">
      <el-form :model="queryParams" inline @submit.prevent="getList">
        <el-form-item label="群组名称">
          <el-input v-model="queryParams.group_name" placeholder="请输入群组名称" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="getList">搜索</el-button>
          <el-button @click="resetQuery">重置</el-button>
          <el-button type="success" @click="openCreateDialog">创建群组</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 群组列表 -->
    <div class="list-card">
      <el-table :data="groupList" style="width: 100%">
        <el-table-column prop="id" label="群组ID" width="80" />
        <el-table-column label="群组名称" width="200">
            <template #default="scope">
                <el-link type="primary" @click="toDetail(scope.row.id)">{{ scope.row.group_name }}</el-link>
            </template>
        </el-table-column>
        <el-table-column prop="desc" label="群组描述" />
        <el-table-column label="关联活动" width="200">
          <template #default="scope">
            <el-link v-if="scope.row.event_id" type="primary" @click="toEventDetail(scope.row.event_id)">
              {{ scope.row.event_title }}
            </el-link>
            <span v-else>无</span>
          </template>
        </el-table-column>
        <el-table-column prop="member_count" label="群内人数" width="100" align="center" />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="toDetail(scope.row.id)">查看详情</el-button>
            <el-button type="warning" size="small" @click="openEditDialog(scope.row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <el-pagination
      v-model:current-page="queryParams.page"
      v-model:page-size="queryParams.page_size"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="getList"
      @current-change="getList"
    />

    <!-- 创建/编辑群组弹窗 -->
    <el-dialog :title="isEdit ? '编辑群组' : '创建群组'" v-model="dialogVisible" width="700px">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="120px">
        <el-form-item label="群组名称" prop="group_name">
          <el-input v-model="formData.group_name" placeholder="请输入群组名称" />
        </el-form-item>
        <el-form-item label="群组描述" prop="desc">
          <el-input v-model="formData.desc" type="textarea" :rows="3" placeholder="请输入群组描述" />
        </el-form-item>
        <el-form-item label="包含全体用户" prop="include_all_user">
          <el-switch v-model="formData.include_all_user" active-value="Y" inactive-value="N" />
        </el-form-item>

        <!-- 🔥 新增：创建群组时选择初始成员 -->
        <el-form-item label="初始群成员" v-if="!isEdit && formData.include_all_user === 'N'">
          <el-table :data="userList" @selection-change="handleUserSelection" border style="width: 100%">
            <el-table-column type="selection" width="55" />
            <el-table-column prop="user_id" label="用户ID" width="80" />
            <el-table-column prop="nickname" label="昵称" width="150" />
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column prop="phone_number" label="手机号" width="130" />
          </el-table>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="loading">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { getMessageGroupList, createGroup, updateGroup, deleteGroup, getAllUserList } from '../../api/message'

const router = useRouter()
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)

// 列表数据
const groupList = ref([])
const total = ref(0)
const queryParams = reactive({ page: 1, page_size: 10, group_name: '' })

// 表单数据（100%匹配接口入参）
const formData = reactive({
  id: null,
  group_name: '',
  desc: '',
  include_all_user: 'N',
  user_ids: [] // 初始成员ID数组
})

// 选择的用户列表
const userList = ref([])
const formRules = {
  group_name: [{ required: true, message: '请输入群组名称' }],
  desc: [{ required: true, message: '请输入群组描述' }]
}

// 获取群组列表
const getList = async () => {
  try {
    const res = await getMessageGroupList(queryParams)
    groupList.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (e) {
    ElMessage.error('获取列表失败')
  }
}

// 获取所有用户（创建群组选择成员）
const getUserList = async () => {
  try {
    const res = await getAllUserList({ page: 1, page_size: 100 })
    userList.value = res.data.list || []
  } catch (e) {
    ElMessage.error('获取用户列表失败')
  }
}

// 选择用户
const handleUserSelection = (val) => {
  formData.user_ids = val.map(item => item.user_id)
}

// 重置查询
const resetQuery = () => {
  queryParams.group_name = ''
  getList()
}

// 跳转详情
const toDetail = (id) => router.push(`/message-groups/detail/${id}`)

// 跳转到活动详情
const toEventDetail = (eventId) => {
  router.push(`/events/edit/${eventId}`)
}

// 打开创建弹窗
const openCreateDialog = () => {
  isEdit.value = false
  Object.assign(formData, { id: null, group_name: '', desc: '', include_all_user: 'N', user_ids: [] })
  getUserList() // 加载用户列表
  dialogVisible.value = true
}

// 打开编辑弹窗
const openEditDialog = (row) => {
  isEdit.value = true
  Object.assign(formData, row)
  dialogVisible.value = true
}

// 提交表单（🔥 完全匹配接口入参）
const submitForm = async () => {
  await formRef.value.validate()
  loading.value = true
  try {
    if (isEdit.value) {
      // 编辑：仅传名称+描述
      await updateGroup(formData.id, { group_name: formData.group_name, desc: formData.desc })
      ElMessage.success('编辑成功')
    } else {
      // 创建：传完整参数 group_name/desc/include_all_user/user_ids
      await createGroup(formData)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    getList()
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    loading.value = false
  }
}

// 删除群组
const handleDelete = async (id) => {
  await ElMessageBox.confirm('确定删除该群组？', '提示')
  await deleteGroup(id)
  ElMessage.success('删除成功')
  getList()
}

onMounted(() => getList())
</script>

<style scoped>
.message-group-page { padding: 20px; }
.page-header { margin-bottom: 20px; }
.search-card, .list-card { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
</style>