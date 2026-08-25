// 原生图片查看器 - 参考 SVG 查看器效果
// 不依赖 viewerjs，直接使用原生 DOM 操作

let activeViewer = null
let activeImages = []
let currentImageIndex = 0
let currentScale = 1
let currentRotation = 0
let isDragging = false
let dragStartX = 0
let dragStartY = 0
let dragStartScale = 1
let stylesInjected = false

// 与 CSS 中 .image-viewer-content 的 padding、工具栏尺寸保持一致，用于精确计算图片可用空间
const CARD_PADDING = 20
const TOOLBAR_MARGIN_TOP = 12
const TOOLBAR_HEIGHT = 40
const CARD_MAX_RATIO = 0.98

function computeFitSize(imgWidth, imgHeight, screenWidth, screenHeight) {
  // 卡片可用空间 = 最大 98% 视口 - 两侧 padding - 工具栏高度与间距
  const cardMaxWidth = screenWidth * CARD_MAX_RATIO
  const cardMaxHeight = screenHeight * CARD_MAX_RATIO
  const availWidth = Math.max(0, cardMaxWidth - CARD_PADDING * 2)
  const availHeight = Math.max(0, cardMaxHeight - CARD_PADDING * 2 - TOOLBAR_HEIGHT - TOOLBAR_MARGIN_TOP)

  let width, height

  if (imgWidth > 0 && imgHeight > 0 && imgHeight >= imgWidth) {
    // 竖图/方图：高度优先占满可用空间，宽度按原比例
    height = availHeight
    width = Math.min(availHeight * (imgWidth / imgHeight), availWidth)
  } else {
    // 横图：宽度优先占屏幕 2/3，高度按原比例
    width = Math.min((screenWidth * 2) / 3, availWidth)
    height = Math.min(width * (imgHeight / imgWidth), availHeight)
  }

  return { width, height }
}

function injectStyles() {
  if (stylesInjected) return
  stylesInjected = true

  const css = `
    .image-viewer-overlay {
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
      padding: 8px;
    }

    .image-viewer-overlay.active {
      opacity: 1;
      visibility: visible;
    }

    .image-viewer-content {
      background: #ffffff;
      border-radius: 20px;
      max-width: 98vw;
      max-height: 98vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      transform: scale(0.92) translateY(20px);
      transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease;
      box-shadow: 0 40px 100px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      padding: 20px;
    }

    .image-viewer-overlay.active .image-viewer-content {
      transform: scale(1) translateY(0);
    }

    .image-viewer-close {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(255, 255, 255, 0.9);
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-size: 20px;
      line-height: 1;
      color: #5e6f8d;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.2s;
      z-index: 10;
    }

    .image-viewer-close:hover {
      color: #1a2634;
      background: #ffffff;
      transform: rotate(90deg);
    }

    .image-viewer-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      min-height: 0;
    }

    .image-viewer-image {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      cursor: grab;
      transition: transform 0.2s ease;
      transform-origin: center center;
      border-radius: 6px;
    }

    .image-viewer-toolbar {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      justify-content: center;
      flex-wrap: wrap;
      flex-shrink: 0;
    }

    .image-viewer-toolbar button {
      background: #f0f4f8;
      border: none;
      border-radius: 8px;
      padding: 6px 12px;
      cursor: pointer;
      font-size: 14px;
      color: #5e6f8d;
      transition: all 0.2s;
      min-width: 32px;
    }

    .image-viewer-toolbar button:hover {
      background: #e4e9f2;
      color: #1a2634;
    }

    .image-viewer-toolbar button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .image-viewer-overlay { padding: 0; }

      .image-viewer-content {
        border-radius: 0;
        max-width: 100vw;
        max-height: 100vh;
        padding: 16px;
      }

      .image-viewer-toolbar {
        gap: 6px;
        margin-top: 10px;
      }

      .image-viewer-toolbar button {
        padding: 5px 10px;
        font-size: 13px;
      }
    }
  `

  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
}

