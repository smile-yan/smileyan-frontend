<template>
  <div class="post-detail">
    <div v-if="loading" class="loading">
      <el-skeleton :rows="10" animated />
    </div>
    <template v-else-if="post">
      <div class="post-container">
        <article class="article" ref="articleRef">
          <header class="article-header">
            <h1>{{ post.title }}</h1>
            <div class="article-actions">
              <el-button
                v-if="userStore.isLoggedIn && userStore.isAdmin"
                type="primary"
                size="small"
                @click="editPost"
                :icon="Edit"
                title="编辑文章"
              >
                编辑
              </el-button>
              <el-button
                :type="isSpeaking ? 'danger' : 'primary'"
                size="small"
                @click="toggleSpeak"
                circle
                :title="isSpeaking ? '停止朗读' : '朗读文章'"
              >
                <span v-if="isSpeaking">■</span>
                <span v-else>🔊</span>
              </el-button>
            </div>
            <div class="article-meta">
              <span>{{ formatDate(post.created_at) }}</span>
              <span class="category" v-if="post.category">{{ post.category.name }}</span>
              <span>阅读 {{ post.view_count }}</span>
            </div>
            <div class="article-tags" v-if="post.tags && post.tags.length">
              <el-tag v-for="tag in post.tags" :key="tag.id" size="small">{{ tag.name }}</el-tag>
            </div>
          </header>
          <div class="article-content" v-html="post.html_content" ref="articleContent"></div>
        </article>

        <!-- 右侧导航 -->
        <nav class="toc-nav" v-if="toc.length > 0">
          <div class="toc-title">目录</div>
          <ul class="toc-list">
            <li v-for="item in toc" :key="item.id"
                :class="['toc-item', `toc-level-${item.level}`, { active: activeId === item.id }]">
              <a :href="'#' + item.id" @click.prevent="scrollTo(item.id)">{{ item.text }}</a>
            </li>
          </ul>
        </nav>
      </div>

      <!-- 评论区域 -->
      <section class="comments-section">
        <h2>评论</h2>
        <div v-if="userStore.isLoggedIn" class="comment-form">
          <el-input
            v-model="newComment"
            type="textarea"
            :rows="3"
            placeholder="写下你的评论..."
          />
          <el-button type="primary" @click="submitComment" :disabled="!newComment.trim()">
            发表评论
          </el-button>
        </div>
        <div v-else class="login-tip">
          <el-button type="primary" @click="$parent.showLogin = true">登录后发表评论</el-button>
        </div>

        <div class="comment-list">
          <div v-for="comment in comments" :key="comment.id" class="comment-item" :id="'comment-' + comment.id">
            <div class="comment-header">
              <img :src="comment.user.avatar || '/default-avatar.png'" class="comment-avatar" />
              <span class="comment-author">{{ comment.user.nickname }}</span>
              <span class="comment-time">{{ formatDate(comment.created_at) }}</span>
            </div>
            <div class="comment-content">{{ comment.content }}</div>
            <div class="comment-actions">
              <el-button link type="primary" @click="showReplyForm(comment.id)" v-if="userStore.isLoggedIn">
                回复
              </el-button>
            </div>
            <!-- 回复列表 -->
            <div v-if="comment.children && comment.children.length" class="reply-list">
              <div v-for="reply in comment.children" :key="reply.id" class="comment-item reply">
                <div class="comment-header">
                  <img :src="reply.user.avatar || '/default-avatar.png'" class="comment-avatar" />
                  <span class="comment-author">{{ reply.user.nickname }}</span>
                  <span class="comment-time">{{ formatDate(reply.created_at) }}</span>
                </div>
                <div class="comment-content">{{ reply.content }}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
    <div v-else class="not-found">
      <el-empty description="文章不存在" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import { Edit } from '@element-plus/icons-vue'
