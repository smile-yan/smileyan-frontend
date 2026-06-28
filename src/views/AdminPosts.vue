<template>
  <div class="admin-posts">
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button type="primary" @click="goToEditor">新建文章</el-button>
        <el-button-group>
          <el-button :type="statusFilter === '' ? 'primary' : ''" @click="statusFilter = ''; updateRouteAndLoad()">全部</el-button>
          <el-button :type="statusFilter === 'published' ? 'primary' : ''" @click="statusFilter = 'published'; updateRouteAndLoad()">已发布</el-button>
          <el-button :type="statusFilter === 'draft' ? 'primary' : ''" @click="statusFilter = 'draft'; updateRouteAndLoad()">草稿</el-button>
          <el-button :type="statusFilter === 'hidden' ? 'primary' : ''" @click="statusFilter = 'hidden'; updateRouteAndLoad()">隐藏</el-button>
        </el-button-group>
      </div>
      <div class="toolbar-right">
        <span class="filter-label">分类:</span>
        <el-select v-model="categoryFilter" placeholder="筛选分类" clearable @change="updateRouteAndLoad" class="filter-select">
          <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
        </el-select>
        <span class="filter-label">标签:</span>
        <el-select v-model="tagFilter" placeholder="筛选标签" clearable @change="updateRouteAndLoad" class="filter-select">
          <el-option v-for="tag in tags" :key="tag.id" :label="tag.name" :value="tag.id" />
        </el-select>
        <el-button :type="showSearchInput ? 'primary' : ''" circle @click="toggleSearch" title="搜索">
          <el-icon><Search /></el-icon>
        </el-button>
      </div>
    </div>

    <div v-show="showSearchInput" class="search-bar">
      <el-input
        v-model="keywordFilter"
        placeholder="输入标题关键字"
        clearable
        class="search-input"
        @keyup.enter="updateRouteAndLoad"
        @clear="updateRouteAndLoad"
      />
    </div>

    <el-table :data="posts" border>
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="slug" label="Slug" width="120" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="view_count" label="阅读" width="80" />
      <el-table-column prop="created_at" label="创建时间" width="150">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="router.push(`/admin/editor/${row.id}`)">编辑</el-button>
          <el-button link type="primary" size="small" @click="viewPost(row)">查看</el-button>
          <el-button link type="danger" size="small" @click="deletePost(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      layout="prev, pager, next"
      @current-change="handlePageChange"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from '@/utils/axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

const posts = ref([])
const categories = ref([])
const tags = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const statusFilter = ref('')
const categoryFilter = ref('')
const tagFilter = ref('')
const keywordFilter = ref('')
const showSearchInput = ref(false)

onMounted(async () => {
  // 从 URL 读取页码和筛选条件
  const pageParam = route.params.page
  if (pageParam) {
    currentPage.value = parseInt(pageParam) || 1
  }
  if (route.query.status) statusFilter.value = route.query.status
  if (route.query.category_id) categoryFilter.value = Number(route.query.category_id)
  if (route.query.tag_id) tagFilter.value = Number(route.query.tag_id)
  if (route.query.keyword) {
    keywordFilter.value = route.query.keyword
    showSearchInput.value = true
  }

  await Promise.all([loadCategories(), loadTags()])
  loadPosts()
})

function toggleSearch() {
  showSearchInput.value = !showSearchInput.value
  if (!showSearchInput.value && keywordFilter.value) {
    keywordFilter.value = ''
    updateRouteAndLoad()
  }
}

// 把当前页码和筛选条件同步到 URL，然后加载数据
function updateRouteAndLoad() {
  const query = {}
  if (statusFilter.value) query.status = statusFilter.value
  if (categoryFilter.value) query.category_id = categoryFilter.value
  if (tagFilter.value) query.tag_id = tagFilter.value
  if (keywordFilter.value) query.keyword = keywordFilter.value

  const path = currentPage.value === 1 ? '/admin/posts' : `/admin/posts/${currentPage.value}`
  router.replace({ path, query }).then(() => loadPosts())
}

// 处理分页点击
function handlePageChange(newPage) {
  currentPage.value = newPage
  updateRouteAndLoad()
}

async function loadCategories() {
  try {
    const res = await axios.get('/api/categories')
    categories.value = res.data
  } catch (e) {
    console.error('加载分类失败', e)
  }
}

async function loadTags() {
  try {
    const res = await axios.get('/api/tags')
    tags.value = res.data
  } catch (e) {
    console.error('加载标签失败', e)
  }
}

async function loadPosts() {
  const params = { page: currentPage.value, page_size: pageSize.value }
  if (statusFilter.value) params.status = statusFilter.value
  if (categoryFilter.value) params.category_id = categoryFilter.value
  if (tagFilter.value) params.tag_id = tagFilter.value
  if (keywordFilter.value) params.keyword = keywordFilter.value

  const res = await axios.get('/api/admin/posts', { params })
  posts.value = res.data.list
  total.value = res.data.total
}

function viewPost(post) {
  window.open(`/post/${post.slug}`, '_blank')
}

function goToEditor() {
  router.push('/admin/editor/new')
}

async function deletePost(post) {
  await ElMessageBox.confirm('确定要删除这篇文章吗？', '提示', { type: 'warning' })
  try {
    await axios.delete(`/api/admin/posts/_id/${post.id}`)
    ElMessage.success('删除成功')
    loadPosts()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

function statusType(status) {
  const map = { draft: 'info', published: 'success', hidden: 'danger' }
  return map[status] || 'info'
}

function statusText(status) {
  const map = { draft: '草稿', published: '已发布', hidden: '隐藏' }
  return map[status] || status
}

function formatDate(date) {
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped>
.admin-posts {
  padding: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.toolbar-left {
  display: flex;
  gap: 10px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-label {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
}

.filter-select {
  width: 150px;
}

.search-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.search-input {
  width: 260px;
}

.el-pagination {
  margin-top: 20px;
  justify-content: flex-end;
}
</style>