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
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import axios from '@/utils/axios'
import Viewer from 'viewerjs'
import 'viewerjs/dist/viewer.css'

const route = useRoute()

const page = ref(null)
const loading = ref(true)
let viewer = null

onMounted(async () => {
  try {
    const res = await axios.get(`/api/pages/${route.params.slug}`)
    page.value = res.data
    // 等待 DOM 更新后初始化图片查看器
    await nextTick()
    setTimeout(() => {
      initImageViewer()
    }, 100)
  } catch (e) {
    console.error('Failed to load page', e)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (viewer) {
    viewer.destroy()
  }
})

// 初始化图片查看器
function initImageViewer() {
  const images = document.querySelectorAll('.page-content img')
  if (images.length === 0) return

  images.forEach((img, index) => {
    img.style.cursor = 'pointer'
    img.style.transition = 'transform 0.2s, box-shadow 0.2s'
    img.addEventListener('mouseenter', () => {
      img.style.transform = 'scale(1.02)'
      img.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
    })
    img.addEventListener('mouseleave', () => {
      img.style.transform = 'scale(1)'
      img.style.boxShadow = 'none'
    })
    img.addEventListener('click', (e) => {
      e.preventDefault()
      const allImages = Array.from(document.querySelectorAll('.page-content img'))
      const currentIndex = allImages.indexOf(img)
      openImageViewer(allImages, currentIndex)
    })
  })
}

// 打开图片查看器
function openImageViewer(images, index) {
  // 创建临时容器
  const tempDiv = document.createElement('div')
  tempDiv.style.display = 'none'
  document.body.appendChild(tempDiv)

  // 添加所有图片
  images.forEach(img => {
    const tempImg = document.createElement('img')
    tempImg.src = img.src
    tempImg.alt = img.alt || ''
    tempDiv.appendChild(tempImg)
  })

  // 创建查看器
  if (viewer) {
    viewer.destroy()
  }

  viewer = new Viewer(tempDiv, {
    url: 'src',
    initialViewIndex: index,
    toolbar: {
      zoomIn: true,
      zoomOut: true,
      oneToOne: true,
      reset: true,
      prev: true,
      play: true,
      next: true,
      rotateLeft: true,
      rotateRight: true,
      flipHorizontal: false,
      flipVertical: false
    },
    title: function(image) {
      return image.alt || ''
    },
    transition: true,
    fullscreen: true,
    keyboard: true
  })

  viewer.show()

  // 清理临时容器
  const originalHide = viewer.hide
  viewer.hide = function() {
    const result = originalHide.call(this)
    if (tempDiv && tempDiv.parentNode) {
      tempDiv.parentNode.removeChild(tempDiv)
    }
    viewer = null
    return result
  }
}
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

/* 页面内容中的图片样式 */
:deep(.page-content img) {
  max-width: 100%;
  width: 100%;
  height: auto;
  cursor: zoom-in;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border-radius: 4px;
}

:deep(.page-content img:hover) {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
  cursor: zoom-in;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border-radius: 4px;
}

:deep(.article-image:hover) {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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