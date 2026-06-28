<template>
  <div class="admin-subscriptions">
    <div class="toolbar">
      <el-button type="primary" @click="notifySubscribers">发送新文章通知</el-button>
    </div>

    <el-table :data="subscriptions" border>
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="is_active" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.is_active ? 'success' : 'info'">
            {{ row.is_active ? '活跃' : '已退订' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="订阅时间" width="150">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80">
        <template #default="{ row }">
          <el-button link type="danger" size="small" @click="deleteSubscription(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :page-size="pageSize"
      :total="total"
      layout="prev, pager, next"
      @current-change="loadSubscriptions"
    />

    <el-dialog v-model="showNotifyDialog" title="发送新文章通知" width="500px">
      <el-form :model="notifyForm" label-width="80px">
        <el-form-item label="选择文章">
          <el-select v-model="notifyForm.post_id" placeholder="选择文章">
            <el-option v-for="post in posts" :key="post.id" :label="post.title" :value="post.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showNotifyDialog = false">取消</el-button>
        <el-button type="primary" @click="sendNotifications">发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from '@/utils/axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const subscriptions = ref([])
const posts = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const showNotifyDialog = ref(false)

const notifyForm = reactive({
  post_id: null
})

onMounted(() => {
  loadSubscriptions()
  loadPosts()
})

async function loadSubscriptions() {
  const res = await axios.get('/api/admin/subscriptions', {
    params: { page: page.value, page_size: pageSize.value }
  })
  subscriptions.value = res.data.list
  total.value = res.data.total
}

async function loadPosts() {
  const res = await axios.get('/api/posts', {
    params: { page_size: 100 }
  })
  posts.value = res.data.list.filter(p => p.status === 'published')
}

async function deleteSubscription(sub) {
  await ElMessageBox.confirm('确定要删除这个订阅吗？', '提示', { type: 'warning' })
  try {
    await axios.delete(`/api/admin/subscriptions/_id/${sub.id}`)
    ElMessage.success('删除成功')
    loadSubscriptions()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

function notifySubscribers() {
  showNotifyDialog.value = true
}

async function sendNotifications() {
  if (!notifyForm.post_id) {
    ElMessage.warning('请选择文章')
    return
  }
  try {
    await axios.post('/api/admin/notify', { post_id: notifyForm.post_id })
    ElMessage.success('通知已发送')
    showNotifyDialog.value = false
  } catch (e) {
    ElMessage.error('发送失败')
  }
}

function formatDate(date) {
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped>
.admin-subscriptions {
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