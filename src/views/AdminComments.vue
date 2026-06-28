<template>
  <div class="admin-comments">
    <div class="toolbar">
      <el-select v-model="statusFilter" placeholder="筛选状态" clearable @change="loadComments">
        <el-option label="待审核" value="pending" />
        <el-option label="已通过" value="approved" />
        <el-option label="已拒绝" value="rejected" />
      </el-select>
    </div>

    <el-table :data="comments" border>
      <el-table-column prop="user" label="用户" width="100">
        <template #default="{ row }">
          {{ row.user?.nickname || row.user?.email || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="content" label="内容" show-overflow-tooltip />
      <el-table-column prop="post" label="文章" width="120">
        <template #default="{ row }">
          {{ row.post?.title || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="时间" width="150">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button v-if="row.status === 'pending'" link type="success" size="small" @click="approveComment(row)">通过</el-button>
          <el-button v-if="row.status === 'pending'" link type="danger" size="small" @click="rejectComment(row)">拒绝</el-button>
          <el-button link type="danger" size="small" @click="deleteComment(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :page-size="pageSize"
      :total="total"
      layout="prev, pager, next"
      @current-change="loadComments"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from '@/utils/axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const comments = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const statusFilter = ref('')

onMounted(() => {
  loadComments()
})

async function loadComments() {
  const params = { page: page.value, page_size: pageSize.value }
  if (statusFilter.value) params.status = statusFilter.value

  const res = await axios.get('/api/admin/comments', { params })
  comments.value = res.data.list
  total.value = res.data.total
}

async function approveComment(comment) {
  try {
    await axios.post(`/api/admin/comments/_id/${comment.id}/approve`, {})
    ElMessage.success('审核通过')
    loadComments()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

async function rejectComment(comment) {
  try {
    await axios.post(`/api/admin/comments/_id/${comment.id}/reject`, {})
    ElMessage.success('已拒绝')
    loadComments()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

async function deleteComment(comment) {
  await ElMessageBox.confirm('确定要删除这条评论吗？', '提示', { type: 'warning' })
  try {
    await axios.delete(`/api/admin/comments/_id/${comment.id}`)
    ElMessage.success('删除成功')
    loadComments()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

function statusType(status) {
  const map = { pending: 'warning', approved: 'success', rejected: 'danger' }
  return map[status] || 'info'
}

function statusText(status) {
  const map = { pending: '待审核', approved: '已通过', rejected: '已拒绝' }
  return map[status] || status
}

function formatDate(date) {
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped>
.admin-comments {
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