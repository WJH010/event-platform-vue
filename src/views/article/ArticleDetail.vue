<template>
  <div class="article-detail-page">
    <div class="top-action-bar">
      <el-button @click="$router.back()">返回列表</el-button>
    </div>

    <div class="detail-card" v-if="detailData">
      <h1 class="main-title">{{ detailData.article_title }}</h1>
      <div class="meta">
        <el-tag>{{ detailData.article_type }}</el-tag>
        <el-tag type="success" v-if="detailData.is_selection == 1">精选</el-tag>
        <span>{{ detailData.field_name }}</span>
        <span>{{ detailData.release_time }}</span>
        <span>来源：{{ detailData.article_source || '官方' }}</span>
      </div>
      <div class="cover" v-if="detailData.cover_image_url">
        <img :src="detailData.cover_image_url" alt="封面" />
      </div>
      <div class="brief">{{ detailData.brief_content }}</div>
      <div class="content" v-html="detailData.article_content"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'
import { getArticleDetail } from '../../api/article'

const route = useRoute()
const detailData = ref(null)
const id = route.params.id

const getDetail = async () => {
  try {
    const res = await getArticleDetail(id)
    detailData.value = res.data
  } catch (e) {
    ElMessage.error('获取详情失败')
  }
}

onMounted(() => getDetail())
</script>

<style scoped>
.article-detail-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
}

/* 🔥 同样使用sticky定位 */
.top-action-bar {
  position: sticky;
  top: 0;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  z-index: 999;
}

/* 其他样式不变 */
.detail-card {
  background: #fff;
  padding: 30px;
  border-radius: 8px;
}
.main-title { text-align: center; margin-bottom: 20px; }
.meta { text-align: center; margin-bottom: 20px; gap: 15px; display: flex; justify-content: center; color: #666; }
.cover { text-align: center; margin-bottom: 20px; }
.cover img { max-width: 80%; border-radius: 8px; }
.brief { padding: 15px; background: #f8f9fa; border-radius: 8px; margin-bottom: 20px; color: #666; }
.content { line-height: 1.8; font-size: 15px; }
</style>