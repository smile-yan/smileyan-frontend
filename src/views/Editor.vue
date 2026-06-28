<template>
  <div class="editor-page">

    <!-- 顶部工具栏 -->
    <div class="editor-header">
      <div class="hd-left">
        <button class="tb" @click="goBack">← 返回</button>
      </div>

      <!-- 视图模式切换 -->
      <div class="view-bar">
        <button class="tb" :class="{ on: previewMode === 'typora' }" @click="setMode('typora')">Typora</button>
        <button class="tb" :class="{ on: previewMode === 'split' }" @click="setMode('split')">分栏</button>
        <button class="tb" :class="{ on: previewMode === 'edit' }" @click="setMode('edit')">编辑</button>
        <button class="tb" :class="{ on: previewMode === 'preview' }" @click="setMode('preview')">预览</button>
      </div>

      <div class="hd-right">
        <button class="tb save-btn" @click="savePost">{{ isNew ? '发布文章' : '保存修改' }}</button>
      </div>
    </div>

    <!-- 文章元数据配置栏 -->
    <div class="top-bar">
      <div class="meta-row">
        <el-form class="meta-form">
          <el-form-item label="标题" class="fi fi-title">
            <el-input v-model="form.title" placeholder="文章标题" />
          </el-form-item>
          <el-form-item label="Slug" class="fi fi-slug">
            <el-input v-model="form.slug" placeholder="URL路径" />
          </el-form-item>
          <el-form-item label="状态" class="fi fi-status">
            <el-select v-model="form.status">
              <el-option label="草稿" value="draft" />
              <el-option label="发布" value="published" />
              <el-option label="隐藏" value="hidden" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      <div class="meta-row">
        <el-form class="meta-form">
          <el-form-item label="分类" class="fi fi-cat">
            <el-select v-model="form.category_id" placeholder="选择分类" clearable>
              <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="标签" class="fi fi-tags">
            <el-select v-model="form.tag_ids" multiple placeholder="选择标签">
              <el-option v-for="tag in tags" :key="tag.id" :label="tag.name" :value="tag.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="封面" class="fi fi-cover">
            <el-input v-model="form.cover_image" placeholder="封面图片URL" />
          </el-form-item>
        </el-form>
      </div>
      <div class="meta-row meta-row-last">
        <el-form class="meta-form">
          <el-form-item label="摘要" class="fi fi-excerpt">
            <el-input v-model="form.excerpt" type="textarea" :rows="2" placeholder="文章摘要（可选）" />
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 编辑区主体 -->
    <div class="editor-workspace" :data-mode="previewMode">

      <!-- 编辑面板（split / edit 模式） -->
      <div class="ep ep-editor">
        <textarea
          ref="srcRef"
          v-model="form.content"
          class="source-editor"
          placeholder="在这里编写文章内容（支持 Markdown）…"
          spellcheck="false"
          @keydown="handleKeydown"
          @scroll="onEditorScroll"
          @click="updateCursorPos"
          @keyup="updateCursorPos"
        ></textarea>
      </div>

      <!-- 可拖拽分隔线 -->
      <div class="ep-divider" ref="dividerRef"></div>

      <!-- 预览面板（split / preview 模式） -->
      <div class="ep ep-preview" ref="previewPaneRef" @scroll="onPreviewScroll">
        <div class="preview-inner">
          <h1 v-if="form.title" class="preview-title">{{ form.title }}</h1>
          <div
            v-if="form.category_id || (form.tag_ids && form.tag_ids.length)"
            class="preview-meta"
          >
            <span v-if="form.category_id && categories.find(c => c.id === form.category_id)">
              分类：{{ categories.find(c => c.id === form.category_id)?.name }}
            </span>
            <span v-if="form.tag_ids && form.tag_ids.length">
              标签：{{ form.tag_ids.map(id => tags.find(t => t.id === id)?.name).filter(Boolean).join('、') }}
            </span>
          </div>
          <div v-if="form.cover_image" class="preview-cover">
            <img :src="form.cover_image" alt="封面" />
          </div>
          <div class="markdown-body" ref="previewRef" v-html="renderedContent"></div>
        </div>
      </div>

      <!-- Typora 单面板 -->
      <div class="ep ep-typora" ref="tyDocRef" @click.self="typoraClickAway">
        <div class="typora-doc">
          <div
            v-for="(blk, i) in typoraState.blocks"
            :key="i"
            class="ty-blk"
          >
            <!-- 渲染视图：点击进入编辑 -->
            <div
              v-if="typoraState.activeIdx !== i"
              class="ty-rendered"
              v-html="renderMdBlock(blk)"
              @click="activateTyporaBlock(i)"
            ></div>
            <!-- 编辑 textarea：挂载时自动聚焦 -->
            <textarea
              v-else
              :ref="el => onTyTaMount(i, el)"
              class="ty-src"
              :value="blk"
              @input="onTyInput(i, $event)"
              @blur="deactivateTyporaBlock()"
              @keydown="onTyKeydown(i, $event)"
            ></textarea>
          </div>
          <!-- 点击空白区域时提供一个新块入口 -->
          <div class="ty-newline" @click="appendTyporaBlock">
            <span>点击此处新增段落…</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../store/user'
