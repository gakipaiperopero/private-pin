const DEFAULT_URL = 'https://gakipaiperopero.github.io/private-pin/'

const instanceUrl = document.getElementById('instanceUrl')
const status = document.getElementById('status')
const hoverToggle = document.getElementById('hoverToggle')

let savedUrl = DEFAULT_URL

chrome.storage.sync.get(['instanceUrl', 'hoverEnabled'], (data) => {
  savedUrl = data.instanceUrl || DEFAULT_URL
  instanceUrl.value = savedUrl
  hoverToggle.checked = data.hoverEnabled !== false
})

instanceUrl.addEventListener('input', () => {
  const val = instanceUrl.value.trim() || DEFAULT_URL
  chrome.storage.sync.set({ instanceUrl: val }, () => {
    savedUrl = val
  })
})

hoverToggle.addEventListener('change', () => {
  chrome.storage.sync.set({ hoverEnabled: hoverToggle.checked })
})

document.getElementById('openBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: savedUrl })
})

document.getElementById('exportBtn').addEventListener('click', () => {
  const url = savedUrl.replace(/\/?$/, '') + '/?action=export'
  chrome.tabs.create({ url })
})

document.getElementById('importBtn').addEventListener('click', () => {
  const url = savedUrl.replace(/\/?$/, '') + '/?action=import'
  chrome.tabs.create({ url })
})
