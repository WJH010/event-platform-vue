<template>
  <div class="chat-group-detail-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>群聊详情 (ID: {{ groupId }})</span>
          <el-button @click="goBack">返回列表</el-button>
        </div>
      </template>

      <div class="actions-bar">
        <el-button type="primary" @click="openAddMemberDialog">添加成员</el-button>
        <el-button type="danger" @click="handleBulkRemoveMembers" :disabled="selectedMemberIds.length === 0">批量移除</el-button>
      </div>

      <!-- 成员列表 -->
      <div class="member-list">
        <h3>成员列表</h3>
        <el-table :data="memberList" v-loading="memberListLoading" @selection-change="handleMemberSelectionChange" border>
          <el-table-column type="selection" width="55" />
          <el-table-column label="头像" width="80">
            <template #default="scope">
              <el-avatar :src="scope.row.avatar_url" />
            </template>
          </el-table-column>
          <el-table-column prop="user_id" label="用户ID" width="100" />
          <el-table-column prop="name" label="姓名" />
          <el-table-column prop="nickname" label="昵称" />
          <el-table-column label="操作" width="120">
            <template #default="scope">
              <el-button type="danger" size="small" @click="handleRemoveMember(scope.row.user_id)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          class="member-pagination"
          layout="prev, pager, next"
          :total="memberPagination.total"
          :page-size="memberPagination.pageSize"
          :current-page="memberPagination.page"
          @current-change="handleMemberPageChange"
        />
      </div>
    </el-card>

    <!-- 添加成员弹窗 -->
    <el-dialog v-model="addMemberDialogVisible" title="添加成员" width="70%">
      <div class="user-selector-container">
        <div class="user-search-bar">
          <el-form :inline="true" :model="userPagination" @submit.prevent="handleUserSearch">
            <el-form-item label="姓名">
              <el-input
                v-model="userPagination.name"
                clearable
                @clear="handleUserSearch"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleUserSearch">搜索</el-button>
            </el-form-item>
          </el-form>
        </div>
        <el-table
          :data="userList"
          v-loading="userListLoading"
          @selection-change="handleUserSelectionChange"
          border
          height="300px"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="user_id" label="用户ID" width="100" />
          <el-table-column prop="name" label="姓名" />
          <el-table-column prop="nickname" label="昵称" />
          <el-table-column prop="phone_number" label="手机号" />
        </el-table>
        <el-pagination
          class="user-pagination"
          layout="prev, pager, next"
          :total="userPagination.total"
          :page-size="userPagination.pageSize"
          :current-page="userPagination.page"
          @current-change="handleUserPageChange"
        />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addMemberDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleAddMembers" :loading="addMemberLoading">
            确认添加
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { addMembersToGroup, getNotInGroupMembers, getGroupMembers, removeMembersFromGroup } from '@/api/chat'

const route = useRoute()
const router = useRouter()

const groupId = ref(null)
const addMemberDialogVisible = ref(false)
const addMemberLoading = ref(false)

const userList = ref([])
const userListLoading = ref(false)
const userPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
  name: ''
})
const selectedUserIds = ref([])

const memberList = ref([])
const memberListLoading = ref(false)
const memberPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})
const selectedMemberIds = ref([])

onMounted(() => {
  groupId.value = route.params.id
  fetchMemberList()
})

const goBack = () => {
  router.push('/chat-groups')
}

const fetchMemberList = async () => {
  memberListLoading.value = true
  try {
    const res = await getGroupMembers(groupId.value, {
      page: memberPagination.page,
      pageSize: memberPagination.pageSize
    })
    memberList.value = res.data.list
    memberPagination.total = res.data.total
  } catch (error) {
    console.error('获取成员列表失败:', error)
    ElMessage.error('获取成员列表失败')
  } finally {
    memberListLoading.value = false
  }
}

const handleMemberPageChange = (page) => {
  memberPagination.page = page
  fetchMemberList()
}

const handleMemberSelectionChange = (selection) => {
  selectedMemberIds.value = selection.map(member => member.user_id)
}

const openAddMemberDialog = () => {
  addMemberDialogVisible.value = true
  userPagination.page = 1
  userPagination.name = ''
  selectedUserIds.value = []
  fetchUserList()
}

const fetchUserList = async () => {
  userListLoading.value = true
  try {
    const res = await getNotInGroupMembers(groupId.value, {
      page: userPagination.page,
      pageSize: userPagination.pageSize,
      name: userPagination.name
    })
    userList.value = res.data.list
    userPagination.total = res.data.total
  } catch (error) {
    console.error('获取用户列表失败:', error)
    ElMessage.error('获取用户列表失败')
  } finally {
    userListLoading.value = false
  }
}

const handleUserSelectionChange = (selection) => {
  selectedUserIds.value = selection.map(user => user.user_id)
}

const handleUserSearch = () => {
  userPagination.page = 1
  fetchUserList()
}

const handleUserPageChange = (page) => {
  userPagination.page = page
  fetchUserList()
}

const handleAddMembers = async () => {
  if (selectedUserIds.value.length === 0) {
    ElMessage.error('请至少选择一个用户')
    return
  }

  addMemberLoading.value = true
  try {
    await addMembersToGroup(groupId.value, {
      user_ids: selectedUserIds.value,
      with_history: 'N' // 默认不附带历史消息，可以根据需要修改
    })
    ElMessage.success('添加成员成功')
    addMemberDialogVisible.value = false
    // 刷新成员列表
    fetchMemberList()
  } catch (error) {
    console.error('添加成员失败:', error)
    ElMessage.error('添加成员失败')
  } finally {
    addMemberLoading.value = false
  }
}

const handleRemoveMember = (userId) => {
  ElMessageBox.confirm('确定要将该用户移除群聊吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await removeMembersFromGroup(groupId.value, { user_ids: [userId] })
      ElMessage.success('移除成功')
      // 刷新成员列表
      fetchMemberList()
    } catch (error) {
      console.error('移除成员失败:', error)
      ElMessage.error('移除失败')
    }
  }).catch(() => {
    // 用户取消操作
  });
}

const handleBulkRemoveMembers = () => {
  if (selectedMemberIds.value.length === 0) {
    ElMessage.warning('请至少选择一个成员');
    return;
  }
  ElMessageBox.confirm(`确定要将选中的 ${selectedMemberIds.value.length} 个用户移除群聊吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await removeMembersFromGroup(groupId.value, { user_ids: selectedMemberIds.value })
      ElMessage.success('批量移除成功')
      // 刷新成员列表
      fetchMemberList()
    } catch (error) {
      console.error('批量移除成员失败:', error)
      ElMessage.error('批量移除失败')
    }
  }).catch(() => {
    // 用户取消操作
  });
}
</script>

<style scoped>
.chat-group-detail-container {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.actions-bar {
  margin-bottom: 20px;
}
.member-list h3 {
  margin-bottom: 15px;
  font-size: 18px;
}
.member-pagination {
  margin-top: 15px;
  justify-content: flex-end;
}
.user-search-bar {
  margin-bottom: 15px;
}
.user-pagination {
  margin-top: 15px;
  justify-content: flex-end;
}
</style>