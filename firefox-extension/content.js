const DEFAULT_URL = 'https://gakipaiperopero.github.io/private-pin/'

let appUrl = DEFAULT_URL
let hoverEnabled = true

chrome.storage.sync.get(['instanceUrl', 'hoverEnabled'], (data) => {
  if (data.instanceUrl) appUrl = data.instanceUrl
  if (data.hoverEnabled !== undefined) hoverEnabled = data.hoverEnabled
})

chrome.storage.onChanged.addListener((changes) => {
  if (changes.instanceUrl) {
    appUrl = changes.instanceUrl.newValue || DEFAULT_URL
  }
  if (changes.hoverEnabled) {
    hoverEnabled = changes.hoverEnabled.newValue !== false
  }
})

let overlay = null
let currentTarget = null

function getMediaUrl(el) {
  if (el.tagName === 'IMG') return el.src || el.currentSrc || ''
  if (el.tagName === 'VIDEO') return el.src || el.currentSrc || ''
  return ''
}

function getMediaType(url) {
  const ext = url.split('.').pop().toLowerCase()
  if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) return 'video'
  return 'image'
}

function extractPageMeta() {
  const host = location.hostname.replace(/^www\./, '')
  const meta = { tags: [], author: '', title: document.title }
  if (host === 'pixiv.net' || host.endsWith('.pixiv.net')) {
    const links = document.querySelectorAll('a.gtm-new-work-tag-event-click, footer a[href*="/tags/"]')
    meta.tags = Array.from(links).map((a) => a.textContent.trim()).filter(Boolean)
    const authorLinks = document.querySelectorAll('a[href*="/users/"] > div:not([size])')
    for (const d of authorLinks) {
      const text = d.textContent.trim()
      if (text) { meta.author = text; break }
    }
  } else if (host.includes('danbooru')) {
    const tagLinks = document.querySelectorAll('#tag-list .search-tag')
    meta.tags = Array.from(tagLinks).map((a) => a.textContent.trim()).filter(Boolean)
    const artistLi = document.querySelector('ul.artist-tag-list li[data-tag-name]')
    if (artistLi) {
      meta.author = artistLi.getAttribute('data-tag-name').replace(/_/g, ' ')
    }
  } else if (host.includes('safebooru')) {
    const tagLinks = document.querySelectorAll('#tag-sidebar li.tag a[href*="tags="]')
    meta.tags = Array.from(tagLinks).map((a) => a.textContent.trim()).filter(Boolean)
    const artistEl = document.querySelector('#tag-sidebar li.tag-type-artist a[href*="tags="]')
    if (artistEl) {
      meta.author = artistEl.textContent.trim()
    }
  } else if (host.includes('gelbooru')) {
    const tagLinks = document.querySelectorAll('#tag-list li a[href*="tags="]')
    meta.tags = Array.from(tagLinks).map((a) => a.textContent.trim()).filter(Boolean)
    const artistEl = document.querySelector('#tag-list li.tag-type-artist a[href*="tags="]')
    if (artistEl) {
      meta.author = artistEl.textContent.trim()
    }
  }
  return meta
}

function createOverlay() {
  const el = document.createElement('div')
  el.id = 'pp-pin-overlay-global'
  el.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16">
    <path d="M12 2C8 2 5 5 5 9c0 4 7 13 7 13s7-9 7-13c0-4-3-7-7-7z" fill="white" stroke="white" stroke-width="1"/>
    <circle cx="12" cy="9" r="2.5" fill="#E60023" stroke="none"/>
  </svg>`
  el.title = 'Pin to Private Pin'
  el.addEventListener('click', async (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (currentTarget) {
      const url = getMediaUrl(currentTarget)
      if (url) {
        const type = getMediaType(url)
        const pageUrl = window.location.href
        const { tags, author, title } = extractPageMeta()
        console.log('[Private Pin] Extracted:', { tags, author, title })
        chrome.runtime.sendMessage({ action: 'pinMedia', url, type, pageUrl, tags, author, title })
      }
    }
    hideOverlay()
  })
  return el
}

function positionOverlay(el) {
  if (!overlay) return
  const rect = el.getBoundingClientRect()
  const scrollX = window.scrollX || window.pageXOffset
  const scrollY = window.scrollY || window.pageYOffset
  overlay.style.left = (rect.right - 34 + scrollX) + 'px'
  overlay.style.top = (rect.top + 6 + scrollY) + 'px'
}

function showOverlay(el) {
  hideOverlay()
  const url = getMediaUrl(el)
  if (!url || url.startsWith('data:')) return
  currentTarget = el
  if (!overlay) overlay = createOverlay()
  document.body.appendChild(overlay)
  positionOverlay(el)
}

function hideOverlay() {
  if (overlay && overlay.parentNode) {
    overlay.parentNode.removeChild(overlay)
  }
  currentTarget = null
}

function onScroll() {
  if (currentTarget) positionOverlay(currentTarget)
  else hideOverlay()
}

function findMediaEl(el) {
  if (el.tagName === 'IMG' || el.tagName === 'VIDEO') return el
  const media = el.querySelector('img, video')
  if (media) return media
  return null
}

function isLargeEnough(el) {
  if (el.tagName !== 'IMG') return true
  return el.naturalWidth > 100 && el.naturalHeight > 100
}

document.addEventListener('mouseover', (e) => {
  if (!hoverEnabled) return
  const el = findMediaEl(e.target)
  if (el && isLargeEnough(el)) showOverlay(el)
})

document.addEventListener('mousemove', (e) => {
  if (currentTarget) positionOverlay(currentTarget)
})

document.addEventListener('mouseout', (e) => {
  if (!currentTarget) return
  const el = findMediaEl(e.target)
  if (el !== currentTarget) return
  const related = e.relatedTarget
  if (related && (related.id === 'pp-pin-overlay-global')) return
  if (related && (related === currentTarget || currentTarget.contains(related))) return
  hideOverlay()
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'getTags') {
    sendResponse(extractPageMeta())
  }
})

window.addEventListener('scroll', onScroll, true)
