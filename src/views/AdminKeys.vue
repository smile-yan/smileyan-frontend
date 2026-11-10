<template>
  <div class="admin-keys">
    <div class="toolbar">
      <el-button type="primary" @click="openCreate">生成 Key</el-button>
    </div>

    <el-table :data="keys" border>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="名称" min-width="120" show-overflow-tooltip />
      <el-table-column label="Key" min-width="280">
        <template #default="{ row }">
          <code class="key-code">{{ row.api_key }}</code>
          <el-button link size="small" @click="copyKey(row)">复制</el-button>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.expired ? 'danger' : 'success'">
            {{ row.expired ? '已过期' : '有效' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="expires_at" label="有效期至" width="190" />
      <el-table-column prop="last_used_at" label="最近使用" width="190" />
      <el-table-column prop="created_at" label="创建时间" width="190" />
      <el-table-column label="操作" width="130">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="revokeKey(row)">撤销</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 生成 / 编辑对话框 -->
    <el-dialog v-model="showDialog" :title="isEdit ? '编辑 Key' : '生成 Key'" width="420px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="备注用途，如：小明的笔记本" />
        </el-form-item>
        <el-form-item label="有效期">
          <el-select v-model="form.expires_in_days">
            <el-option label="7 天" :value="7" />
            <el-option label="30 天" :value="30" />
            <el-option label="90 天" :value="90" />
            <el-option label="180 天" :value="180" />
            <el-option label="1 年" :value="365" />
          </el-select>
          <div class="expire-tip">{{ isEdit ? '从当前时间起重新计算有效期' : '从当前时间起计算有效期' }}</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveKey">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from '@/utils/axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const keys = ref([])
const showDialog = ref(false)
const saving = ref(false)
const isEdit = ref(false)
const editingId = ref(null)

const form = reactive({
  name: '',
  expires_in_days: 30
})

onMounted(() => {
  loadKeys()
})

async function loadKeys() {
  const res = await axios.get('/api/admin/keys')
  keys.value = res.data
}

function openCreate() {
  isEdit.value = false
  editingId.value = null
  form.name = ''
  form.expires_in_days = 30
  showDialog.value = true
}

function openEdit(row) {
  isEdit.value = true
  editingId.value = row.id
  form.name = row.name
  form.expires_in_days = 30
  showDialog.value = true
}

async function saveKey() {
  saving.value = true
  try {
    if (isEdit.value) {
      await axios.put(`/api/admin/keys/_id/${editingId.value}`, form)
      ElMessage.success('已更新')
    } else {
      const res = await axios.post('/api/admin/keys', form)
      showDialog.value = false
      await ElMessageBox.alert(
        `请立即复制并妥善保管：\n\n${res.data.api_key}`,
        'Key 生成成功',
        { confirmButtonText: '复制并关闭' }
      ).catch(() => {})
      copyText(res.data.api_key)
    }
    showDialog.value = false
    loadKeys()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '保存失败')
  } finally {
    saving.value = false
  }
}

async function revokeKey(row) {
  await ElMessageBox.confirm(
    `确定要撤销「${row.name || row.api_key.slice(0, 8) + '…'}」吗？撤销后立即失效。`,
    '提示',
    { type: 'warning' }
  )
  try {
    await axios.delete(`/api/admin/keys/_id/${row.id}`)
    ElMessage.success('已撤销')
    loadKeys()
  } catch (e) {
    ElMessage.error('撤销失败')
  }
}

function copyKey(row) {
  copyText(row.api_key)
}

function copyText(text) {
  navigator.clipboard?.writeText(text).then(
    () => ElMessage.success('已复制到剪贴板'),
    () => ElMessage.warning('复制失败，请手动复制')
  )
}
</script>

<style scoped>
.admin-keys {
  padding: 20px;
}

.toolbar {
  margin-bottom: 20px;
}

.key-code {
  font-family: monospace;
  font-size: 12px;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 6px;
  word-break: break-all;
}

.expire-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
  margin-top: 4px;
}
</style>
