<template>
  <div class="admin-related">
    <div class="toolbar">
      <el-select
        v-model="filterPostId"
        placeholder="按文章筛选"
        clearable
        filterable
        style="width: 260px"
        @change="handleFilterChange"
      >
        <el-option
          v-for="post in posts"
          :key="post.id"
          :label="post.title"
          :value="post.id"
        />
      </el-select>
      <el-button type="primary" @click="openCreate">新建关系</el-button>
    </div>

    <el-table :data="relations" border v-loading="loading">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column label="文章" min-width="200">
        <template #default="{ row }">
          <div>{{ row.post_title || `#${row.post_id}` }}</div>
          <div class="cell-slug">{{ row.post_slug }}</div>
        </template>
      </el-table-column>
      <el-table-column label="关联文章" min-width="200">
        <template #default="{ row }">
          <div>{{ row.related_post_title || `#${row.related_post_id}` }}</div>
          <div class="cell-slug">{{ row.related_post_slug }}</div>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="90">
        <template #default="{ row }">
          <el-tag :type="row.relation_type === 'two_way' ? 'success' : 'info'" size="small">
            {{ row.relation_type === 'two_way' ? '双向' : '单向' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="130">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="editRelation(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="deleteRelation(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="loadRelations"
      />
    </div>

    <el-dialog v-model="showDialog" :title="editingRelation ? '编辑关系' : '新建关系'" width="480px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="文章">
          <el-select
            v-model="form.post_id"
            filterable
            placeholder="选择文章"
            style="width: 100%"
            :disabled="!!editingRelation"
          >
            <el-option
              v-for="post in posts"
              :key="post.id"
              :label="post.title"
              :value="post.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关联文章">
          <el-select
            v-model="form.related_post_id"
            filterable
            placeholder="选择关联文章"
            style="width: 100%"
            :disabled="!!editingRelation"
          >
            <el-option
              v-for="post in posts"
              :key="post.id"
              :label="post.title"
              :value="post.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关系类型">
          <el-radio-group v-model="form.relation_type">
            <el-radio value="one_way">单向（仅本文显示对方）</el-radio>
            <el-radio value="two_way">双向（互相显示）</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="saveRelation">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from '@/utils/axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const relations = ref([])
const posts = ref([])
const filterPostId = ref(null)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const loading = ref(false)
const showDialog = ref(false)
const editingRelation = ref(null)

const form = reactive({
  post_id: null,
  related_post_id: null,
  relation_type: 'one_way'
})

onMounted(() => {
  loadRelations()
  loadPosts()
})

async function loadRelations() {
  loading.value = true
  try {
    const params = { page: page.value, page_size: pageSize.value }
    if (filterPostId.value) params.post_id = filterPostId.value
    const res = await axios.get('/api/admin/post-relations', { params })
    relations.value = res.data.list || []
    total.value = res.data.total
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '加载相关博客关系失败')
  } finally {
    loading.value = false
  }
}

async function loadPosts() {
  try {
    const res = await axios.get('/api/admin/posts/summary', {
      params: { page: 1, page_size: 100 }
    })
    posts.value = res.data.list || []
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '加载文章列表失败')
  }
}

function handleFilterChange() {
  page.value = 1
  loadRelations()
}

function openCreate() {
  editingRelation.value = null
  resetForm()
  showDialog.value = true
}

function editRelation(relation) {
  editingRelation.value = relation
  form.post_id = relation.post_id
  form.related_post_id = relation.related_post_id
  form.relation_type = relation.relation_type
  showDialog.value = true
}

async function deleteRelation(relation) {
  try {
    await ElMessageBox.confirm('确定要删除这条相关博客关系吗？', '提示', { type: 'warning' })
  } catch {
    return
  }

  try {
    await axios.delete(`/api/admin/post-relations/_id/${relation.id}`)
    ElMessage.success('删除成功')
    loadRelations()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '删除失败')
  }
}

async function saveRelation() {
  if (!editingRelation.value) {
    if (!form.post_id || !form.related_post_id) {
      ElMessage.warning('请选择两篇文章')
      return
    }
    if (form.post_id === form.related_post_id) {
      ElMessage.warning('文章不能与自身建立关系')
      return
    }
  }

  try {
    if (editingRelation.value) {
      // 编辑只改关系类型；文章对一旦确定就固定，改对请删除重建
      await axios.put(`/api/admin/post-relations/_id/${editingRelation.value.id}`, {
        relation_type: form.relation_type
      })
    } else {
      await axios.post('/api/admin/post-relations', {
        post_id: form.post_id,
        related_post_id: form.related_post_id,
        relation_type: form.relation_type
      })
    }
    ElMessage.success('保存成功')
    showDialog.value = false
    resetForm()
    loadRelations()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '保存失败')
  }
}

function resetForm() {
  editingRelation.value = null
  form.post_id = null
  form.related_post_id = null
  form.relation_type = 'one_way'
}

function formatDate(date) {
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped>
.admin-related {
  padding: 20px;
}

.toolbar {
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.cell-slug {
  color: #999;
  font-size: 12px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>
