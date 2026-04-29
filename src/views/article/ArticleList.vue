<template>
  <div class="article-list-page">
    <div class="page-header">
      <h2>文章列表</h2>
    </div>

    <!-- 筛选栏 - 修复下拉框宽度 -->
    <div class="search-card">
      <el-form :model="queryParams" inline @submit.prevent="getList">
        <el-form-item label="标题">
          <el-input 
            v-model="queryParams.article_title" 
            placeholder="请输入标题" 
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="文章类型">
          <el-select 
            v-model="queryParams.article_type" 
            placeholder="全部" 
            clearable
            style="width: 150px"
          >
            <el-option label="新闻" value="NEWS" />
            <el-option label="政策" value="POLICY" />
          </el-select>
        </el-form-item>
        <el-form-item label="领域类型">
          <el-select 
            v-model="queryParams.field_type" 
            placeholder="全部" 
            clearable
            style="width: 180px"
          >
            <el-option 
              v-for="item in fieldList" 
              :key="item.field_code" 
              :label="item.field_name" 
              :value="item.field_code" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="是否精选">
          <el-select 
            v-model="queryParams.is_selection" 
            placeholder="全部" 
            clearable
            style="width: 150px"
          >
            <el-option label="精选" value="1" />
            <el-option label="非精选" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="getList">搜索</el-button>
          <el-button @click="resetQuery">重置</el-button>
          <el-button type="success" @click="toCreate" v-if="isAdmin">创建文章</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 文章列表 - 真实数据 -->
    <div class="list-card">
      <div class="article-item" v-for="item in articleList" :key="item.article_id">
        <div class="cover">
          <img :src="item.cover_image_url || defaultCover" alt="封面" />
        </div>
        <div class="info">
          <div class="title">{{ item.article_title }}</div>
          <div class="meta">
            <el-tag size="small">{{ item.article_type === 'POLICY' ? '政策' : '新闻' }}</el-tag>
            <el-tag size="small" type="success" v-if="item.is_selection == 1">精选</el-tag>
            <span>{{ item.field_name }}</span>
            <span>{{ item.release_time }}</span>
            <span>来源：{{ item.article_source || '官方' }}</span>
          </div>
          <div class="desc">{{ item.brief_content }}</div>
          <div class="operate">
            <el-button type="primary" size="small" @click="toDetail(item.article_id)">查看详情</el-button>
            <el-button type="warning" size="small" @click="toEdit(item.article_id)" v-if="isAdmin">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(item.article_id)" v-if="isAdmin">删除</el-button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div class="empty" v-if="articleList.length === 0 && !loading">暂无数据</div>
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../store/user'
import defaultCover from '../../assets/images/default/Default_cover.png'
import { getArticleList, deleteArticle, getFieldTypeList } from '../../api/article'

const router = useRouter()
const userStore = useUserStore()

// 权限判断
const isAdmin = ref(['SUPERADMIN', 'ADMIN'].includes(userStore.userInfo.role))

// 数据
const loading = ref(false)
const articleList = ref([])
const fieldList = ref([])
const total = ref(0)

// 查询参数
const queryParams = reactive({
  page: 1,
  page_size: 10,
  article_title: '',
  field_type: '',
  is_selection: '',
  article_type: '',
  release_time: ''
})

// 获取领域列表
const getFieldList = async () => {
  try {
    const res = await getFieldTypeList()
    fieldList.value = res.data
  } catch (e) {
    ElMessage.error('获取领域类型失败')
  }
}

// 获取文章列表（真实接口）
const getList = async () => {
  try {
    loading.value = true
    const res = await getArticleList(queryParams)
    articleList.value = res.data.list || []  // 👈 修复：真实数据字段
    total.value = res.data.total || 0       // 👈 修复：真实总条数
  } catch (e) {
    ElMessage.error('获取文章列表失败')
    articleList.value = []  // 失败时清空
  } finally {
    loading.value = false
  }
}

// 重置筛选
const resetQuery = () => {
  queryParams.article_title = ''
  queryParams.article_type = ''
  queryParams.field_type = ''
  queryParams.is_selection = ''
  getList()
}

// 跳转
const toDetail = (id) => router.push(`/articles/detail/${id}`)
const toEdit = (id) => router.push(`/articles/edit/${id}`)
const toCreate = () => router.push('/articles/create')

// 删除文章
const handleDelete = async (id) => {
  await ElMessageBox.confirm('确定删除该文章？', '提示')
  await deleteArticle(id)
  ElMessage.success('删除成功')
  getList()
}

onMounted(() => {
  getFieldList()
  getList()  // 初始化加载真实数据
})
</script>

<style scoped>
.article-list-page { padding: 20px; }
.page-header { margin-bottom: 20px; }
.search-card, .list-card { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
.article-item { display: flex; gap: 20px; padding: 15px 0; border-bottom: 1px solid #f5f5f5; }
.article-item:last-child { border-bottom: none; }
.cover img { width: 160px; height: 100px; object-fit: cover; border-radius: 4px; }
.info { flex: 1; }
.title { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
.meta { display: flex; gap: 10px; color: #999; font-size: 12px; margin-bottom: 8px; }
.desc { color: #666; font-size: 14px; line-height: 1.5; margin-bottom: 10px; }
.operate { display: flex; gap: 10px; }
.empty { text-align: center; padding: 40px; color: #999; }
</style>