import axios from '@/utils/axios'
import { ElMessage } from 'element-plus'
import MarkdownIt from 'markdown-it'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 获取回调地址，如果没有则默认回文章列表
const returnUrl = computed(() => {
  const url = route.query.returnUrl
  return url ? decodeURIComponent(url) : '/admin/posts'
})

const md = new MarkdownIt({ html: true, linkify: true, typographer: true })

function postProcessHTML(html) {
  html = html.replace(/<ul>/g, '<ul class="article-list">')
  html = html.replace(/<ol>/g, '<ol class="article-list">')
  html = html.replace(/<li>/g, '<li class="article-list-item">')
  html = html.replace(/<p>/g, '<p class="article-p">')
  html = html.replace(/<blockquote>/g, '<blockquote class="article-blockquote">')
  html = html.replace(/<a /g, '<a class="article-link" target="_blank" rel="noopener noreferrer" ')
  html = html.replace(/<img /g, '<img class="article-image" ')
  html = html.replace(/<h1>/g, '<h1 class="article-h1">')
  html = html.replace(/<h2>/g, '<h2 class="article-h2">')
  html = html.replace(/<h3>/g, '<h3 class="article-h3">')
  html = html.replace(/<h4>/g, '<h4 class="article-h4">')
  html = html.replace(/<h5>/g, '<h5 class="article-h5">')
  html = html.replace(/<h6>/g, '<h6 class="article-h6">')
  return html
}

// DOM refs
const srcRef = ref(null)
const dividerRef = ref(null)
const previewPaneRef = ref(null)
const previewRef = ref(null)
const tyDocRef = ref(null)
const tyTaRefs = {}

const postId = computed(() => route.params.id)
const isNew = computed(() => !postId.value || postId.value === 'new')
const currentPostId = ref(null)

const categories = ref([])
const tags = ref([])
const previewMode = ref('typora')

const form = reactive({
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  cover_image: '',
  category_id: null,
  tag_ids: [],
  status: 'published'
})

// ── Typora 状态 ───────────────────────────────────────

const typoraState = reactive({
  blocks: [],
  activeIdx: -1
})

