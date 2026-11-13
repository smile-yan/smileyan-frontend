<template>
  <div class="admin-tags">
    <div class="toolbar">
      <el-button type="primary" @click="openCreate">新建标签</el-button>
    </div>

    <el-table :data="tags" border>
      <el-table-column prop="name" label="名称" min-width="150" />
      <el-table-column prop="slug" label="Slug" min-width="150" />
      <el-table-column label="操作" width="130">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="editTag(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="deleteTag(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showDialog" :title="editingTag ? '编辑标签' : '新建标签'" width="400px">
      <el-form :model="form" label-width="60px">
        <el-form-item label="名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="Slug">
          <el-input v-model="form.slug" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTag">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from '@/utils/axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const tags = ref([])
const showDialog = ref(false)
const editingTag = ref(null)

const form = reactive({
  name: '',
  slug: ''
})

onMounted(() => {
  loadTags()
})

async function loadTags() {
  try {
    const res = await axios.get('/api/tags')
    tags.value = res.data
  } catch (e) {
    ElMessage.error('加载标签失败')
  }
}

function openCreate() {
  editingTag.value = null
  resetForm()
  showDialog.value = true
}

function editTag(tag) {
  editingTag.value = tag
  form.name = tag.name
  form.slug = tag.slug
  showDialog.value = true
}

async function deleteTag(tag) {
  try {
    await ElMessageBox.confirm('确定要删除这个标签吗？', '提示', { type: 'warning' })
  } catch {
    return
  }

  try {
    await axios.delete(`/api/admin/tags/_id/${tag.id}`)
    ElMessage.success('删除成功')
    loadTags()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '删除失败')
  }
}

async function saveTag() {
  try {
    if (editingTag.value) {
      await axios.put(`/api/admin/tags/_id/${editingTag.value.id}`, form)
    } else {
      await axios.post('/api/admin/tags', form)
    }
    ElMessage.success('保存成功')
    showDialog.value = false
    resetForm()
    loadTags()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '保存失败')
  }
}

function resetForm() {
  editingTag.value = null
  form.name = ''
  form.slug = ''
}
</script>

<style scoped>
.admin-tags {
  padding: 20px;
}

.toolbar {
  margin-bottom: 20px;
}
</style>
