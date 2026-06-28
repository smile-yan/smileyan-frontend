<template>
  <div class="home">
    <!-- 移动端侧边栏切换按钮 -->
    <div class="mobile-toggle" @click="drawerVisible = true">
      <el-icon><Menu /></el-icon>
    </div>

    <!-- 左右布局 -->
    <div class="home-layout">
      <!-- 左侧：文章列表 -->
      <div class="main-content">
        <!-- 搜索框（移动端显示） -->
        <div class="search-bar-mobile">
          <el-input
            v-model="keyword"
            placeholder="搜索文章..."
            @keyup.enter="search"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <div class="post-list">
          <el-card v-for="post in posts" :key="post.id" class="post-card" @click="goToPost(post.slug)">
            <div class="post-cover" v-if="post.cover_image">
              <img :src="post.cover_image" alt="" />
            </div>
            <div class="post-info">
              <h3>{{ post.title }}</h3>
              <div class="post-meta">
                <span>{{ formatDate(post.created_at) }}</span>
                <span class="category" v-if="post.category">{{ post.category.name }}</span>
                <span v-if="post.view_count">阅读 {{ post.view_count }}</span>
              </div>
              <p class="post-excerpt">{{ post.excerpt || post.highlights?.[0] || '' }}</p>
              <div class="post-tags" v-if="post.tags && post.tags.length">
                <el-tag v-for="tag in post.tags" :key="tag.id" size="small">{{ tag.name }}</el-tag>
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
      </div>

      <!-- 右侧：侧边栏（桌面端） -->
      <div class="sidebar desktop-sidebar">
        <SidebarContent
          :categories="categories"
          :tags="tags"
          :postDates="postDates"
          :keyword="keyword"
          :categoryId="categoryId"
          :tagId="tagId"
          @search="search"
          @select="onSidebarSelect"
          @update:keyword="keyword = $event"
        />
      </div>
    </div>

    <!-- 移动端侧边栏抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="筛选"
      direction="ltr"
      size="280px"
      :show-close="true"
    >
      <SidebarContent
        :categories="categories"
        :tags="tags"
        :postDates="postDates"
        :keyword="keyword"
        :categoryId="categoryId"
        :tagId="tagId"
        @select="onSidebarSelect"
        @update:keyword="keyword = $event"
      />
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from '@/utils/axios'
import dayjs from 'dayjs'
import { Search, Menu } from '@element-plus/icons-vue'
import SidebarContent from './SidebarContent.vue'

const router = useRouter()
const route = useRoute()

const drawerVisible = ref(false)

const posts = ref([])
const categories = ref([])
const tags = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const keyword = ref('')
const categoryId = ref(null)
const tagId = ref(null)
const postDates = ref(new Set())

onMounted(() => {
  if (route.query.page) {
    page.value = parseInt(route.query.page) || 1
  }

  loadCategories()
  loadTags()
  loadPostDates()

  if (route.query.keyword) {
    keyword.value = route.query.keyword
    search()
  } else if (route.query.date) {
    loadPostsByDate(route.query.date)
  } else if (route.params.id) {
    if (route.name === 'Category') {
      categoryId.value = parseInt(route.params.id)
    } else if (route.name === 'Tag') {
      tagId.value = parseInt(route.params.id)
    }
    loadPosts()
  } else {
    loadPosts()
  }
})

watch(() => route.params.id, (newId) => {
  page.value = 1
  if (route.name === 'Category') {
    categoryId.value = newId ? parseInt(newId) : null
    tagId.value = null
  } else if (route.name === 'Tag') {
    tagId.value = newId ? parseInt(newId) : null
    categoryId.value = null
  }
  loadPosts()
})

watch(() => route.query.date, (newDate) => {
  page.value = 1
  if (newDate) {
    loadPostsByDate(newDate)
  } else {
    loadPosts()
  }
})

function handlePageChange(newPage) {
  page.value = newPage
  const query = { ...route.query }
  if (newPage > 1) query.page = newPage
  else delete query.page
  router.replace({ query }).then(() => {
    if (route.name === 'Search') searchPosts()
    else if (route.query.date) loadPostsByDate(route.query.date)
    else loadPosts()
  })
}

async function loadCategories() {
  const res = await axios.get('/api/categories')
  categories.value = res.data
}

async function loadTags() {
  const res = await axios.get('/api/tags')
  tags.value = res.data
}

async function loadPostDates() {
  try {
    // 获取所有文章（不分页）来获取日期
    const res = await axios.get('/api/posts', { params: { page_size: 1000 } })
    const dates = new Set()
    res.data.list.forEach(post => {
      const date = dayjs(post.created_at).format('YYYY-MM-DD')
      dates.add(date)
    })
    postDates.value = dates
  } catch (e) {
    console.error('加载文章日期失败', e)
  }
}

async function loadPosts() {
  const params = {
    page: page.value,
    page_size: pageSize.value
  }
  if (categoryId.value) params.category_id = categoryId.value
  if (tagId.value) params.tag_id = tagId.value

  const res = await axios.get('/api/posts', { params })
  posts.value = res.data.list
  total.value = res.data.total
}

