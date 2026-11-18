// 博客文章的复制与导出（Markdown / HTML / PDF）
// 说明：PDF 不依赖 html2canvas/jsPDF 等第三方库（项目曾因 CDN 不可达出问题），
// 改为生成独立 HTML 文档写入隐藏 iframe 后调用浏览器打印，由用户"另存为 PDF"。

// 导出 HTML / 打印 PDF 共用的文章样式（同时兼容后端渲染的 .article-* class 与原生标签）
const ARTICLE_CSS = `
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 40px 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
  font-size: 16px;
  line-height: 1.8;
  color: #303133;
  background: #fff;
}
.article { max-width: 800px; margin: 0 auto; }
.article-title { font-size: 32px; line-height: 1.4; margin: 0 0 8px; }
.article-meta { color: #909399; font-size: 14px; margin-bottom: 24px; }
.article-meta .divider { margin: 0 8px; }
a { color: #409eff; text-decoration: none; }
img { max-width: 100%; height: auto; }
svg { max-width: 100%; }
strong, b { font-weight: 700; }

h1, .article-h1 { margin: 40px 0 20px; font-size: 32px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
h2, .article-h2 { margin: 35px 0 18px; font-size: 26px; }
h3, .article-h3 { margin: 30px 0 15px; font-size: 22px; }
h4, .article-h4 { margin: 25px 0 12px; font-size: 18px; }
h5, .article-h5, h6, .article-h6 { margin: 20px 0 10px; font-size: 16px; }

p, .article-p { margin: 15px 0; }
hr, .article-hr { margin: 20px 0; border: none; border-top: 1px solid #e0e0e0; }

ul, ol, .article-list { margin: 16px 0; padding-left: 24px; }
li, .article-list-item { margin: 8px 0; line-height: 1.8; }

blockquote, .article-blockquote {
  border-left: 4px solid #409eff;
  margin: 15px 0;
  padding: 2px 0 2px 15px;
  color: #666;
}
blockquote p, .article-blockquote p, .article-blockquote .article-p { margin: 0; }

:not(pre) > code {
  color: #2672c5;
  background: #f2f4f7;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}

pre, .code-block {
  background: #1d1f21;
  border-radius: 5px;
  padding: 15px;
  overflow-x: auto;
  margin: 15px 0;
}
pre code, .code-block code {
  background: none;
  padding: 0;
  color: #ccc;
  font-family: 'JetBrains Mono', Monaco, Menlo, Consolas, monospace;
  font-size: 14px;
  line-height: 1.6;
}

table, .article-table {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
  font-size: 14px;
  overflow: hidden;
  border-radius: 6px;
  box-shadow: 0 0 0 1px #e5e9f2;
}
th, td, .article-th, .article-td {
  padding: 12px 16px;
  border: 1px solid #e5e9f2;
  text-align: left;
  line-height: 1.8;
}
th, .article-th { font-weight: 600; color: #2c3e50; background: #e8eef5 !important; }
tbody tr:nth-child(even), .article-tr:nth-child(even) { background: #fafbfc; }

figure, .article-figure { text-align: center; margin: 20px 0; }
figcaption, .article-figcaption { font-size: 13px; color: #666; margin-top: 8px; text-align: center; }

@media print {
  body { padding: 0; }
  .article { max-width: none; }
  h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
  pre, .code-block, table, .article-table, blockquote { page-break-inside: avoid; }
  a { color: #303133; }
}
`

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// 文件名安全化，去掉路径分隔符与非法字符
function sanitizeFilename(name) {
  return (name || 'untitled').replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 80) || 'untitled'
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('zh-CN')
}

// 复制文本到剪贴板，clipboard API 不可用时回退到 textarea + execCommand
export function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  }
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy') ? resolve() : reject(new Error('execCommand copy failed'))
    } catch (e) {
      reject(e)
    } finally {
      textarea.remove()
    }
  })
}

// 触发浏览器下载
export function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// 生成自包含的文章 HTML 文档（导出 .html 与打印 PDF 共用）
export function buildArticleDocument(post) {
  const title = escapeHtml(post.title || '未命名文章')
  const metaParts = [formatDate(post.created_at)]
  if (post.category?.name) metaParts.push(escapeHtml(post.category.name))
  if (post.tags?.length) metaParts.push(post.tags.map(t => escapeHtml(t.name)).join(' / '))
  const meta = metaParts.join('<span class="divider">·</span>')

  // 站内相对路径的资源补全为绝对地址，保证导出文件/打印页图片可加载
  const content = (post.html_content || '').replace(
    /(src|href)="\/(?!\/)((?:[^"]*))"/g,
    (m, attr, path) => `${attr}="${window.location.origin}/${path}"`
  )

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>${ARTICLE_CSS}</style>
</head>
<body>
<article class="article">
<header class="article-header">
<h1 class="article-title">${title}</h1>
<div class="article-meta">${meta}</div>
</header>
<div class="article-content">
${content}
</div>
</article>
</body>
</html>`
}

// 导出为 Markdown 文件（加 BOM，Windows 记事本能正确识别 UTF-8）
export function exportPostAsMarkdown(post) {
  const filename = `${sanitizeFilename(post.title)}.md`
  downloadFile(filename, '\uFEFF' + (post.content || ''), 'text/markdown;charset=utf-8')
}

// 导出为独立的 HTML 文件
export function exportPostAsHtml(post) {
  const filename = `${sanitizeFilename(post.title)}.html`
  downloadFile(filename, buildArticleDocument(post), 'text/html;charset=utf-8')
}

// 打印文章（在打印对话框中选择"另存为 PDF"即可导出 PDF）
export function printPost(post) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0'
  })
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  const doc = win.document
  doc.open()
  doc.write(buildArticleDocument(post))
  doc.close()

  const cleanup = () => setTimeout(() => iframe.remove(), 1000)
  const doPrint = () => {
    win.focus()
    win.print()
    cleanup()
  }

  // 等待文档内图片加载完成，避免打印/导出 PDF 时图片缺失
  const images = Array.from(doc.images || [])
  if (images.length === 0) {
    doPrint()
    return
  }
  Promise.all(
    images.map(img =>
      img.complete
        ? Promise.resolve()
        : new Promise(resolve => {
            img.onload = resolve
            img.onerror = resolve
          })
    )
  ).then(doPrint)
}
