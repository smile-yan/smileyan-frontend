<template>
  <div class="page-detail">
    <div v-if="loading" class="loading">
      <el-skeleton :rows="10" animated />
    </div>
    <template v-else-if="page">
      <h1>{{ page.title }}</h1>
      <div class="page-content" v-html="page.html_content"></div>
    </template>
    <div v-else class="not-found">
      <el-empty description="页面不存在" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from '@/utils/axios'

const route = useRoute()

const page = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await axios.get(`/api/pages/${route.params.slug}`)
    page.value = res.data
  } catch (e) {
    console.error('Failed to load page', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page-detail {
  max-width: 800px;
  margin: 0 auto;
}

.page-detail h1 {
  font-size: 32px;
  margin-bottom: 30px;
}

.page-content {
  line-height: 1.8;
  font-size: 16px;
}

:deep(.page-content > p > code),
:deep(.page-content > code) {
  color: #409eff;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
}

:deep(.article-h1) {
  margin: 40px 0 20px;
  font-size: 32px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

:deep(.article-h2) {
  margin: 35px 0 18px;
  font-size: 26px;
}

:deep(.article-h3) {
  margin: 30px 0 15px;
  font-size: 22px;
}

:deep(.article-h4) {
  margin: 25px 0 12px;
  font-size: 18px;
}

:deep(.article-h5),
:deep(.article-h6) {
  margin: 20px 0 10px;
  font-size: 16px;
}

:deep(.article-p) {
  margin: 15px 0;
}

:deep(.code-block) {
  background: #f6f8fa;
  padding: 15px;
  border-radius: 6px;
  overflow-x: auto;
}

:deep(.article-image) {
  max-width: 100%;
}

/* 表格样式 - Typora 风格 */
:deep(.article-table) {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
  font-size: 14px;
  overflow: hidden;
  border-radius: 6px;
  box-shadow: 0 0 0 1px #e5e9f2;
}

:deep(.article-thead) {
  background: #f8f9fb;
}

:deep(.article-th),
:deep(.article-td) {
  padding: 16px 20px;
  border: 1px solid #e5e9f2;
  text-align: left;
  line-height: 1.8;
}

:deep(.article-th) {
  font-weight: 600;
  color: #2c3e50;
  background: #f8f9fb;
}

:deep(.article-tr) {
  border-bottom: 1px solid #e5e9f2;
}

:deep(.article-tr:nth-child(even)) {
  background: #fafbfc;
}

:deep(.article-tr:hover) {
  background: #f0f4f8;
}

.not-found {
  text-align: center;
  padding: 50px;
}
</style>