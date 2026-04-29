<template>
  <div class="article-form-page">
    <div class="top-action-bar">
      <el-button @click="handleBack">返回列表</el-button>
      <div class="right-btns">
        <el-button @click="handleBack">取消</el-button>
        <el-button type="primary" @click="submit" :loading="loading">保存文章</el-button>
      </div>
    </div>

    <div class="form-card">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="标题" prop="article_title">
              <el-input v-model="formData.article_title" placeholder="请输入文章标题" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="文章类型" prop="article_type">
              <el-select v-model="formData.article_type" style="width: 100%">
                <el-option label="新闻" value="NEWS" />
                <el-option label="政策" value="POLICY" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="领域类型" prop="field_type">
              <el-select v-model="formData.field_type" style="width: 100%">
                <el-option v-for="item in fieldList" :key="item.field_code" :label="item.field_name" :value="item.field_code" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否精选">
              <el-switch 
                v-model="formData.is_selection" 
                :active-value="1" 
                :inactive-value="0"
                active-text="精选"
                inactive-text="非精选"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="文章来源">
          <el-input v-model="formData.article_source" placeholder="选填" style="width: 100%" />
        </el-form-item>

        <el-form-item label="简介" prop="brief_content">
          <el-input 
            v-model="formData.brief_content" 
            type="textarea" 
            :rows="3" 
            style="width: 100%" 
          />
        </el-form-item>

        <el-form-item label="封面图片">
          <el-upload 
            :show-file-list="false" 
            :before-upload="beforeCoverUpload" 
            :http-request="uploadCover"
          >
            <img :src="formData.cover_image_url || defaultCover" class="cover-preview" />
            <div class="tip">点击上传封面</div>
          </el-upload>
        </el-form-item>

        <el-form-item label="文章内容" prop="article_content">
          <div class="editor-container">
            <Toolbar 
              :editor="editorRef" 
              :default-config="editorConfig" 
              class="editor-toolbar" 
            />
            <Editor
              v-model="formData.article_content"
              :default-config="editorConfig"
              class="editor-content"
              @onCreated="handleEditorCreated"
              @onDestroyed="handleEditorDestroyed"
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
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import { getFieldTypeList, createArticle, updateArticle, getArticleDetail, uploadArticleImage } from '../../api/article'
import defaultCover from '../../assets/images/default/Default_cover.png'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const isEdit = !!id

// 状态
const loading = ref(false)
const formRef = ref(null)
const fieldList = ref([])
const editorRef = ref(null)

// 表单数据（只包含接口入参需要的字段）
const formData = reactive({
  article_title: '',
  article_type: 'NEWS', // 类型代码：NEWS/POLICY
  brief_content: '',
  article_content: '',
  is_selection: 0,
  field_type: '',
  cover_image_url: '',
  article_source: '',
  image_id_list: []
})

// 校验规则
const formRules = {
  article_title: [{ required: true, message: '请输入标题' }],
  article_type: [{ required: true, message: '请选择类型' }],
  field_type: [{ required: true, message: '请选择领域' }],
  brief_content: [{ required: true, message: '请输入简介' }],
  article_content: [{ required: true, message: '请输入内容' }]
}

// 编辑器配置
const editorConfig = {
  placeholder: '请输入文章内容...',
  MENU_CONF: {
    uploadImage: {
      async customUpload(file, insertFn) {
        try {
          const res = await uploadArticleImage(file)
          insertFn(res.data.url)
          ElMessage.success('图片上传成功')
        } catch (err) {
          ElMessage.error('图片上传失败')
          console.error(err)
        }
      }
    }
  }
}

// 编辑器创建/销毁
const handleEditorCreated = (editorInstance) => {
  editorRef.value = editorInstance
}
const handleEditorDestroyed = () => {
  editorRef.value = null
}
onBeforeUnmount(() => {
  if (editorRef.value) {
    editorRef.value.destroy()
    editorRef.value = null
  }
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

// ✅ 修复1：编辑时，正确赋值文章类型代码
const getDetail = async () => {
  try {
    const res = await getArticleDetail(id)
    const data = res.data
    
    // 只赋值接口需要的字段，并且article_type用返回的article_type_code（代码）
    Object.assign(formData, {
      article_title: data.article_title,
      article_type: data.article_type_code, // ✅ 这里是关键：用返回的代码赋值，而不是中文名称
      brief_content: data.brief_content,
      article_content: data.article_content,
      is_selection: data.is_selection == 1 ? 1 : 0,
      field_type: data.field_type,
      cover_image_url: data.cover_image_url,
      article_source: data.article_source
    })
  } catch (e) {
    ElMessage.error('加载详情失败')
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
const uploadCover = async (params) => {
  const res = await uploadArticleImage(params.file)
  formData.cover_image_url = res.data.url
  ElMessage.success('封面上传成功')
}

// ✅ 修复2：提交时，只传接口需要的字段，过滤掉多余的article_type_code
const submit = async () => {
  await formRef.value.validate()
  loading.value = true
  try {
    // 提交时，只传递接口定义的字段，避免多余字段干扰
    const submitData = {
      article_title: formData.article_title,
      article_type: formData.article_type, // 确保传递的是代码（NEWS/POLICY）
      brief_content: formData.brief_content,
      article_content: formData.article_content,
      is_selection: Number(formData.is_selection),
      field_type: formData.field_type,
      cover_image_url: formData.cover_image_url,
      article_source: formData.article_source,
      image_id_list: formData.image_id_list
    }

    if (isEdit) {
      await updateArticle(id, submitData)
      ElMessage.success('文章编辑成功')
    } else {
      await createArticle(submitData)
      ElMessage.success('文章创建成功')
    }
    handleBack()
  } catch (e) {
    ElMessage.error('保存失败：' + (e.message || '服务器错误'))
  } finally {
    loading.value = false
  }
}

// 返回按钮
const handleBack = () => {
  if (editorRef.value) {
    editorRef.value.destroy()
    editorRef.value = null
  }
  router.push('/articles')
}

onMounted(() => {
  getFieldList()
  if (isEdit) getDetail()
})
</script>

<style scoped>
/* 页面基础样式 - 关键修改：设置滚动容器 */
.article-form-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  /* 确保sticky定位生效 */
  position: relative;
}

/* 🔥 核心修改：sticky定位 + top值避开全局导航 */
.top-action-bar {
  position: sticky;
  top: 0; /* 相对于父容器（article-form-page）顶部固定 */
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  z-index: 999; /* 只在子页面内层级最高 */
}

.right-btns {
  display: flex;
  gap: 10px;
}

/* 内容卡片样式 */
.form-card {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

/* 原有样式保留 */
.cover-preview { width: 300px; height: 200px; object-fit: cover; border-radius: 4px; }
.tip { text-align: center; margin-top: 8px; color: #666; }
.editor-container { border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden; }
.editor-toolbar { border-bottom: 1px solid #e5e7eb; }
.editor-content { min-height: 400px; }
</style>