import axios from '@/utils/axios'
import { ElMessage } from 'element-plus'
import { initImageViewer as initNativeImageViewer, destroy as destroyNativeViewer } from '@/utils/imageViewer'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const post = ref(null)
const comments = ref([])
const loading = ref(true)
const newComment = ref('')
const replyTo = ref(null)
const articleRef = ref(null)
const articleContent = ref(null)
const toc = ref([])
const activeId = ref('')
const tocLeft = ref(0)
const isSpeaking = ref(false)
let speechSynthesis = null
let utterance = null

// TTS 朗读功能
function initSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    speechSynthesis = window.speechSynthesis
  }
}

// 图片查看器功能 - 使用原生实现
function initImageViewer() {
  console.log('Initializing native image viewer...')

  // 使用 requestAnimationFrame 确保 DOM 完全渲染
  requestAnimationFrame(() => {
    try {
      // 使用原生图片查看器
      initNativeImageViewer('.article-content')
      console.log('Native image viewer initialized successfully')
    } catch (e) {
      console.error('Error initializing native image viewer:', e)
    }
  })
}

function stripMarkdown(text) {
  if (!text) return ''
  // 去除 Markdown 标记
  let result = text
  // 去除标题标记 # 等
  result = result.replace(/^#{1,6}\s+/gm, '')
  // 去除加粗 ** 等
  result = result.replace(/\*\*/g, '')
  // 去除斜体 * 等
  result = result.replace(/\*/g, '')
  // 去除行内代码 ` 等
  result = result.replace(/`/g, '')
  // 去除链接文字 [text](url) -> text
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  // 去除图片 ![alt](url)
  result = result.replace(/!\[[^\]]*\]\([^)]+\)/g, '')
  // 去除分割线 ---
  result = result.replace(/^---+$/gm, '')
  // 去除列表标记 - 或 * 或数字.
  result = result.replace(/^[\s]*[-*]\s+/gm, '')
  result = result.replace(/^[\s]*\d+\.\s+/gm, '')
  // 去除 HTML 标签
  result = result.replace(/<[^>]+>/g, '')
  // 去除多余空白
  result = result.replace(/\n{3,}/g, '\n\n')
  result = result.trim()
  return result
}

function toggleSpeak() {
  if (!speechSynthesis) {
    ElMessage.warning('您的浏览器不支持语音合成')
    return
  }

  if (isSpeaking.value) {
    speechSynthesis.cancel()
    isSpeaking.value = false
    return
  }

  const textToSpeak = stripMarkdown(post.value?.content || '')
  if (!textToSpeak) {
    ElMessage.warning('没有可朗读的内容')
    return
  }

  utterance = new SpeechSynthesisUtterance(textToSpeak)
  // 尝试设置中文语音
  const voices = speechSynthesis.getVoices()
  const chineseVoice = voices.find(v => v.lang.includes('zh'))
  if (chineseVoice) {
    utterance.voice = chineseVoice
  }
  utterance.lang = 'zh-CN'
  utterance.rate = 1.0
  utterance.pitch = 1.0

  utterance.onstart = () => {
    isSpeaking.value = true
  }
  utterance.onend = () => {
    isSpeaking.value = false
  }
  utterance.onerror = () => {
    isSpeaking.value = false
  }

  speechSynthesis.speak(utterance)
}

function updateTocPosition() {
  if (!articleRef.value) return
  const article = articleRef.value
  const rect = article.getBoundingClientRect()
  // 导航栏的左边位置 = 文章的右边位置 + 20px 间距
  tocLeft.value = rect.right + 20
}

onMounted(async () => {
  initSpeech()
  await loadPost()
  await loadComments()
  window.addEventListener('scroll', updateActiveToc)
  window.addEventListener('resize', updateTocPosition)
  nextTick(() => {
    updateTocPosition()
  })
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateActiveToc)
  window.removeEventListener('resize', updateTocPosition)
  if (speechSynthesis) {
    speechSynthesis.cancel()
  }
  destroyNativeViewer()
})

function buildToc() {
  if (!articleRef.value) return
  const headings = articleRef.value.querySelectorAll('h1, h2, h3')
  toc.value = []
  headings.forEach((heading, index) => {
    // 生成唯一 ID
    if (!heading.id) {
      heading.id = `heading-${index}`
    }
    toc.value.push({
      id: heading.id,
      text: heading.textContent,
      level: parseInt(heading.tagName[1])
    })
  })
}

function updateActiveToc() {
  if (!articleRef.value) return
  const headings = articleRef.value.querySelectorAll('h1, h2, h3')
  const scrollTop = window.scrollY + 100

  for (let i = headings.length - 1; i >= 0; i--) {
    const heading = headings[i]
    if (heading.offsetTop <= scrollTop) {
      activeId.value = heading.id
      return
    }
  }
  if (headings.length > 0) {
    activeId.value = headings[0].id
  }
}

function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
    activeId.value = id
  }
}

async function loadPost() {
  try {
    const res = await axios.get(`/api/posts/${route.params.slug}`)
    post.value = res.data
    // 渲染代码高亮 - 需要等待 v-html 内容渲染完成
    await nextTick()
    setTimeout(() => {
      // 先尝试对每个代码块单独处理
      const codeBlocks = document.querySelectorAll('.article-content pre code')
      codeBlocks.forEach((block) => {
        if (window.Prism) {
          window.Prism.highlightElement(block)
        }
      })
      // 如果没有找到，再尝试 highlightAll
      if (codeBlocks.length === 0 && window.Prism) {
        window.Prism.highlightAll()
      }
      // 渲染数学公式
      if (window.MathJax) {
        window.MathJax.typesetPromise()
      }
      // 构建目录
      buildToc()
      // 初始化图片查看器
      initImageViewer()
    }, 200)
  } catch (e) {
    console.error('Failed to load post', e)
  } finally {
    loading.value = false
  }
}

async function loadComments() {
  try {
    const res = await axios.get('/api/comments', {
      params: { post_id: post.value?.id }
    })
    comments.value = res.data
  } catch (e) {
    console.error('Failed to load comments', e)
  }
}

async function submitComment() {
  if (!newComment.value.trim()) return
  try {
    await axios.post('/api/comments', {
      post_id: post.value.id,
      content: newComment.value,
      parent_id: replyTo.value
    })
    ElMessage.success('评论已提交，等待审核')
    newComment.value = ''
    replyTo.value = null
    await loadComments()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '评论失败')
  }
}

function showReplyForm(commentId) {
  replyTo.value = commentId
  newComment.value = ''
  ElMessage.info('请在上方输入回复内容')
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('zh-CN')
}

function editPost() {
  const returnUrl = encodeURIComponent(window.location.pathname)
  router.push(`/admin/editor/${post.value.id}?returnUrl=${returnUrl}`)
}
</script>

<style scoped>
.post-detail {
  width: 100%;
}

.post-container {
  display: flex;
  max-width: 1200px;
  margin: 0 auto;
  justify-content: center;
  gap: 40px;
}

.article {
  flex: 0 0 800px;
  max-width: 800px;
}

/* 右侧目录导航 */
.toc-nav {
  position: sticky;
  top: 100px;
  align-self: flex-start;
  width: 200px;
  max-height: 70vh;
  overflow-y: auto;
  padding: 15px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.toc-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-item {
  margin: 4px 0;
}

.toc-item a {
  display: block;
  color: #606266;
  text-decoration: none;
  font-size: 13px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.toc-item a:hover {
  color: #409eff;
  background: #f5f7fa;
}

.toc-item.active a {
  color: #409eff;
  background: #ecf5ff;
  font-weight: 500;
}

.toc-level-1 {
  padding-left: 0;
}

.toc-level-2 {
  padding-left: 12px;
}

.toc-level-3 {
  padding-left: 24px;
}

.article-header {
  margin-bottom: 30px;
  position: relative;
}

.article-actions {
  position: absolute;
  top: 0;
  right: 0;
}

.article-header h1 {
  font-size: 32px;
  margin-bottom: 15px;
}

.article-meta {
  display: flex;
  gap: 20px;
  color: #999;
  font-size: 14px;
}

.category {
  color: #409eff;
}

.article-tags {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.article-content {
  line-height: 1.8;
  font-size: 16px;
  max-width: 100%;
}

/* 文章内容中的图片自适应 */
:deep(.article-content img) {
  max-width: 100%;
  width: 100%;
  height: auto;
  cursor: zoom-in;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border-radius: 4px;
}

:deep(.article-content img:hover) {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* blockquote 样式 */
:deep(.article-blockquote) {
  border-left: 4px solid #409eff;
  margin: 15px 0;
  color: #666;
  overflow: hidden;
}

/* blockquote 内部段落样式 */
:deep(.article-blockquote .article-p) {
  margin: 0;
  padding-left: 15px;
}

/* blockquote 内的链接样式 */
:deep(.article-blockquote .article-link) {
  color: #666 !important;
}

:deep(.article-content code:not(pre code)) {
  color: #2672c5 !important;
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

:deep(strong),
:deep(b) {
  font-weight: 800;
}

:deep(.article-hr) {
  margin: 2px 0;
  border: none;
  border-top: 1px solid #e0e0e0;
}

/* 列表样式 */
:deep(.article-list) {
  margin: 16px 0;
  padding-left: 24px;
}

:deep(.article-list-item) {
  margin: 8px 0;
  line-height: 1.8;
}

/* PrismJS 代码块样式 - Tomorrow Night */
:deep(.code-block) {
  background: #1d1f21;
  border-radius: 5px;
  padding: 15px;
  overflow-x: auto;
  margin: 15px 0;
}

:deep(.code-block code) {
  background: none;
  padding: 0;
  font-family: 'JetBrains Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 14px;
}

:deep(.article-image) {
  max-width: 100%;
}

/* 图片标题样式 */
:deep(.article-figure) {
  text-align: center;
  margin: 20px 0;
}

:deep(.article-figure .article-image) {
  max-width: 100%;
}

:deep(.article-figcaption) {
  font-size: 13px;
  color: #666;
  margin-top: 0;
  margin-bottom: 0;
  text-align: center;
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
  background: #e8eef5 !important;
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
  background: #e8eef5 !important;
}

:deep(.article-tbody) {
  border-bottom: 1px solid #e5e9f2;
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

.comments-section {
  margin-top: 50px;
  padding-top: 30px;
  border-top: 1px solid #eee;
}

.comments-section h2 {
  margin-bottom: 20px;
}

.comment-form {
  margin-bottom: 30px;
}

.comment-form .el-button {
  margin-top: 10px;
}

.login-tip {
  margin-bottom: 30px;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.comment-item {
  padding: 15px;
  background: #f9f9f9;
  border-radius: 8px;
}

.comment-item.reply {
  margin-left: 40px;
  background: #f5f5f5;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.comment-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.comment-author {
  font-weight: 500;
}

.comment-time {
  color: #999;
  font-size: 12px;
}

.comment-content {
  line-height: 1.6;
}

.comment-actions {
  margin-top: 10px;
}

.reply-list {
  margin-top: 15px;
}

.not-found {
  text-align: center;
  padding: 50px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .post-container {
    flex-direction: column;
  }

  .article {
    max-width: 100%;
    width: 100%;
    margin-right: 0;
    padding: 0 15px;
    flex: none;
  }

  .article-header h1 {
    font-size: 24px;
  }

  .article-content {
    font-size: 15px;
  }

  /* 移动端图片自适应 */
  :deep(.article-content img) {
    max-width: 100% !important;
    height: auto !important;
    cursor: zoom-in;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    border-radius: 4px;
  }

  :deep(.article-content img:hover) {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  :deep(.article-h1) {
    font-size: 24px;
  }

  :deep(.article-h2) {
    font-size: 20px;
  }

  :deep(.article-h3) {
    font-size: 18px;
  }

  .toc-nav {
    display: none;
  }

  .comments-section {
    padding: 0 15px;
  }

  .comment-item.reply {
    margin-left: 20px;
  }
}
</style>