<template>
  <div class="admin-tags">
    <div class="toolbar">
      <el-button type="primary" @click="showDialog = true">新建标签</el-button>
    </div>

    <el-table :data="tags" border>
      <el-table-column prop="name" label="名称" min-width="150" />
      <el-table-column prop="slug" label="Slug" min-width="150" />
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button link type="danger" size="small" @click="deleteTag(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showDialog" title="新建标签" width="400px">
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

const form = reactive({
  name: '',
  slug: ''
})

onMounted(() => {
  loadTags()
})

async function loadTags() {
  const res = await axios.get('/api/tags')
  tags.value = res.data
}

async function deleteTag(tag) {
  await ElMessageBox.confirm('确定要删除这个标签吗？', '提示', { type: 'warning' })
  try {
    await axios.delete(`/api/admin/tags/_id/${tag.id}`)
    ElMessage.success('删除成功')
    loadTags()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

async function saveTag() {
  try {
    await axios.post('/api/admin/tags', form)
    ElMessage.success('保存成功')
    showDialog.value = false
    loadTags()
    form.name = ''
    form.slug = ''
  } catch (e) {
    ElMessage.error('保存失败')
  }
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