<template>
  <div class="admin-keys">
    <el-alert type="info" :closable="false" show-icon title="令牌权限" class="permission-alert">
      <div class="permission-list">
        <span>创建/更新文章、页面</span>
        <span>管理标签、分类</span>
        <span>阅读并审核评论</span>
        <span class="deny">不可删除任何内容</span>
        <span class="deny">不可管理用户、订阅或令牌</span>
        <span>仅用于 API 调用，不能登录后台</span>
      </div>
    </el-alert>

    <div class="toolbar">
      <span class="toolbar-title">API 令牌</span>
      <el-button type="primary" @click="openCreate">创建令牌</el-button>
    </div>

    <el-table v-loading="loading" :data="keys" border>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column label="名称" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ row.name || '未命名令牌' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.expired ? 'danger' : 'success'">
            {{ row.expired ? '已过期' : '有效' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="有效期至" width="180">
        <template #default="{ row }">{{ formatDate(row.expires_at) }}</template>
      </el-table-column>
      <el-table-column label="最近使用" width="180">
        <template #default="{ row }">{{ formatDate(row.last_used_at) }}</template>
      </el-table-column>
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="130">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="revokeKey(row)">撤销</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && keys.length === 0" description="还没有创建过令牌" />

    <!-- 创建 / 编辑 -->
    <el-dialog v-model="showForm" :title="editingId ? '编辑令牌' : '创建令牌'" width="460px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="名称">
          <el-input v-model="form.name" maxlength="100" placeholder="备注用途，如：内容发布脚本" />
        </el-form-item>
        <el-form-item label="有效天数">
          <el-input-number v-model="form.expires_in_days" :min="1" :max="365" />
          <div class="expire-tip">
            最长 365 天（1 年）。{{ editingId ? '保存后从当前时间重新计算有效期。' : '从创建时间开始计算。' }}
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showForm = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveKey">保存</el-button>
      </template>
    </el-dialog>

    <!-- 令牌仅创建时展示一次 -->
    <el-dialog
      v-model="showToken"
      title="令牌创建成功"
      width="560px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="令牌仅显示一次"
        description="请立即复制并妥善保存。关闭后无法再次查看；丢失后只能重新创建。"
      />
      <div class="token-box">
        <code class="token-code">{{ newToken }}</code>
      </div>
      <div class="usage">
        <div class="usage-title">调用示例</div>
        <pre class="usage-code">curl -H "Authorization: Bearer {{ newToken }}" https://smileyan.cn/api/admin/posts/summary</pre>
      </div>
      <template #footer>
        <el-button @click="showToken = false">关闭</el-button>
        <el-button type="primary" @click="copyToken">复制令牌</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from '@/utils/axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const keys = ref([])
const loading = ref(false)
const showForm = ref(false)
const saving = ref(false)
const editingId = ref(null)
const showToken = ref(false)
const newToken = ref('')

const form = reactive({
  name: '',
  expires_in_days: 30
})

onMounted(() => {
  loadKeys()
})

async function loadKeys() {
  loading.value = true
  try {
    const res = await axios.get('/api/admin/keys')
    keys.value = res.data
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '加载令牌失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  form.name = ''
  form.expires_in_days = 30
  showForm.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.name = row.name || ''
  form.expires_in_days = 30
  showForm.value = true
}

async function saveKey() {
  if (!Number.isInteger(form.expires_in_days) || form.expires_in_days < 1 || form.expires_in_days > 365) {
    ElMessage.warning('有效天数需在 1–365 之间')
    return
  }

  saving.value = true
  try {
    if (editingId.value) {
      await axios.put(`/api/admin/keys/_id/${editingId.value}`, {
        name: form.name,
        expires_in_days: form.expires_in_days
      })
      ElMessage.success('已更新')
    } else {
      const res = await axios.post('/api/admin/keys', {
        name: form.name,
        expires_in_days: form.expires_in_days
      })
      newToken.value = res.data.api_key
      showToken.value = true
      ElMessage.success('令牌已创建')
    }
    showForm.value = false
    await loadKeys()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '保存失败')
  } finally {
    saving.value = false
  }
}

async function revokeKey(row) {
  try {
    await ElMessageBox.confirm(
      `确定撤销「${row.name || '未命名令牌'}」吗？撤销后立即失效。`,
      '提示',
      { type: 'warning' }
    )
  } catch {
    return
  }

  try {
    await axios.delete(`/api/admin/keys/_id/${row.id}`)
    ElMessage.success('已撤销')
    await loadKeys()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '撤销失败')
  }
}

function copyToken() {
  copyText(newToken.value)
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.warning('复制失败，请手动选择复制')
  }
}

function formatDate(value) {
  if (!value || value.startsWith('0001-01-01')) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN')
}
</script>

<style scoped>
.admin-keys {
  padding: 20px;
}

.permission-alert {
  margin-bottom: 20px;
}

.permission-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin-top: 6px;
  font-size: 13px;
}

.permission-list .deny {
  color: #f56c6c;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.toolbar-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.expire-tip {
  width: 100%;
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}

.token-box {
  margin: 16px 0;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #f5f7fa;
}

.token-code {
  display: block;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-all;
  color: #303133;
}

.usage-title {
  margin-bottom: 6px;
  font-size: 13px;
  color: #606266;
}

.usage-code {
  margin: 0;
  padding: 10px 12px;
  overflow-x: auto;
  border-radius: 6px;
  background: #1f2329;
  color: #e6e6e6;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
