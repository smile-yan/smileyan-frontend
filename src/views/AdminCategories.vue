<template>
  <div class="admin-categories">
    <div class="toolbar">
      <el-button type="primary" @click="showDialog = true">新建分类</el-button>
    </div>

    <el-table :data="categories" border>
      <el-table-column prop="name" label="名称" width="150" />
      <el-table-column prop="slug" label="Slug" width="150" />
      <el-table-column prop="description" label="描述" />
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="editCategory(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="deleteCategory(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showDialog" :title="editingCategory ? '编辑分类' : '新建分类'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="Slug">
          <el-input v-model="form.slug" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="saveCategory">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from '@/utils/axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const categories = ref([])
const showDialog = ref(false)
const editingCategory = ref(null)

const form = reactive({
  name: '',
  slug: '',
  description: '',
  sort: 0
})

onMounted(() => {
  loadCategories()
})

async function loadCategories() {
  const res = await axios.get('/api/categories')
  categories.value = res.data
}

function editCategory(category) {
  editingCategory.value = category
  form.name = category.name
  form.slug = category.slug
  form.description = category.description || ''
  form.sort = category.sort || 0
  showDialog.value = true
}

async function deleteCategory(category) {
  await ElMessageBox.confirm('确定要删除这个分类吗？', '提示', { type: 'warning' })
  try {
    await axios.delete(`/api/admin/categories/_id/${category.id}`)
    ElMessage.success('删除成功')
    loadCategories()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

async function saveCategory() {
  try {
    if (editingCategory.value) {
      await axios.put(`/api/admin/categories/_id/${editingCategory.value.id}`, form)
    } else {
      await axios.post('/api/admin/categories', form)
    }
    ElMessage.success('保存成功')
    showDialog.value = false
    loadCategories()
    resetForm()
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

function resetForm() {
  editingCategory.value = null
  form.name = ''
  form.slug = ''
  form.description = ''
  form.sort = 0
}
</script>

<style scoped>
.admin-categories {
  padding: 20px;
}

.toolbar {
  margin-bottom: 20px;
}
</style>