async function loadPostsByDate(dateStr) {
  try {
    const res = await axios.get('/api/posts', {
      params: {
        page: 1,
        page_size: 100,
        start_date: dateStr,
        end_date: dateStr
      }
    })
    posts.value = res.data.list
    total.value = res.data.total
  } catch (e) {
    console.error('加载指定日期文章失败', e)
  }
}

function search() {
  page.value = 1
  if (keyword.value) {
    router.push({ name: 'Search', query: { keyword: keyword.value } })
    searchPosts()
  } else {
    router.push('/')
    loadPosts()
  }
}

async function searchPosts() {
  const res = await axios.get('/api/search', {
    params: { keyword: keyword.value, page: page.value, page_size: pageSize.value }
  })
  posts.value = res.data.list
  total.value = res.data.total
}

function selectCategory(id) {
  if (categoryId.value === id) {
    categoryId.value = null
    router.push('/')
  } else {
    categoryId.value = id
    tagId.value = null
    router.push(`/category/${id}`)
  }
  loadPosts()
}

function selectTag(id) {
  if (tagId.value === id) {
    tagId.value = null
    router.push('/')
  } else {
    tagId.value = id
    categoryId.value = null
    router.push(`/tag/${id}`)
  }
  loadPosts()
}

function goToPost(slug) {
  router.push(`/post/${slug}`)
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('zh-CN')
}

function onSidebarSelect() {
  drawerVisible.value = false
}
</script>

<style scoped>
.home {
  padding: 20px;
}

.home-layout {
  display: flex;
  gap: 20px;
}

.main-content {
  flex: 1;
  min-width: 0;
}

.sidebar {
  width: 280px;
  flex-shrink: 0;
}

.mobile-toggle {
  display: none;
}

.search-bar-mobile {
  display: none;
  margin-bottom: 20px;
}

.sidebar-card {
  margin-bottom: 20px;
}

.sidebar-card :deep(.el-card__header) {
  padding: 12px 20px;
  font-weight: 600;
}

/* 搜索框样式 */
.sidebar-card .el-input {
  width: 100%;
}

/* 分类列表 */
.category-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.category-item:hover {
  background: #f5f7fa;
}

.category-item.active {
  background: #ecf5ff;
  color: #409eff;
}

.category-name {
  flex: 1;
}

.category-count {
  color: #999;
  font-size: 12px;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 10px;
}

.category-item.active .category-count {
  background: #409eff;
  color: #fff;
}

/* 标签云 */
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  cursor: pointer;
  transition: all 0.2s;
}

.tag-item:hover {
  transform: scale(1.05);
}

.tag-item.active {
  background: #409eff;
  color: #fff;
}

/* 文章列表 */
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

/* 日历样式 */
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  margin-bottom: 10px;
}

.calendar-title {
  display: flex;
  gap: 8px;
}

.calendar-title .el-select {
  width: 90px;
}

.sidebar-card :deep(.el-calendar) {
  border: none;
}

.sidebar-card :deep(.el-calendar__header) {
  display: none;
}

.sidebar-card :deep(.el-calendar__body) {
  padding: 0;
}

.sidebar-card :deep(.el-calendar-table thead th) {
  padding: 6px 0;
  color: #999;
  font-size: 12px;
  font-weight: normal;
}

.sidebar-card :deep(.el-calendar-table td) {
  border: none;
}

.sidebar-card :deep(.el-calendar-table .el-calendar-day) {
  padding: 0;
  height: auto;
  border: none;
}

.sidebar-card :deep(.el-calendar-table td.is-selected .el-calendar-day) {
  background: transparent;
}

.calendar-cell {
  position: relative;
  width: 100%;
  height: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: default;
  transition: all 0.2s;
  font-size: 12px;
  border-radius: 4px;
}

.calendar-cell.has-posts {
  cursor: pointer;
  color: #409eff;
  font-weight: 500;
}

.calendar-cell.has-posts:hover {
  background: #ecf5ff;
}

.calendar-cell.is-today {
  color: #f56c6c;
  font-weight: bold;
}

.calendar-cell.is-selected {
  background: #409eff;
  color: #fff !important;
}

.calendar-cell.is-selected .post-dot {
  background: #fff;
}

.post-dot {
  position: absolute;
  bottom: 4px;
  width: 4px;
  height: 4px;
  background: #409eff;
  border-radius: 50%;
}

.calendar-cell.is-selected.has-posts .post-dot {
  display: none;
}

/* 响应式 */
@media (max-width: 768px) {
  .home {
    padding: 12px;
  }

  .home-layout {
    flex-direction: column;
  }

  .desktop-sidebar {
    display: none;
  }

  .search-bar-mobile {
    display: block;
  }

  /* 移动端切换按钮 */
  .mobile-toggle {
    display: flex;
    position: fixed;
    top: 70px;
    left: 12px;
    width: 40px;
    height: 40px;
    background: var(--el-color-primary);
    color: #fff;
    border-radius: 50%;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    font-size: 20px;
  }

  /* 调整文章卡片在移动端的布局 */
  .post-card {
    flex-direction: column;
  }

  .post-cover {
    width: 100%;
    height: 160px;
  }
}
</style>
