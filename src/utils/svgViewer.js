// SVG 点击放大查看器
// 为容器内的内联 <svg> 元素添加点击弹出放大效果

let activeModal = null
let activeTrigger = null
let stylesInjected = false

function injectStyles() {
  if (stylesInjected) return
  stylesInjected = true

  const css = `
    .svg-viewer-overlay {
      position: fixed;
      inset: 0;
      background: rgba(10, 20, 40, 0.72);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.35s ease, visibility 0.35s ease;
      z-index: 9999;
      padding: 24px;
    }

    .svg-viewer-overlay.active {
      opacity: 1;
      visibility: visible;
    }

    .svg-viewer-content {
      background: #ffffff;
      border-radius: 32px;
      padding: 40px 40px 36px;
      width: fit-content;
      max-width: 90vw;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      transform: scale(0.88) translateY(20px);
      transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease;
      box-shadow: 0 40px 100px rgba(0, 0, 0, 0.25);
      text-align: center;
      overflow: hidden;
    }

    .svg-viewer-overlay.active .svg-viewer-content {
      transform: scale(1) translateY(0);
    }

    .svg-viewer-close {
      position: absolute;
      top: 16px;
      right: 20px;
      background: none;
      border: none;
      font-size: 32px;
      line-height: 1;
      color: #8a9bb5;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 12px;
      transition: all 0.2s;
      font-weight: 300;
    }

    .svg-viewer-close:hover {
      color: #1a2634;
      background: #f0f4f8;
      transform: rotate(90deg);
    }

    .svg-viewer-wrapper {
      padding: 24px 0 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 66.67vw;
      height: 66.67vh;
      max-width: calc(90vw - 80px);
      max-height: calc(90vh - 150px);
    }

    .svg-viewer-wrapper svg {
      width: 100%;
      height: 100%;
      display: block;
      filter: drop-shadow(0 8px 24px rgba(91, 124, 250, 0.20));
      animation: svg-viewer-float 3s ease-in-out infinite;
    }

    @keyframes svg-viewer-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    .svg-viewer-title {
      font-size: 24px;
      font-weight: 600;
      color: #1a2634;
      margin-top: 8px;
      margin-bottom: 6px;
    }

    .svg-viewer-desc {
      color: #5e6f8d;
      font-size: 15px;
      line-height: 1.6;
      max-width: 360px;
      margin: 0 auto 8px;
    }

    .svg-viewer-badge {
      display: inline-block;
      background: #eef3fe;
      color: #4a6cf7;
      font-size: 13px;
      font-weight: 500;
      padding: 4px 18px;
      border-radius: 40px;
      margin-top: 12px;
      letter-spacing: 0.3px;
    }

    @media (max-width: 500px) {
      .svg-viewer-content {
        padding: 28px 20px 28px;
        max-width: 95vw;
        max-height: 95vh;
      }

      .svg-viewer-wrapper {
        width: 80vw;
        height: 80vh;
        max-width: calc(95vw - 40px);
        max-height: calc(95vh - 120px);
      }

      .svg-viewer-title {
        font-size: 20px;
      }
    }
  `

  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
}

/**
 * 初始化 SVG 放大查看器
 * @param {string} containerSelector - 容器选择器，例如 '.article-content'
 */
export function initSvgViewer(containerSelector) {
  injectStyles()

  const container = document.querySelector(containerSelector)
  if (!container) return

  const svgs = container.querySelectorAll('svg:not([data-svg-viewer-init])')
  if (svgs.length === 0) return

  svgs.forEach(svg => {
    // 跳过尺寸过小的图标（宽度或高度小于 24px）
    const rect = svg.getBoundingClientRect()
    if (rect.width < 24 || rect.height < 24) return

    // 跳过位于链接或按钮内部的 SVG，避免干扰正常交互
    if (svg.closest('a, button')) return

    svg.setAttribute('data-svg-viewer-init', 'true')
    svg.style.cursor = 'zoom-in'
    svg.style.transition = 'transform 0.25s ease, box-shadow 0.25s ease'

    svg.addEventListener('mouseenter', () => {
      svg.style.transform = 'scale(1.03)'
    })
    svg.addEventListener('mouseleave', () => {
      svg.style.transform = 'scale(1)'
    })

    svg.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      openModal(svg)
    })

    // 键盘无障碍支持
    svg.setAttribute('tabindex', '0')
    svg.setAttribute('role', 'button')
    svg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openModal(svg)
      }
    })
  })
}

/**
 * 关闭当前打开的模态框
 */
export function closeSvgModal() {
  if (!activeModal) return

  const modal = activeModal
  const trigger = activeTrigger

  modal.classList.remove('active')
  document.body.style.overflow = ''

  setTimeout(() => {
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal)
    }
    activeModal = null
    activeTrigger = null
    // 焦点返回触发元素
    if (trigger && trigger.focus) {
      trigger.focus()
    }
  }, 350)
}