export function initImageViewer(containerSelector) {
  console.log('Initializing native image viewer for:', containerSelector)

  // 清理之前的查看器
  closeViewer()

  // 获取所有图片
  const images = document.querySelectorAll(containerSelector + ' img')
  console.log('Found images:', images.length)

  if (images.length === 0) {
    console.log('No images found')
    return
  }

  // 保存图片引用
  activeImages = Array.from(images)

  // 为每个图片添加样式和点击事件
  images.forEach((img, index) => {
    // 避免重复绑定
    if (img.dataset.imageViewerInit === 'true') return
    img.dataset.imageViewerInit = 'true'

    img.style.cursor = 'zoom-in'
    img.style.transition = 'transform 0.2s, box-shadow 0.2s'
    img.dataset.index = index

    // 鼠标悬停效果
    img.addEventListener('mouseenter', () => {
      img.style.transform = 'scale(1.02)'
      img.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
    })

    img.addEventListener('mouseleave', () => {
      img.style.transform = 'scale(1)'
      img.style.boxShadow = 'none'
    })

    // 点击事件
    img.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      console.log('Image clicked:', img.src, 'index:', index)
      openViewer(index)
    })
  })

  console.log('Native image viewer initialized')
}

function openViewer(startIndex) {
  console.log('Opening native image viewer at index:', startIndex)
  currentImageIndex = startIndex
  currentScale = 1
  currentRotation = 0

  injectStyles()

  // 创建遮罩层
  const overlay = document.createElement('div')
  overlay.className = 'image-viewer-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', '图片预览')

  // 创建内容卡片
  const content = document.createElement('div')
  content.className = 'image-viewer-content'

  // 关闭按钮
  const closeBtn = document.createElement('button')
  closeBtn.className = 'image-viewer-close'
  closeBtn.setAttribute('aria-label', '关闭预览')
  closeBtn.innerHTML = '&#10005;'

  // 图片包装器
  const wrapper = document.createElement('div')
  wrapper.className = 'image-viewer-wrapper'

  // 图片
  const image = document.createElement('img')
  image.src = activeImages[currentImageIndex].src
  image.alt = activeImages[currentImageIndex].alt || ''
  image.className = 'image-viewer-image'

  // 计算图片可用空间（扣除白色边框 padding 和底部工具栏）
  const sourceImg = activeImages[currentImageIndex]
  const imgWidth = sourceImg.naturalWidth
  const imgHeight = sourceImg.naturalHeight
  const screenWidth = window.innerWidth
  const screenHeight = window.innerHeight

  const fitSize = computeFitSize(imgWidth, imgHeight, screenWidth, screenHeight)
  wrapper.style.width = `${fitSize.width}px`
  wrapper.style.height = `${fitSize.height}px`

  updateImageTransform()
  wrapper.appendChild(image)
  content.appendChild(wrapper)
  content.appendChild(closeBtn)

  // 工具栏（位于白色下边界内，不遮挡图片）
  const toolbar = document.createElement('div')
  toolbar.className = 'image-viewer-toolbar'
  const buttons = [
    { text: '‹', action: 'prev', title: '上一张', disabled: currentImageIndex === 0 },
    { text: '⟲', action: 'rotateLeft', title: '左旋' },
    { text: '-', action: 'zoomOut', title: '缩小' },
    { text: '⌂', action: 'reset', title: '重置' },
    { text: '+', action: 'zoomIn', title: '放大' },
    { text: '⟳', action: 'rotateRight', title: '右旋' },
    { text: '›', action: 'next', title: '下一张', disabled: currentImageIndex === activeImages.length - 1 }
  ]
  buttons.forEach(btn => {
    const button = document.createElement('button')
    button.textContent = btn.text
    button.title = btn.title
    if (btn.disabled) button.disabled = true
    button.dataset.action = btn.action
    button.onclick = (e) => {
      e.stopPropagation()
      handleAction(btn.action)
    }
    toolbar.appendChild(button)
  })
  content.appendChild(toolbar)

  overlay.appendChild(content)
  document.body.appendChild(overlay)

  activeViewer = overlay

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
    closeViewer()
  })

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeViewer()
    }
  })

  document.addEventListener('keydown', handleKeydown)

  // 鼠标拖拽缩放
  image.addEventListener('mousedown', startDrag)
  document.addEventListener('mousemove', drag)
  document.addEventListener('mouseup', endDrag)

  // 动画结束后清理 DOM
  overlay.addEventListener('transitionend', (e) => {
    if (!overlay.classList.contains('active') && e.propertyName === 'opacity') {
      cleanupListeners()
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay)
      }
      activeViewer = null
    }
  })

  console.log('Native image viewer opened')
}