function splitBlocks(mdText) {
  const lines = mdText.split('\n')
  const blocks = []
  let buf = []
  let fence = null
  let inMath = false

  const flush = () => {
    if (buf.length) { blocks.push(buf.join('\n')); buf = [] }
  }

  for (const line of lines) {
    if (fence) {
      buf.push(line)
      if (line.trimEnd() === fence) { flush(); fence = null }
      continue
    }
    if (inMath) {
      buf.push(line)
      if (line.trim() === '$$') { flush(); inMath = false }
      continue
    }

    const fenceMatch = line.match(/^(`{3,}|~{3,})/)
    if (fenceMatch) {
      flush(); fence = fenceMatch[1]; buf.push(line)
      continue
    }

    if (line.trim() === '$$') {
      flush(); inMath = true; buf.push(line)
      continue
    }

    if (line.trim() === '') { flush(); continue }

    if (/^#{1,6}\s/.test(line)) { flush(); blocks.push(line); continue }

    if (/^[-*_]{3,}\s*$/.test(line)) { flush(); blocks.push(line); continue }

    buf.push(line)
  }

  flush()
  return blocks.filter(b => b.trim())
}

function renderMdBlock(blk) {
  if (!blk) return ''
  return postProcessHTML(md.render(blk))
}

function autoResizeTa(ta) {
  ta.style.height = 'auto'
  ta.style.height = Math.max(ta.scrollHeight, 40) + 'px'
}

function onTyTaMount(i, el) {
  if (!el) { delete tyTaRefs[i]; return }
  tyTaRefs[i] = el
  nextTick(() => {
    autoResizeTa(el)
    el.focus()
    // 只在初始挂载时设置光标到末尾，后续由 onTyInput 管理
    if (!el.dataset.initialized) {
      el.setSelectionRange(el.value.length, el.value.length)
      el.dataset.initialized = 'true'
    }
  })
}

function activateTyporaBlock(idx) {
  if (typoraState.activeIdx === idx) return
  typoraState.activeIdx = idx
}

function deactivateTyporaBlock() {
  typoraState.activeIdx = -1
}

function typoraClickAway() {
  deactivateTyporaBlock()
}

function onTyInput(i, e) {
  const ta = e.target

  // 保存光标位置和滚动位置
  const cursorPos = ta.selectionStart
  const scrollTop = ta.scrollTop

  // 更新 blocks
  typoraState.blocks[i] = ta.value

  // 在下一个 tick 恢复光标位置
  nextTick(() => {
    // 获取重新挂载后的 textarea
    const newTa = tyTaRefs[i]
    if (newTa) {
      newTa.selectionStart = newTa.selectionEnd = cursorPos
      newTa.scrollTop = scrollTop
    }
  })

  autoResizeTa(ta)
  syncBlocksToSource()
}

function onTyKeydown(idx, e) {
  if (e.key === 'Escape') {
    e.target.blur()
    return
  }

  if (e.key === 'Tab') {
    e.preventDefault()
    const ta = e.target
    const p = ta.selectionStart
    ta.value = ta.value.slice(0, p) + '    ' + ta.value.slice(p)
    ta.selectionStart = ta.selectionEnd = p + 4
    autoResizeTa(ta)
    typoraState.blocks[idx] = ta.value
    syncBlocksToSource()
    return
  }

  // Ctrl/Cmd+Enter → 在当前块后插入新块
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    typoraState.blocks[idx] = e.target.value
    insertTyporaBlockAfter(idx)
  }
}

function insertTyporaBlockAfter(idx) {
  typoraState.blocks.splice(idx + 1, 0, '')
  syncBlocksToSource()
  typoraState.activeIdx = -1
  nextTick(() => activateTyporaBlock(idx + 1))
}

function appendTyporaBlock() {
  const last = typoraState.blocks.length - 1
  if (last >= 0 && typoraState.blocks[last] === '') {
    activateTyporaBlock(last)
  } else {
    insertTyporaBlockAfter(last)
  }
}

function syncBlocksToSource() {
  form.content = typoraState.blocks.join('\n\n')
}

function initTyporaBlocks() {
  typoraState.blocks = splitBlocks(form.content)
  typoraState.activeIdx = -1
}

// 切换模式时初始化 typora 块
function setMode(mode) {
  if (mode === 'typora') {
    initTyporaBlocks()
  }
  previewMode.value = mode
}

// ── 预览渲染 ──────────────────────────────────────────

const renderedContent = computed(() => {
  if (!form.content) return '<p style="color:#bbb;font-style:italic;">预览区域…</p>'
  return postProcessHTML(md.render(form.content))
})

let renderTimer = null
let tyRenderTimer = null

// split/preview 模式的 MathJax + PrismJS
watch([renderedContent, previewMode], async () => {
  if (previewMode.value === 'edit' || previewMode.value === 'typora') return
  if (renderTimer) clearTimeout(renderTimer)
  renderTimer = setTimeout(async () => {
    await nextTick()
    syncLock = true
    if (window.MathJax && previewRef.value) {
      await window.MathJax.typesetPromise([previewRef.value])
    }
    if (window.Prism && previewRef.value) {
      window.Prism.highlightAllUnder(previewRef.value)
    }
    requestAnimationFrame(() => { syncLock = false })
  }, 300)
})

// typora 模式的 PrismJS + MathJax（块内容变化后触发）
watch(() => typoraState.blocks.map(b => b).join('||'), async () => {
  if (previewMode.value !== 'typora') return
  await renderTyporaContent()
})

// 监听 activeIdx 变化：当退出编辑模式时触发渲染
watch(() => typoraState.activeIdx, async (newVal, oldVal) => {
  if (previewMode.value !== 'typora') return
  if (oldVal !== -1 && newVal === -1) {
    // 从编辑模式切换回渲染模式
    await renderTyporaContent()
  }
})

async function renderTyporaContent() {
  // 如果有块正在编辑，跳过渲染避免光标跳转
  if (typoraState.activeIdx !== -1) return
  if (tyRenderTimer) clearTimeout(tyRenderTimer)
  tyRenderTimer = setTimeout(async () => {
    // 再次检查，确保在执行渲染前没有开始编辑其他块
    if (typoraState.activeIdx !== -1) return

    await nextTick()
    syncLock = true
    if (window.Prism && tyDocRef.value) {
      tyDocRef.value.querySelectorAll('.ty-rendered').forEach(el => {
        window.Prism.highlightAllUnder(el)
      })
    }
    if (window.MathJax && tyDocRef.value) {
      const rendered = [...tyDocRef.value.querySelectorAll('.ty-rendered')]
      if (rendered.length) await window.MathJax.typesetPromise(rendered)
    }
    requestAnimationFrame(() => { syncLock = false })
  }, 50)
}

// ── 格式化操作（split / edit 模式使用） ──────────────────

function wrapSel(before, after, placeholder) {
  const ta = srcRef.value
  if (!ta) return
  const s = ta.selectionStart
  const e = ta.selectionEnd
  const sel = ta.value.slice(s, e)
  const ins = before + (sel || placeholder || '') + after
  ta.setRangeText(ins, s, e)
  const newS = sel ? s : s + before.length
  const newE = sel ? s + ins.length : s + before.length + (placeholder || '').length
  form.content = ta.value
  nextTick(() => {
    ta.selectionStart = newS
    ta.selectionEnd = newE
    ta.focus()
  })
}

function insertLine(text) {
  const ta = srcRef.value
  if (!ta) return
  const pos = ta.selectionStart
  let lineEnd = ta.value.indexOf('\n', pos)
  if (lineEnd === -1) lineEnd = ta.value.length
  const ins = '\n' + text
  ta.setRangeText(ins, lineEnd, lineEnd)
  ta.selectionStart = ta.selectionEnd = lineEnd + ins.length
  form.content = ta.value
  nextTick(() => ta.focus())
}

const fmtActions = {
  h1:     () => wrapSel('# ', '', '标题 1'),
  h2:     () => wrapSel('## ', '', '标题 2'),
  h3:     () => wrapSel('### ', '', '标题 3'),
  bold:   () => wrapSel('**', '**', '粗体文字'),
  italic: () => wrapSel('*', '*', '斜体文字'),
  strike: () => wrapSel('~~', '~~', '删除线文字'),
  code:   () => wrapSel('`', '`', 'code'),
  quote:  () => wrapSel('> ', '', '引用内容'),
  ul:     () => wrapSel('- ', '', '列表项'),
  ol:     () => wrapSel('1. ', '', '列表项'),
  hr:     () => insertLine('\n---\n'),
  math:   () => wrapSel('\n$$\n', '\n$$\n', 'E = mc^2'),
  link:   () => wrapSel('[', '](url)', '链接文字'),
  img:    () => wrapSel('![', '](url)', '图片说明'),
  table:  () => insertLine('| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |'),
}

function fmt(type) {
  fmtActions[type]?.()
}

// ── 键盘快捷键 ────────────────────────────────────────

function handleKeydown(e) {
  if (e.key === 'Tab') {
    e.preventDefault()
    const ta = srcRef.value
    const s = ta.selectionStart
    const end = ta.selectionEnd
    if (s === end) {
      ta.setRangeText('    ', s, s)
      ta.selectionStart = ta.selectionEnd = s + 4
    } else {
      const lines = ta.value.slice(s, end).replace(/^/gm, '    ')
      ta.setRangeText(lines, s, end)
    }
    form.content = ta.value
    return
  }
  const mod = e.ctrlKey || e.metaKey
  if (!mod) return
  switch (e.key.toLowerCase()) {
    case 'b': e.preventDefault(); fmt('bold'); break
    case 'i': e.preventDefault(); fmt('italic'); break
    case 'k': e.preventDefault(); fmt('link'); break
  }
}

function updateCursorPos() {}

// ── 同步滚动（split 模式） ────────────────────────────

let syncLock = false

function onEditorScroll() {
  if (syncLock || previewMode.value !== 'split') return
  const ta = srcRef.value
  const pp = previewPaneRef.value
  if (!ta || !pp) return
  syncLock = true
  const ratio = ta.scrollTop / (ta.scrollHeight - ta.clientHeight || 1)
  pp.scrollTop = ratio * (pp.scrollHeight - pp.clientHeight)
  requestAnimationFrame(() => { syncLock = false })
}

function onPreviewScroll() {
  if (syncLock || previewMode.value !== 'split') return
  const ta = srcRef.value
  const pp = previewPaneRef.value
  if (!ta || !pp) return
  syncLock = true
  const ratio = pp.scrollTop / (pp.scrollHeight - pp.clientHeight || 1)
  ta.scrollTop = ratio * (ta.scrollHeight - ta.clientHeight)
  requestAnimationFrame(() => { syncLock = false })
}

// ── 可拖拽分隔线 ──────────────────────────────────────

let cleanupResizer = null

function initResizer() {
  const div = dividerRef.value
  if (!div) return
  const ep = div.previousElementSibling
  let dragging = false, startX = 0, startEW = 0

  const onDown = e => {
    dragging = true
    startX = e.clientX
    startEW = ep.getBoundingClientRect().width
    div.classList.add('active')
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
  }

  const onMove = e => {
    if (!dragging) return
    const dx = e.clientX - startX
    const total = div.parentElement.getBoundingClientRect().width - div.offsetWidth
    const newW = Math.min(Math.max(startEW + dx, 200), total - 200)
    ep.style.flex = 'none'
    ep.style.width = newW + 'px'
  }

  const onUp = () => {
    if (!dragging) return
    dragging = false
    div.classList.remove('active')
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  }

  div.addEventListener('mousedown', onDown)
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  cleanupResizer = () => {
    div.removeEventListener('mousedown', onDown)
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
}

// ── 数据加载与保存 ────────────────────────────────────

onMounted(async () => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/')
    return
  }
  if (!userStore.user && userStore.token) {
    await userStore.fetchUser()
  }
  if (!userStore.isAdmin) {
    ElMessage.warning('需要管理员权限')
    router.push('/')
    return
  }

  await Promise.all([
    loadCategories(),
    loadTags(),
    isNew.value ? Promise.resolve() : loadPost()
  ])

  // 初始化 Typora 块（默认进入 typora 模式）
  initTyporaBlocks()

  const aside = document.querySelector('.admin .el-aside')
  if (aside) aside.style.display = 'none'
  const main = document.querySelector('.admin .el-main')
  if (main) { main.style.marginLeft = '0'; main.style.padding = '0' }
  const footer = document.querySelector('#app > .el-container > .el-footer')
  if (footer) footer.style.display = 'none'

  initResizer()
  document.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  const aside = document.querySelector('.admin .el-aside')
  if (aside) aside.style.display = ''
  const main = document.querySelector('.admin .el-main')
  if (main) { main.style.marginLeft = ''; main.style.padding = '' }
  const footer = document.querySelector('#app > .el-container > .el-footer')
  if (footer) footer.style.display = ''
  cleanupResizer?.()
  document.removeEventListener('keydown', onGlobalKeydown)
  if (renderTimer) clearTimeout(renderTimer)
  if (tyRenderTimer) clearTimeout(tyRenderTimer)
})

async function loadCategories() {
  try {
    const res = await axios.get('/api/categories')
    categories.value = res.data
  } catch (e) {
    console.error('加载分类失败', e)
  }
}

async function loadTags() {
  try {
    const res = await axios.get('/api/tags')
    tags.value = res.data
  } catch (e) {
    console.error('加载标签失败', e)
  }
}

async function loadPost() {
  try {
    const res = await axios.get(`/api/admin/posts/_id/${postId.value}`)
    const post = res.data
    currentPostId.value = post.id
    form.title = post.title
    form.slug = post.slug
    form.content = post.content
    form.excerpt = post.excerpt || ''
    form.cover_image = post.cover_image || ''
    form.category_id = post.category_id
    form.tag_ids = post.tags?.map(t => t.id) || []
    form.status = post.status
  } catch (e) {
    ElMessage.error('加载文章失败')
    router.push('/admin/posts')
  }
}

async function persistPost({ redirect = true } = {}) {
  if (!form.title) {
    ElMessage.warning('请输入文章标题')
    return
  }
  try {
    if (isNew.value) {
      const res = await axios.post('/api/admin/posts', form)
      currentPostId.value = res.data.id ?? res.data._id ?? currentPostId.value
      ElMessage.success('创建成功')
      // 更新 URL 为编辑模式，使 isNew 变为 false，按钮显示"保存修改"
      if (currentPostId.value) {
        router.replace(`/admin/editor/${currentPostId.value}`)
      }
    } else {
      await axios.put(`/api/admin/posts/_id/${currentPostId.value}`, form)
      ElMessage.success('已保存')
    }
    if (redirect) router.push(returnUrl.value)
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '保存失败')
  }
}

function savePost() {
  return persistPost({ redirect: true })
}

function goBack() {
  router.push(returnUrl.value)
}

function onGlobalKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    persistPost({ redirect: false })
  }
}
</script>

<style scoped>
/* ── CSS 变量 ──────────────────────────────────────── */
.editor-page {
  --ed-bg: #ffffff;
  --ed-surface: #f8f8f8;
  --ed-border: #e2e2e2;
  --ed-text: #24292e;
  --ed-muted: #6e7781;
  --ed-accent: #0969da;
  --ed-heading: #1b1f24;
  --ed-bar: #f6f8fa;
  --ed-sel: rgba(9, 105, 218, .15);
  --f-doc: Georgia, 'Times New Roman', serif;
  --f-mono: 'JetBrains Mono', 'SFMono-Regular', 'Fira Code', Consolas, monospace;
  --f-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ── 页面布局 ──────────────────────────────────────── */
.editor-page {
  padding: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--ed-bg);
  overflow: hidden;
  color: var(--ed-text);
  font-family: var(--f-ui);
}

/* ── 顶部工具栏 ────────────────────────────────────── */
.editor-header {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 10px;
  gap: 4px;
  background: var(--ed-bar);
  border-bottom: 1px solid var(--ed-border);
  flex-shrink: 0;
  user-select: none;
}

.hd-left {
  display: flex;
  align-items: center;
  margin-right: 4px;
}

.hd-right {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.view-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 8px;
  border-right: 1px solid var(--ed-border);
  flex-shrink: 0;
}

/* ── 通用按钮 ──────────────────────────────────────── */
.tb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 8px;
  background: none;
  border: 1px solid transparent;
  border-radius: 5px;
  cursor: pointer;
  font: 13px var(--f-ui);
  color: var(--ed-muted);
  white-space: nowrap;
  transition: background .1s, color .1s;
  line-height: 1;
  flex-shrink: 0;
}

.tb:hover { background: var(--ed-border); color: var(--ed-text); }
.tb.on    { background: var(--ed-accent); color: #fff; }

.fmt-bold   { font-weight: 700; }
.fmt-italic { font-style: italic; }
.fmt-strike { text-decoration: line-through; }

.save-btn {
  background: var(--ed-accent);
  color: #fff;
  padding: 0 16px;
  font-weight: 500;
}

.save-btn:hover { background: #0550ae; color: #fff; }

/* ── 元数据配置栏 ──────────────────────────────────── */
.top-bar {
  padding: 8px 16px 6px;
  background: var(--ed-bg);
  border-bottom: 1px solid var(--ed-border);
  flex-shrink: 0;
}

.meta-row { margin-bottom: 6px; }
.meta-row.meta-row-last { margin-bottom: 0; }

.meta-form { display: flex; width: 100%; }

.meta-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 12px;
  flex: 1;
  min-width: 0;
}

.meta-form :deep(.el-form-item:last-child) { margin-right: 0; }

.meta-form :deep(.el-form-item__label) {
  font-weight: 500;
  font-size: 13px;
  color: var(--ed-muted);
  padding-right: 6px;
}

.meta-form :deep(.el-form-item__content) { min-width: 0; }

.fi-title   { flex: 4 !important; }
.fi-slug    { flex: 2 !important; }
.fi-status  { flex: 1 !important; min-width: 100px !important; }
.fi-cat     { flex: 2 !important; }
.fi-tags    { flex: 3 !important; }
.fi-cover   { flex: 3 !important; }
.fi-excerpt { flex: 1 !important; }

/* ── 编辑区主体 ────────────────────────────────────── */
.editor-workspace {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.ep {
  display: none;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

/* split 模式 */
.editor-workspace[data-mode="split"] .ep-editor,
.editor-workspace[data-mode="split"] .ep-preview { display: flex; }
.editor-workspace[data-mode="split"] .ep-divider  { display: block; }

/* edit 模式 */
.editor-workspace[data-mode="edit"] .ep-editor { display: flex; }

/* preview 模式 */
.editor-workspace[data-mode="preview"] .ep-preview { display: flex; }

/* typora 模式 */
.editor-workspace[data-mode="typora"] .ep-typora { display: flex; }

/* ── 可拖拽分隔线 ──────────────────────────────────── */
.ep-divider {
  display: none;
  width: 4px;
  background: var(--ed-border);
  cursor: col-resize;
  flex-shrink: 0;
  transition: background .15s;
  position: relative;
  z-index: 5;
}

.ep-divider::after { content: ''; position: absolute; inset: 0 -6px; }
.ep-divider:hover, .ep-divider.active { background: var(--ed-accent); }

/* ── 源码编辑区 ────────────────────────────────────── */
.ep-editor { background: var(--ed-bg); border-right: 1px solid var(--ed-border); }

.source-editor {
  flex: 1;
  width: 100%;
  padding: 36px 16px;
  font: 14.5px/1.75 var(--f-mono);
  color: var(--ed-text);
  background: var(--ed-bg);
  border: none;
  outline: none;
  resize: none;
  tab-size: 4;
  caret-color: var(--ed-accent);
  overflow-y: auto;
}

.source-editor::placeholder { color: #c8c8c8; }

/* ── 预览区 ────────────────────────────────────────── */
.ep-preview { background: var(--ed-bg); overflow-y: auto; }

.preview-inner {
  padding: 36px 16px;
  font-family: var(--f-doc);
  font-size: 16px;
  line-height: 1.8;
  color: var(--ed-text);
}

.preview-title {
  font-family: var(--f-doc);
  font-size: 2em;
  font-weight: 700;
  color: var(--ed-heading);
  margin: 0 0 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--ed-border);
  line-height: 1.3;
}

.preview-meta {
  color: var(--ed-muted);
  font-family: var(--f-ui);
  font-size: 13px;
  margin-bottom: 16px;
}
.preview-meta span { margin-right: 16px; }

.preview-cover { margin-bottom: 24px; }
.preview-cover img { max-width: 100%; border-radius: 6px; display: block; }

/* ── Typora 单面板 ──────────────────────────────────── */
.ep-typora {
  background: var(--ed-bg);
  overflow-y: auto;
}

.typora-doc {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 40px 16px 80px;
  font-family: var(--f-doc);
  font-size: 16px;
  line-height: 1.8;
  min-height: 100%;
}

/* Typora 块容器 */
.ty-blk {
  position: relative;
  cursor: text;
}

/* 渲染视图 */
:deep(.ty-rendered) {
  border-radius: 4px;
  padding: 2px 4px;
  margin: -2px -4px;
  min-height: 1.6em;
  transition: background .1s;
}

:deep(.ty-rendered:hover) {
  background: rgba(9, 105, 218, .04);
  outline: 1px dashed rgba(9, 105, 218, .2);
  outline-offset: 2px;
  border-radius: 4px;
}

/* 编辑 textarea */
.ty-src {
  display: block;
  width: 100%;
  font: 14px/1.65 var(--f-mono);
  color: var(--ed-text);
  background: var(--ed-surface);
  border: 1.5px solid var(--ed-accent);
  border-radius: 6px;
  padding: 1em 1.2em;
  resize: none;
  outline: none;
  box-shadow: 0 0 0 3px var(--ed-sel);
  margin: 1em 0;
  overflow: hidden;
  min-height: 40px;
  tab-size: 4;
  font-variant-ligatures: none;
}

/* 末尾新增段落提示 */
.ty-newline {
  margin-top: 16px;
  padding: 8px 4px;
  cursor: text;
  color: #ccc;
  font-family: var(--f-ui);
  font-size: 14px;
  border-radius: 4px;
  transition: color .15s;
}
.ty-newline:hover { color: var(--ed-muted); }

/* ── 共享正文排版（preview & typora） ─────────────────
   使用 :deep(.article-*) 让两个面板都能继承相同样式    */
:deep(.article-h1) {
  font-size: 1.9em; font-weight: 700; color: #1b1f24;
  margin: 1.4em 0 .5em; padding-bottom: .3em;
  border-bottom: 1px solid #e2e2e2; line-height: 1.3;
}
:deep(.article-h2) {
  font-size: 1.5em; font-weight: 600; color: #1b1f24;
  margin: 1.3em 0 .45em; line-height: 1.3;
}
:deep(.article-h3) {
  font-size: 1.25em; font-weight: 600; color: #1b1f24;
  margin: 1.2em 0 .4em; line-height: 1.3;
}
:deep(.article-h4) {
  font-size: 1.1em; font-weight: 600; margin: 1.1em 0 .35em;
}
:deep(.article-h5),
:deep(.article-h6) {
  font-size: 1em; font-weight: 600; color: #6e7781; margin: 1em 0 .3em;
}
:deep(.article-p) { margin: .75em 0; }

:deep(strong),
:deep(b) {
  font-weight: 800;
}

:deep(.article-blockquote) {
  margin: 1em 0; padding: .5em 1em;
  border-left: 4px solid #0969da;
  color: #6e7781; background: #f8f8f8;
  border-radius: 0 4px 4px 0;
}
:deep(.article-blockquote .article-p) { margin: .25em 0; }

:deep(code:not(pre code)) {
  font-family: var(--f-mono, Consolas, monospace);
  font-size: .875em; background: #f6f8fa;
  padding: .15em .4em; border-radius: 3px;
  border: 1px solid #e2e2e2; color: #0550ae;
}
:deep(pre) {
  margin: 1em 0; border-radius: 8px;
  overflow: hidden; background: #1e1e2e !important;
}
:deep(pre code) {
  background: transparent !important; border: none !important;
  padding: 1em 1.2em !important; display: block;
  font-family: var(--f-mono, Consolas, monospace);
  font-size: .875em; line-height: 1.65;
  overflow-x: auto; color: #cdd6f4;
  font-variant-ligatures: none;
}

:deep(.article-list) { margin: .75em 0; padding-left: 1.8em; }
:deep(.article-list-item) { margin: .3em 0; line-height: 1.8; }

:deep(.article-link) { color: #0969da; text-decoration: none; }
:deep(.article-link:hover) { text-decoration: underline; }

:deep(.article-image) {
  max-width: 100%; border-radius: 4px;
  display: block; margin: .5em auto;
}

:deep(hr) { border: none; border-top: 2px solid #e2e2e2; margin: 2em 0; }

:deep(table) {
  border-collapse: collapse; width: 100%;
  margin: 1em 0; font-size: .93em;
  display: block; overflow-x: auto;
}
:deep(th) {
  background: #f8f8f8; font-weight: 600;
  text-align: left; padding: 8px 14px; border: 1px solid #e2e2e2;
}
:deep(td) { padding: 7px 14px; border: 1px solid #e2e2e2; }
:deep(tr:nth-child(even) td) { background: #f8f8f8; }

:deep(mjx-container) { overflow-x: auto; max-width: 100%; }
:deep(mjx-container[display="true"]) { margin: .8em 0 !important; overflow-x: auto; }
</style>
