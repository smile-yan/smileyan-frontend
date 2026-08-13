<template>
  <div class="page-detail">
    <div v-if="loading" class="loading">
      <el-skeleton :rows="10" animated />
    </div>
    <template v-else-if="page">
      <h1>{{ page.title }}</h1>
      <div class="page-content" v-html="page.html_content" ref="pageContent"></div>
    </template>
    <div v-else class="not-found">
      <el-empty description="页面不存在" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import axios from '@/utils/axios'
import { initImageViewer, destroy as destroyViewer } from '@/utils/imageViewer'

const route = useRoute()

const page = ref(null)
const loading = ref(true)
const pageContent = ref(null)

onMounted(async () => {
  try {
    const res = await axios.get(`/api/pages/${route.params.slug}`)
    page.value = res.data
    // 等待 DOM 更新后初始化图片查看器
    await nextTick()
    setTimeout(() => {
      initImageViewer('.page-content')
    }, 100)
  } catch (e) {
    console.error('Failed to load page', e)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  destroyViewer()
})
</script>

<style scoped>
.page-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-detail h1 {
  font-size: 32px;
  margin-bottom: 20px;
}

.page-content {
  line-height: 1.8;
}

.page-content img {
  max-width: 100%;
  height: auto;
  cursor: zoom-in;
  transition: transform 0.2s, box-shadow 0.2s;
  border-radius: 4px;
}

.page-content img:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.loading {
  padding: 20px;
}

.not-found {
  padding: 50px;
}
</style>