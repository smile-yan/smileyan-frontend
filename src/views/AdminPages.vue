<template>
  <div class="admin-pages">
    <div class="toolbar">
      <el-button type="primary" @click="showDialog = true">新建页面</el-button>
    </div>

    <el-table :data="pages" border>
      <el-table-column prop="title" label="标题" min-width="150" show-overflow-tooltip />
      <el-table-column prop="slug" label="Slug" min-width="120" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'published' ? 'success' : 'info'">
            {{ row.status === 'published' ? '已发布' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="150">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="editPage(row)">编辑</el-button>
          <el-button link type="primary" size="small" @click="viewPage(row)">查看</el-button>
          <el-button link type="danger" size="small" @click="deletePage(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :page-size="pageSize"
      :total="total"
      layout="prev, pager, next"
      @current-change="loadPages"
    />

    <el-dialog v-model="showDialog" :title="editingPage ? '编辑页面' : '新建页面'" width="800px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="标题">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="Slug">
          <el-input v-model="form.slug" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" :rows="15" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio label="draft">草稿</el-radio>
            <el-radio label="published">发布</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="savePage">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const pages = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const showDialog = ref(false)
const editingPage = ref(null)

const form = reactive({
  title: '',
  slug: '',
  content: '',
  status: 'published'
})

onMounted(() => {
  loadPages()
})

async function loadPages() {
  const res = await axios.get('/api/pages', {
    params: { page: page.value, page_size: pageSize.value }
  })
  pages.value = res.data.list
  total.value = res.data.total
}

function editPage(p) {
  editingPage.value = p
  form.title = p.title
  form.slug = p.slug
  form.content = p.content
  form.status = p.status
  showDialog.value = true
}

function viewPage(p) {
  window.open(`/page/${p.slug}`, '_blank')
}

async function deletePage(p) {
  await ElMessageBox.confirm('确定要删除这个页面吗？', '提示', { type: 'warning' })
  try {
    await axios.delete(`/api/admin/pages/_id/${p.id}`)
    ElMessage.success('删除成功')
    loadPages()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

async function savePage() {
  try {
    if (editingPage.value) {
      await axios.put(`/api/admin/pages/_id/${editingPage.value.id}`, form)
    } else {
      await axios.post('/api/admin/pages', form)
    }
    ElMessage.success('保存成功')
    showDialog.value = false
    loadPages()
    resetForm()
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

function resetForm() {
  editingPage.value = null
  form.title = ''
  form.slug = ''
  form.content = ''
  form.status = 'published'
}

function formatDate(date) {
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped>
.admin-pages {
  padding: 20px;
}

.toolbar {
  margin-bottom: 20px;
}

.el-pagination {
  margin-top: 20px;
  justify-content: flex-end;
}
</style>