/**
 * 清理所有状态
 */
export function destroySvgViewer() {
  closeSvgModal()
}

function openModal(svg) {
  // 如果已有打开的模态框，立即移除并清理状态
  if (activeModal) {
    const oldModal = activeModal
    if (oldModal.parentNode) {
      oldModal.parentNode.removeChild(oldModal)
    }
    activeModal = null
    activeTrigger = null
    document.body.style.overflow = ''
  }

  activeTrigger = svg

  const overlay = document.createElement('div')
  overlay.className = 'svg-viewer-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'SVG 放大预览')

  const content = document.createElement('div')
  content.className = 'svg-viewer-content'

  const closeBtn = document.createElement('button')
  closeBtn.className = 'svg-viewer-close'
  closeBtn.setAttribute('aria-label', '关闭预览')
  closeBtn.innerHTML = '&#10005;'

  const wrapper = document.createElement('div')
  wrapper.className = 'svg-viewer-wrapper'

  const clone = cloneSvg(svg)
  wrapper.appendChild(clone)

  const title = getSvgTitle(svg)
  if (title) {
    const titleEl = document.createElement('h3')
    titleEl.className = 'svg-viewer-title'
    titleEl.textContent = title
    content.appendChild(titleEl)
  }

  const desc = document.createElement('p')
  desc.className = 'svg-viewer-desc'
  content.appendChild(desc)

  const badge = document.createElement('span')

  content.insertBefore(wrapper, content.firstChild)
  content.insertBefore(closeBtn, content.firstChild)
  overlay.appendChild(content)
  document.body.appendChild(overlay)

  activeModal = overlay

  // 禁止背景滚动
  document.body.style.overflow = 'hidden'

  // 触发重排后添加 active 类以启动动画
  requestAnimationFrame(() => {
    overlay.classList.add('active')
    closeBtn.focus()
  })

  // 事件绑定
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    closeSvgModal()
  })

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeSvgModal()
    }
  })

  document.addEventListener('keydown', handleKeydown)

  // 动画结束后清理键盘监听
  overlay.addEventListener('transitionend', (e) => {
    if (!overlay.classList.contains('active') && e.propertyName === 'opacity') {
      document.removeEventListener('keydown', handleKeydown)
    }
  })
}

function handleKeydown(e) {
  if (e.key === 'Escape' && activeModal) {
    closeSvgModal()
  }
}

/**
 * 克隆 SVG 并解决 ID 冲突问题
 */
function cloneSvg(svg) {
  const clone = svg.cloneNode(true)

  // 移除初始化标记和交互属性，避免克隆体也被识别为可点击
  clone.removeAttribute('data-svg-viewer-init')
  clone.removeAttribute('tabindex')
  clone.removeAttribute('role')
  clone.removeAttribute('aria-label')
  clone.style.cursor = 'default'
  clone.style.transition = 'none'
  clone.style.transform = 'none'

  // 重写内部 ID，防止与页面中其他 SVG 的渐变/遮罩引用冲突
  const idMap = new Map()
  const uid = 'svgv-' + Date.now() + '-'
  let index = 0

  clone.querySelectorAll('[id]').forEach(el => {
    const oldId = el.getAttribute('id')
    const newId = uid + index++
    idMap.set(oldId, newId)
    el.setAttribute('id', newId)
  })

  if (clone.id) {
    clone.id = uid + index++
  }

  // 更新所有 url(#id) 引用
  rewriteUrlRefs(clone, idMap)

  // 清除原始尺寸限制，避免页面中的 max-width/height 影响弹出框放大效果
  clone.removeAttribute('width')
  clone.removeAttribute('height')
  clone.style.width = ''
  clone.style.height = ''
  clone.style.maxWidth = ''
  clone.style.maxHeight = ''

  // 设置放大尺寸
  clone.setAttribute('width', '100%')
  clone.setAttribute('height', '100%')
  clone.style.width = '100%'
  clone.style.height = '100%'
  clone.style.display = 'block'

  return clone
}

function rewriteUrlRefs(root, idMap) {
  const walker = document.createTreeWalker(root, Node.ELEMENT_NODE)
  let node = walker.nextNode()
  while (node) {
    Array.from(node.attributes || []).forEach(attr => {
      if (typeof attr.value === 'string' && attr.value.includes('url(#')) {
        attr.value = attr.value.replace(/url\(#([^)]+)\)/g, (match, id) => {
          return idMap.has(id) ? `url(#${idMap.get(id)})` : match
        })
      }
    })
    node = walker.nextNode()
  }
}

function getSvgTitle(svg) {
  const title = svg.querySelector('title')
  if (title && title.textContent.trim()) {
    return title.textContent.trim()
  }
  const ariaLabel = svg.getAttribute('aria-label')
  if (ariaLabel) return ariaLabel
  return ''
}
