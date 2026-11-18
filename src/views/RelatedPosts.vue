<template>
  <div class="related-page">
    <div v-if="loading" class="loading">
      <el-skeleton :rows="6" animated />
    </div>
    <template v-else>
      <header class="related-header">
        <el-button link @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回文章
        </el-button>
        <h1 v-if="postTitle">「{{ postTitle }}」的相关博客</h1>
        <h1 v-else>相关博客</h1>
      </header>

      <el-empty v-if="!loading && total === 0" description="还没有相关博客" />

      <div class="post-list" v-else>
        <el-card v-for="item in relatedPosts" :key="item.id" class="post-card" @click="goToPost(item.slug)">
          <div class="post-cover" v-if="item.cover_image">
            <img :src="item.cover_image" alt="" />
          </div>
          <div class="post-info">
            <h3>{{ item.title }}</h3>
            <div class="post-meta">
              <span>{{ formatDate(item.created_at) }}</span>
              <span class="category" v-if="item.category">{{ item.category.name }}</span>
              <span v-if="item.view_count">阅读 {{ item.view_count }}</span>
            </div>
            <p class="post-excerpt">{{ item.excerpt }}</p>
            <div class="post-tags" v-if="item.tags && item.tags.length">
              <el-tag v-for="tag in item.tags" :key="tag.id" size="small">{{ tag.name }}</el-tag>
            </div>
          </div>
        </el-card>
      </div>

      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import axios from '@/utils/axios'

const route = useRoute()
const router = useRouter()

const postTitle = ref('')
const relatedPosts = ref([])
const page = ref(Number(route.query.page) || 1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(true)

onMounted(() => {
  loadAll()
})

// 同一页面在文章间跳转时复用组件，需要重新加载
watch(() => route.params.slug, (slug) => {
  if (!slug) return
  window.scrollTo({ top: 0 })
  page.value = 1
  loadAll()
})

async function loadAll() {
  loading.value = true
  await Promise.all([loadPostTitle(), loadRelatedPosts()])
  loading.value = false
}

async function loadPostTitle() {
  try {
    const res = await axios.get(`/api/posts/${route.params.slug}`)
    postTitle.value = res.data.title
  } catch (e) {
    console.error('Failed to load post', e)
  }
}

async function loadRelatedPosts() {
  try {
    const res = await axios.get(`/api/posts/${route.params.slug}/related`, {
      params: { page: page.value, page_size: pageSize.value }
    })
    relatedPosts.value = res.data.list || []
    total.value = res.data.total
  } catch (e) {
    console.error('Failed to load related posts', e)
    relatedPosts.value = []
    total.value = 0
  }
}

function handlePageChange(newPage) {
  page.value = newPage
  const query = { ...route.query }
  if (newPage > 1) query.page = newPage
  else delete query.page
  router.replace({ query })
  loadRelatedPosts()
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('zh-CN')
}

function goToPost(slug) {
  router.push(`/post/${slug}`)
}

function goBack() {
  router.push(`/post/${route.params.slug}`)
}
</script>

<style scoped>
.related-page {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.related-header {
  margin-bottom: 25px;
}

.related-header h1 {
  font-size: 26px;
  margin: 15px 0 0;
}

.post-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.post-card {
  cursor: pointer;
  transition: transform 0.2s;
  display: flex;
  gap: 20px;
}

.post-card:hover {
  transform: translateY(-4px);
}

.post-cover {
  width: 240px;
  height: 160px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 4px;
}

.post-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-info {
  flex: 1;
  min-width: 0;
}

.post-card h3 {
  margin: 0 0 10px;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-meta {
  display: flex;
  gap: 15px;
  color: #999;
  font-size: 12px;
  margin-bottom: 8px;
}

.category {
  color: #409eff;
}

.post-excerpt {
  color: #666;
  font-size: 13px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-tags {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .related-header h1 {
    font-size: 20px;
  }

  .post-card {
    flex-direction: column;
  }

  .post-cover {
    width: 100%;
    height: 160px;
  }
}
</style>
