// MathJax 3 渲染辅助。
//
// index.html 里的 tex-svg.js 是 async 加载的：在它执行完成之前，
// window.MathJax 上只有 index.html 里写入的配置对象，`typesetPromise`
// 尚不存在。直接调用会抛 TypeError（并把调用方后续逻辑一并跳过），
// 所以这里统一等待就绪（带超时）再排版，失败时安静降级。
const READY_TIMEOUT = 10000
const POLL_INTERVAL = 100

function isReady() {
  return typeof window.MathJax?.typesetPromise === 'function'
}

/**
 * 等待 MathJax 就绪并对目标元素排版。
 * @param {ArrayLike<Element>|null} elements 要排版的目标元素；为空时排版全文档
 * @returns {Promise<boolean>} 是否成功排版
 */
export async function typesetMathJax(elements = null) {
  if (!isReady()) {
    const ready = await waitForReady()
    if (!ready) return false
  }
  try {
    if (elements && elements.length) {
      await window.MathJax.typesetPromise(Array.from(elements))
    } else {
      await window.MathJax.typesetPromise()
    }
    return true
  } catch (e) {
    console.warn('MathJax typeset failed:', e)
    return false
  }
}

function waitForReady() {
  return new Promise((resolve) => {
    const start = Date.now()
    const timer = setInterval(() => {
      if (isReady()) {
        clearInterval(timer)
        resolve(true)
      } else if (Date.now() - start > READY_TIMEOUT) {
        clearInterval(timer)
        console.warn(`MathJax not ready within ${READY_TIMEOUT}ms, skip typeset`)
        resolve(false)
      }
    }, POLL_INTERVAL)
  })
}
