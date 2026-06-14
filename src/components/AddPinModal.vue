<script setup>
import { ref, watch, onMounted } from 'vue'
import { addPin, updatePin, getAllBoards, addBoard } from '../utils/db.js'

const props = defineProps({
  initialFiles: { type: Array, default: () => [] },
  currentBoardId: { type: [Number, null], default: null },
  editPin: { type: Object, default: null },
  externalUrl: { type: String, default: '' },
  externalSourceUrl: { type: String, default: '' },
  externalTags: { type: Array, default: () => [] },
  externalAuthor: { type: String, default: '' },
  externalTitle: { type: String, default: '' },
})

const emit = defineEmits(['close', 'saved'])

const mode = ref('upload')
const title = ref('')
const author = ref('')
const tags = ref([])
const tagInput = ref('')
const mediaType = ref('image')
const imageData = ref(null)
const imagePreview = ref(null)
const saving = ref(false)
const error = ref('')
const batchItems = ref([])
const urlInput = ref('')
const loadingUrl = ref(false)
const sourceUrl = ref('')
const boards = ref([])
const selectedBoardId = ref(null)
const showCreateBoard = ref(false)
const newBoardName = ref('')
const newBoardDesc = ref('')
let urlTimer = null

const isBatch = () => batchItems.value.length > 1 && !props.editPin

onMounted(async () => {
  boards.value = await getAllBoards()
  if (props.editPin) {
    title.value = props.editPin.title || ''
    author.value = props.editPin.author || ''
    tags.value = [...(props.editPin.tags || [])]
    sourceUrl.value = props.editPin.sourceUrl || ''
    mediaType.value = props.editPin.type || 'image'
    imageData.value = props.editPin.image
    imagePreview.value = getMediaUrl(props.editPin.image)
    mode.value = props.editPin.image instanceof Blob || props.editPin.image?.startsWith('data:') ? 'upload' : 'url'
    selectedBoardId.value = props.editPin.boardId
    if (typeof props.editPin.image === 'string' && !props.editPin.image.startsWith('data:')) {
      urlInput.value = props.editPin.image
    }
  } else if (props.currentBoardId && boards.value.some((b) => b.id === props.currentBoardId)) {
    selectedBoardId.value = props.currentBoardId
  } else if (boards.value.length > 0) {
    selectedBoardId.value = boards.value[0].id
  }

  if (props.externalTags.length) {
    tags.value = props.externalTags
  }
  if (props.externalAuthor) {
    author.value = props.externalAuthor
  }
  if (props.externalTitle) {
    title.value = props.externalTitle
  }

  if (props.externalUrl) {
    if (props.externalUrl.startsWith('data:')) {
      mode.value = 'upload'
      urlInput.value = ''
      if (props.externalSourceUrl) {
        sourceUrl.value = props.externalSourceUrl
      }
      loadFromUrl()
    } else {
      mode.value = 'url'
      urlInput.value = props.externalUrl
      if (props.externalSourceUrl) {
        sourceUrl.value = props.externalSourceUrl
      }
      loadFromUrl()
    }
  }
})

import { getMediaUrl, revokeMedia } from '../utils/media.js'

function processFile(file) {
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    error.value = 'Please select an image or video file'
    return false
  }
  error.value = ''
  const type = file.type.startsWith('video/') ? 'video' : 'image'
  const name = file.name.replace(/\.[^.]+$/, '')
  batchItems.value.push({ data: file, type, preview: getMediaUrl(file), title: name, tags: [], tagInput: '' })
  if (batchItems.value.length === 1) {
    title.value = name
  }
  if (!isBatch()) {
    mediaType.value = type
    imageData.value = file
    imagePreview.value = getMediaUrl(file)
  }
  return true
}

watch(
  () => props.initialFiles,
  (files) => {
    if (files.length > 0) {
      for (const f of files) {
        processFile(f)
      }
    }
  },
  { immediate: true }
)

watch(urlInput, (val) => {
  if (urlTimer) clearTimeout(urlTimer)
  if (!val.trim() || loadingUrl.value) return
  urlTimer = setTimeout(() => {
    if (val.trim() !== urlInput.value.trim()) return
    loadFromUrl()
  }, 600)
})