function handleAction(action) {
  switch (action) {
    case 'prev':
      if (currentImageIndex > 0) {
        currentImageIndex--
        updateImage()
      }
      break
    case 'next':
      if (currentImageIndex < activeImages.length - 1) {
        currentImageIndex++
        updateImage()
      }
      break
    case 'zoomIn':
      currentScale = Math.min(currentScale * 1.2, 10)
      updateImageTransform()
      break
    case 'zoomOut':
      currentScale = Math.max(currentScale / 1.2, 0.1)
      updateImageTransform()
      break
    case 'rotateLeft':
      currentRotation -= 90
      updateImageTransform()
      break
    case 'rotateRight':
      currentRotation += 90
      updateImageTransform()
      break
    case 'reset':
      currentScale = 1
      currentRotation = 0
      updateImageTransform()
      break
    case 'close':
      closeViewer()
      break
  }
}

function updateImage() {
  const wrapper = document.querySelector('.image-viewer-wrapper')
  const image = document.querySelector('.image-viewer-image')
  if (!wrapper || !image) return

  image.src = activeImages[currentImageIndex].src
  image.alt = activeImages[currentImageIndex].alt || ''
  currentScale = 1
  currentRotation = 0

  // 重新计算包装器尺寸
  const sourceImg = activeImages[currentImageIndex]
  const fitSize = computeFitSize(
    sourceImg.naturalWidth,
    sourceImg.naturalHeight,
    window.innerWidth,
    window.innerHeight
  )

  wrapper.style.width = `${fitSize.width}px`
  wrapper.style.height = `${fitSize.height}px`

  updateImageTransform()
  updateNavButtons()
}

function updateImageTransform() {
  const image = document.querySelector('.image-viewer-image')
  if (image) {
    image.style.transform = `scale(${currentScale}) rotate(${currentRotation}deg)`
  }
}

function updateNavButtons() {
  const prevBtn = document.querySelector('.image-viewer-toolbar button[data-action="prev"]')
  const nextBtn = document.querySelector('.image-viewer-toolbar button[data-action="next"]')
  if (prevBtn) prevBtn.disabled = currentImageIndex === 0
  if (nextBtn) nextBtn.disabled = currentImageIndex === activeImages.length - 1
}

function startDrag(e) {
  isDragging = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragStartScale = currentScale
}

function drag(e) {
  if (!isDragging) return

  const deltaX = e.clientX - dragStartX
  const deltaY = e.clientY - dragStartY

  if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
    const sensitivity = 0.005
    const scaleChange = 1 - (deltaY * sensitivity)
    currentScale = Math.max(0.1, Math.min(dragStartScale * scaleChange, 10))
    updateImageTransform()
  }
}

function endDrag() {
  isDragging = false
}

function handleKeydown(e) {
  if (!activeViewer) return

  switch (e.key) {
    case 'Escape':
      closeViewer()
      break
    case 'ArrowLeft':
      if (currentImageIndex > 0) {
        currentImageIndex--
        updateImage()
      }
      break
    case 'ArrowRight':
      if (currentImageIndex < activeImages.length - 1) {
        currentImageIndex++
        updateImage()
      }
      break
    case '+':
    case '=':
      currentScale = Math.min(currentScale * 1.2, 10)
      updateImageTransform()
      break
    case '-':
      currentScale = Math.max(currentScale / 1.2, 0.1)
      updateImageTransform()
      break
  }
}

function cleanupListeners() {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('mousedown', startDrag)
  document.removeEventListener('mousemove', drag)
  document.removeEventListener('mouseup', endDrag)
}

let modalClosing = false

function closeViewer() {
  if (!activeViewer) return

  const overlay = activeViewer
  modalClosing = true

  overlay.classList.remove('active')
  document.body.style.overflow = ''

  // 如果 transitionend 没有触发，直接清理
  setTimeout(() => {
    if (modalClosing && activeViewer === overlay) {
      cleanupListeners()
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay)
      }
      activeViewer = null
      modalClosing = false
    }
  }, 400)
}

export function destroy() {
  closeViewer()
}
