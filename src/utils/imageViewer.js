// 原生图片查看器 - 解决生产环境问题
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
let initializedSelectors = new Set() // 跟踪已初始化的容器

export function initImageViewer(containerSelector) {
  console.log('Initializing native image viewer for:', containerSelector)

  // 如果已经初始化过这个容器，跳过
  if (initializedSelectors.has(containerSelector)) {
    console.log('Container already initialized, skipping')
    return
  }

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
  initializedSelectors.add(containerSelector)

  // 为每个图片添加样式和点击事件
  images.forEach((img, index) => {
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

  // 创建查看器容器
  const viewer = document.createElement('div')
  viewer.className = 'native-image-viewer'
  viewer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: default;
  `
  document.body.appendChild(viewer)

  // 创建图片容器
  const imageContainer = document.createElement('div')
  imageContainer.className = 'viewer-image-container'
  imageContainer.style.cssText = `
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: visible;
  `
  viewer.appendChild(imageContainer)

  // 创建图片
  const image = document.createElement('img')
  image.src = activeImages[currentImageIndex].src
  image.alt = activeImages[currentImageIndex].alt || ''
  image.className = 'viewer-image'
  image.style.cssText = `
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    cursor: grab;
    transition: transform 0.2s ease;
    transform-origin: center center;
  `
  updateImageTransform()
  imageContainer.appendChild(image)

  // 创建工具栏
  const toolbar = createToolbar()
  viewer.appendChild(toolbar)

  // 点击背景关闭
  viewer.addEventListener('click', (e) => {
    if (e.target === viewer) {
      closeViewer()
    }
  })

  // 键盘事件
  document.addEventListener('keydown', handleKeydown)

  // 鼠标拖拽
  image.addEventListener('mousedown', startDrag)
  document.addEventListener('mousemove', drag)
  document.addEventListener('mouseup', endDrag)

  activeViewer = viewer

  console.log('Native image viewer opened')
}

function createToolbar() {
  const toolbar = document.createElement('div')
  toolbar.className = 'viewer-toolbar'
  toolbar.style.cssText = `
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    background: rgba(255, 255, 255, 0.9);
    padding: 10px 20px;
    border-radius: 8px;
  `

  const buttons = [
    { icon: '➡️', action: 'prev', title: '上一张' },
    { icon: '➡️', action: 'next', title: '下一张' },
    { icon: '🔍', action: 'zoomIn', title: '放大' },
    { icon: '🔎', action: 'zoomOut', title: '缩小' },
    { icon: '↪️', action: 'rotateLeft', title: '左旋' },
    { icon: '↪️', action: 'rotateRight', title: '右旋' },
    { icon: '🔄', action: 'reset', title: '重置' },
    { icon: '✖️', action: 'close', title: '关闭' }
  ]

  buttons.forEach(btn => {
    const button = document.createElement('button')
    button.textContent = btn.icon
    button.title = btn.title
    button.className = 'viewer-button'
    button.style.cssText = `
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 16px;
      min-width: 40px;
      transition: all 0.2s;
    `
    button.onclick = () => {
      handleAction(btn.action)
    }
    toolbar.appendChild(button)
  })

  return toolbar
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
  const image = document.querySelector('.viewer-image')
  if (image) {
    image.src = activeImages[currentImageIndex].src
    image.alt = activeImages[currentImageIndex].alt || ''
    currentScale = 1
    currentRotation = 0
  }
  updateImageTransform()
}

function updateImageTransform() {
  const image = document.querySelector('.viewer-image')
  if (image) {
    image.style.transform = `scale(${currentScale}) rotate(${currentRotation}deg)`
  }
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
      currentScale = Math.min(currentScale * 1.2, 10)
      updateImageTransform()
      break
    case '-':
      currentScale = Math.max(currentScale / 1.2, 0.1)
      updateImageTransform()
      break
  }
}

function closeViewer() {
  if (activeViewer) {
    document.body.removeChild(activeViewer)
    activeViewer = null
    // 不要清空 activeImages，因为图片的点击事件还需要使用它
    document.removeEventListener('keydown', handleKeydown)
    document.removeEventListener('mousedown', startDrag)
    document.removeEventListener('mousemove', drag)
    document.removeEventListener('mouseup', endDrag)
  }
}

export function destroy() {
  closeViewer()
}