function onFileSelect(e) {
  for (const file of e.target.files || []) {
    processFile(file)
  }
  e.target.value = ''
}

function onDropFile(e) {
  e.preventDefault()
  for (const file of e.dataTransfer?.files || []) {
    processFile(file)
  }
}

function removeBatchItem(i) {
  batchItems.value.splice(i, 1)
  if (batchItems.value.length === 1) {
    const item = batchItems.value[0]
    mediaType.value = item.type
    imageData.value = item.data
    imagePreview.value = getMediaUrl(item.data)
    title.value = item.title
    tags.value = [...item.tags]
  } else if (batchItems.value.length === 0) {
    imageData.value = null
    imagePreview.value = null
  }
}

const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
]

async function fetchViaProxy(url) {
  for (const proxy of CORS_PROXIES) {
    try {
      const resp = await fetch(proxy + encodeURIComponent(url))
      if (resp.ok) return resp
    } catch {}
  }
  throw new Error('All CORS proxies failed')
}

async function loadFromUrl() {
  const url = urlInput.value.trim()
  if (!url) {
    error.value = 'Please enter an image URL'
    return
  }

  loadingUrl.value = true
  error.value = ''
  if (!props.externalSourceUrl) {
    sourceUrl.value = url
  }

  if (url.startsWith('data:')) {
    try {
      const resp = await fetch(url)
  let blob = await resp.blob()
      mediaType.value = blob.type.startsWith('video/') ? 'video' : 'image'
      imageData.value = blob
      imagePreview.value = getMediaUrl(blob)
    } catch {
      error.value = 'Failed to process image data'
    }
    loadingUrl.value = false
    return
  }

  let resp
  try {
    resp = await fetch(url)
  } catch {
    try {
      resp = await fetchViaProxy(url)
    } catch {
      const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv)([#?]|$)/i.test(url)
      error.value = isVideo
        ? 'Videos cannot bypass CORS — try downloading and uploading manually'
        : 'Could not load from URL — all CORS proxies exhausted. Try right-click → Copy Image, then paste here'
      loadingUrl.value = false
      return
    }
  }

  if (!resp.ok) {
    error.value = 'Failed to fetch from URL'
    loadingUrl.value = false
    return
  }
  let blob = await resp.blob()
  const isImageUrl = /\.(jpe?g|png|gif|webp|bmp|svg|ico|avif)([#?]|$)/i.test(url)
  const isVideoUrl = /\.(mp4|webm|ogg|mov|avi|mkv)([#?]|$)/i.test(url)

  if (!blob.type.startsWith('image/') && !blob.type.startsWith('video/')) {
    if (isImageUrl) {
      blob = new Blob([blob], { type: 'image/png' })
    } else if (isVideoUrl) {
      blob = new Blob([blob], { type: 'video/mp4' })
    } else {
      error.value = 'Right-click the image → Copy Image, then paste here (Ctrl+V)'
      loadingUrl.value = false
      return
    }
  }

  mediaType.value = isVideoUrl ? 'video' : 'image'

  if (mediaType.value === 'video') {
    imageData.value = url
    imagePreview.value = url
    loadingUrl.value = false
  } else {
    imageData.value = blob
    imagePreview.value = getMediaUrl(blob)
    loadingUrl.value = false
  }
}

async function getDimensions(data, type) {
  if (props.editPin && data === props.editPin.image) {
    return { width: props.editPin.width || 300, height: props.editPin.height || 400 }
  }
  const src = data instanceof Blob ? getMediaUrl(data) : data
  if (type === 'video') {
    const video = await new Promise((resolve, reject) => {
      const v = document.createElement('video')
      v.onloadedmetadata = () => resolve(v)
      v.onerror = () => reject(new Error('Video failed to load'))
      v.preload = 'metadata'
      v.src = src
    })
    return { width: video.videoWidth || 640, height: video.videoHeight || 360 }
  }
  const img = await new Promise((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('Image failed to load'))
    i.src = src
  })
  return { width: img.naturalWidth || 300, height: img.naturalHeight || 400 }
}

async function handleSave() {
  const items = isBatch() ? batchItems.value : [{ data: imageData.value, type: mediaType.value, title: title.value }]
  if (items.length === 0 || (items.length === 1 && !items[0].data)) {
    error.value = mode.value === 'upload' ? 'Please select an image' : 'Please load an image URL'
    return
  }
  if (items.some((item) => !item.title?.trim())) {
    error.value = 'Please enter a title for each pin'
    return
  }
  if (!selectedBoardId.value) {
    error.value = 'Please select a board'
    return
  }

  saving.value = true
  error.value = ''

  try {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const pinTitle = item.title.trim()
      const { width, height } = await getDimensions(item.data, item.type)
      const pinData = {
        title: pinTitle,
        author: author.value.trim() || 'Anonymous',
        tags: [...new Set([...(item.tags || tags.value), item.type])],
        sourceUrl: i === 0 ? (sourceUrl.value || '') : '',
        type: item.type,
        image: item.data,
        width,
        height,
        boardId: selectedBoardId.value,
      }
      if (props.editPin) {
        await updatePin({ ...pinData, id: props.editPin.id })
      } else {
        await addPin(pinData)
      }
    }
    emit('saved')
  } catch (err) {
    console.error('Save pin error:', err)
    error.value = err.message || 'Failed to save pin'
    saving.value = false
  }
}

function addTag() {
  const t = tagInput.value.trim().replace(/,/g, '').trim()
  if (t && !tags.value.includes(t)) {
    tags.value.push(t)
  }
  tagInput.value = ''
}

function removeTag(i) {
  tags.value.splice(i, 1)
}

function onTagKeydown(e) {
  if (e.key === ',' || e.key === 'Enter') {
    e.preventDefault()
    if (e.key === 'Enter' && !tagInput.value.trim()) {
      handleSave()
      return
    }
    addTag()
  }
  if (e.key === 'Backspace' && tagInput.value === '' && tags.value.length > 0) {
    tags.value.pop()
  }
}

async function createBoard() {
  const name = newBoardName.value.trim()
  if (!name) return
  try {
    const id = await addBoard({ name, description: newBoardDesc.value.trim() })
    boards.value = await getAllBoards()
    selectedBoardId.value = id
    showCreateBoard.value = false
    newBoardName.value = ''
    newBoardDesc.value = ''
  } catch (err) {
    error.value = 'Failed to create board: ' + err.message
  }
}

function switchMode(m) {
  mode.value = m
  error.value = ''
  if (m === 'upload') sourceUrl.value = ''
}

function addBatchTag(item) {
  const t = item.tagInput.trim().replace(/,/g, '').trim()
  if (t && !item.tags.includes(t)) {
    item.tags.push(t)
  }
  item.tagInput = ''
}

function removeBatchTag(item, i) {
  item.tags.splice(i, 1)
}

function onBatchTagKeydown(item, e) {
  if (e.key === ',' || e.key === 'Enter') {
    e.preventDefault()
    if (e.key === 'Enter' && !item.tagInput.trim()) {
      handleSave()
      return
    }
    addBatchTag(item)
  }
  if (e.key === 'Backspace' && item.tagInput === '' && item.tags.length > 0) {
    item.tags.pop()
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    @click.self="$emit('close')"
  >
    <div class="bg-white dark:bg-pin-surface rounded-3xl w-full max-w-lg mx-4 shadow-2xl flex flex-col max-h-[90vh]">
      <div class="flex items-center justify-between p-4 border-b border-gray-100 dark:border-pin-border shrink-0">
        <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">
          {{ editPin ? 'Edit Pin' : isBatch() ? 'Batch Upload' : 'Create Pin' }}
          <template v-if="isBatch()"> ({{ batchItems.length }} files)</template>
        </h2>
        <button
          class="w-8 h-8 rounded-full bg-pin-gray dark:bg-pin-surface flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#303030] transition cursor-pointer"
          @click="$emit('close')"
        >
          <svg class="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form class="flex flex-col min-h-0" @submit.prevent="handleSave">
        <div class="p-6 space-y-4 overflow-y-auto">
        <template v-if="!editPin">
          <div class="flex rounded-xl bg-pin-gray dark:bg-pin-surface p-1">
            <button
              class="flex-1 py-2 rounded-lg text-sm font-medium transition cursor-pointer"
              :class="mode === 'upload' ? 'bg-white dark:bg-[#303030] shadow-sm text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'"
              @click="switchMode('upload')"
            >
              Upload
            </button>
            <button
              class="flex-1 py-2 rounded-lg text-sm font-medium transition cursor-pointer"
              :class="mode === 'url' ? 'bg-white dark:bg-[#303030] shadow-sm text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'"
              @click="switchMode('url')"
            >
              From URL
            </button>
          </div>
        </template>

        <template v-if="mode === 'upload'">
          <label
            class="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-pin-border rounded-2xl p-8 cursor-pointer hover:border-pin-red transition"
            :class="{ 'border-pin-red': imagePreview || batchItems.length > 0 }"
            @dragover.prevent
            @drop="onDropFile"
          >
            <template v-if="!imagePreview && batchItems.length === 0">
              <svg class="w-10 h-10 text-gray-400 dark:text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span class="text-sm text-gray-500 dark:text-gray-400">Click or drag images/videos here</span>
            </template>
            <template v-else-if="!isBatch()">
              <img v-if="mediaType === 'image'" :src="imagePreview" class="max-h-48 rounded-xl object-contain" alt="preview" />
              <video v-else :src="imagePreview" class="max-h-48 rounded-xl object-contain" muted controls />
            </template>
            <input type="file" accept="image/*,video/*" class="hidden" multiple @change="onFileSelect" />
          </label>

          <div v-if="isBatch()" class="space-y-3 max-h-80 overflow-y-auto">
            <div
              v-for="(item, i) in batchItems"
              :key="i"
              class="p-3 rounded-xl bg-pin-gray dark:bg-pin-surface space-y-2"
            >
              <div class="flex items-center gap-3">
                <div class="relative w-12 h-12 rounded-lg overflow-hidden bg-pin-gray dark:bg-pin-surface flex-shrink-0">
                  <img v-if="item.type === 'image'" :src="item.preview" class="w-full h-full object-cover" alt="" />
                  <video v-else :src="item.preview" class="w-full h-full object-cover" muted playsinline />
                </div>
                <input
                  v-model="item.title"
                  type="text"
                  placeholder="Pin title"
                  class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 dark:border-pin-border bg-white dark:bg-pin-surface outline-none focus:border-gray-400 dark:focus:border-gray-500 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition"
                />
                <button
                  class="w-7 h-7 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center hover:bg-black/20 dark:hover:bg-white/20 transition cursor-pointer flex-shrink-0"
                  type="button"
                  @click="removeBatchItem(i)"
                >
                  <svg class="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div v-if="item.tags.length > 0" class="flex gap-1.5 flex-wrap">
                <span
                  v-for="(tag, j) in item.tags"
                  :key="j"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-pin-red/10 text-pin-red dark:bg-pin-red/20 cursor-pointer hover:bg-pin-red/20 dark:hover:bg-pin-red/30 transition"
                  @click="removeBatchTag(item, j)"
                >
                  {{ tag }}
                  <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              </div>
              <input
                v-model="item.tagInput"
                type="text"
                placeholder="Tags (comma or Enter to add)"
                class="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-pin-border bg-white dark:bg-pin-surface outline-none focus:border-gray-400 dark:focus:border-gray-500 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition"
                @keydown="onBatchTagKeydown(item, $event)"
              />
            </div>
          </div>
        </template>

        <template v-else>
          <div class="flex gap-2">
            <input
              v-model="urlInput"
              type="text"
              placeholder="Paste image URL..."
              class="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-pin-border bg-white dark:bg-pin-surface outline-none focus:border-gray-400 dark:focus:border-gray-500 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition"
              @keyup.enter="loadFromUrl"
            />
            <button
              class="px-5 py-3 rounded-xl bg-pin-dark text-white text-sm font-semibold transition cursor-pointer disabled:opacity-50 hover:bg-gray-800"
              :disabled="loadingUrl"
              type="button"
              @click="loadFromUrl"
            >
              {{ loadingUrl ? '...' : 'Load' }}
            </button>
          </div>
          <div
            v-if="imagePreview"
            class="flex items-center justify-center rounded-2xl overflow-hidden bg-pin-gray dark:bg-pin-surface max-h-48"
          >
            <img v-if="mediaType === 'image'" :src="imagePreview" class="max-h-48 object-contain" alt="preview" />
            <video v-else :src="imagePreview" class="max-h-48 object-contain" muted controls />
          </div>
        </template>

        <div class="flex gap-2">
          <select
            v-model="selectedBoardId"
            class="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-pin-border bg-white dark:bg-pin-surface outline-none focus:border-gray-400 dark:focus:border-gray-500 text-sm text-gray-800 dark:text-gray-200 transition appearance-none cursor-pointer"
          >
            <option :value="null" disabled>Select a board</option>
            <option v-for="board in boards" :key="board.id" :value="board.id">
              {{ board.name }}
            </option>
          </select>
          <button
            class="px-4 py-3 rounded-xl border border-dashed border-gray-300 dark:border-pin-border text-sm text-gray-500 dark:text-gray-400 hover:text-pin-red hover:border-pin-red transition cursor-pointer whitespace-nowrap"
            @click="showCreateBoard = true"
            title="Create new board"
          >
            + New
          </button>
        </div>
        <div
          v-if="showCreateBoard"
          class="p-4 rounded-xl border border-gray-200 dark:border-pin-border bg-pin-gray dark:bg-pin-surface space-y-3"
        >
          <input
            v-model="newBoardName"
            type="text"
            placeholder="Board name"
            class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-pin-border bg-white dark:bg-pin-surface outline-none focus:border-gray-400 dark:focus:border-gray-500 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition"
          />
          <input
            v-model="newBoardDesc"
            type="text"
            placeholder="Description (optional)"
            class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-pin-border bg-white dark:bg-pin-surface outline-none focus:border-gray-400 dark:focus:border-gray-500 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition"
          />
          <div class="flex gap-2">
            <button
              class="flex-1 py-3 rounded-xl bg-pin-red text-white text-sm font-semibold transition cursor-pointer disabled:opacity-50 hover:bg-red-700"
              :disabled="!newBoardName.trim()"
              @click="createBoard"
            >
              Create
            </button>
            <button
              class="px-5 py-3 rounded-xl border border-gray-300 dark:border-pin-border text-sm text-gray-600 dark:text-gray-400 transition cursor-pointer hover:bg-gray-100 dark:hover:bg-[#303030]"
              @click="showCreateBoard = false; newBoardName = ''; newBoardDesc = ''"
            >
              Cancel
            </button>
          </div>
        </div>

        <input
          v-if="!isBatch()"
          v-model="title"
          type="text"
          placeholder="Add a title..."
          class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-pin-border bg-white dark:bg-pin-surface outline-none focus:border-gray-400 dark:focus:border-gray-500 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition"
        />

        <input
          v-model="author"
          type="text"
          placeholder="Your name (optional)"
          class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-pin-border bg-white dark:bg-pin-surface outline-none focus:border-gray-400 dark:focus:border-gray-500 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition"
        />

        <div v-if="!isBatch()">
          <div v-if="tags.length > 0" class="flex gap-1.5 flex-wrap mb-2">
            <span
              v-for="(tag, i) in tags"
              :key="i"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-pin-red/10 text-pin-red dark:bg-pin-red/20 cursor-pointer hover:bg-pin-red/20 dark:hover:bg-pin-red/30 transition"
              @click="removeTag(i)"
            >
              {{ tag }}
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          </div>
          <input
            v-model="tagInput"
            type="text"
            placeholder="Add tags (comma or Enter to add)"
            class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-pin-border bg-white dark:bg-pin-surface outline-none focus:border-gray-400 dark:focus:border-gray-500 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition"
            @keydown="onTagKeydown"
          />
        </div>

        </div>

        <div class="px-6 pb-6 pt-2 shrink-0 border-t border-gray-100 dark:border-pin-border">
          <p v-if="error" class="text-pin-red text-sm mb-3">{{ error }}</p>
          <button
            type="submit"
            class="w-full py-3 rounded-full text-white font-semibold text-sm transition cursor-pointer disabled:opacity-50"
            :class="saving ? 'bg-gray-400' : 'bg-pin-red hover:bg-red-700'"
            :disabled="saving || (!editPin && mode === 'upload' && batchItems.length === 0 && !imageData)"
          >
            <template v-if="saving">Saving...</template>
            <template v-else-if="editPin">Save Changes</template>
            <template v-else-if="isBatch()">Save All ({{ batchItems.length }})</template>
            <template v-else>Save</template>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
