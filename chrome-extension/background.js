const DEFAULT_URL = 'https://gakipaiperopero.github.io/private-pin/'

let appUrl = DEFAULT_URL

chrome.storage.sync.get('instanceUrl', (data) => {
  if (data.instanceUrl) appUrl = data.instanceUrl
})

chrome.storage.onChanged.addListener((changes) => {
  if (changes.instanceUrl) {
    appUrl = changes.instanceUrl.newValue || DEFAULT_URL
  }
})

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'pin-media',
    title: 'PIN',
    contexts: ['image', 'video'],
  })
})

function openAppWithMedia(url, type, pageUrl, tags = [], author = '', title = '') {
  const tagParam = tags.length ? '&tags=' + encodeURIComponent(tags.join(',')) : ''
  const authorParam = author ? '&author=' + encodeURIComponent(author) : ''
  const titleParam = title ? '&title=' + encodeURIComponent(title) : ''
  chrome.tabs.create({ url: `${appUrl}?import=${encodeURIComponent(url)}&type=${type}&pageUrl=${encodeURIComponent(pageUrl)}${tagParam}${authorParam}${titleParam}` })
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const url = info.srcUrl
  if (!url) return
  const ext = url.split('.').pop().toLowerCase()
  const type = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext) ? 'video' : 'image'
  chrome.tabs.sendMessage(tab.id, { action: 'getTags' }).then((response) => {
    const tags = (response && response.tags) || []
    const author = (response && response.author) || ''
    const title = (response && response.title) || ''
    console.log('[Private Pin] Context menu:', { tags, author, title })
    openAppWithMedia(url, type, tab.url, tags, author, title)
  }).catch(() => {
    openAppWithMedia(url, type, tab.url, [])
  })
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'pinMedia') {
    console.log('[Private Pin] Overlay:', { tags: msg.tags, author: msg.author, title: msg.title })
    openAppWithMedia(msg.url, msg.type, msg.pageUrl, msg.tags, msg.author, msg.title)
  }
})
