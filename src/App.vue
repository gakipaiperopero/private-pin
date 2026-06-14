<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getAllPins, getAllBoards, deletePin, updatePin, exportAll, importAll } from './utils/db.js'
import PinNav from './components/PinNav.vue'
import BoardList from './components/BoardList.vue'
import BoardView from './components/BoardView.vue'
import PinPreview from './components/PinPreview.vue'
import AddPinModal from './components/AddPinModal.vue'
import AddBoardModal from './components/AddBoardModal.vue'
import PinCard from './components/PinCard.vue'

const currentView = ref('boards')
const selectedBoard = ref(null)
const selectedPin = ref(null)
const showAddPin = ref(false)
const showAddBoard = ref(false)
const editingPin = ref(null)
const searchQuery = ref('')
const boardListRef = ref(null)
const boardViewRef = ref(null)
const droppedFiles = ref([])
const isDragUpload = ref(false)
const importUrl = ref('')
const importPageUrl = ref('')
const importTags = ref([])
const importAuthor = ref('')
const importTitle = ref('')
const allPins = ref([])
const allBoards = ref([])
const searchLoaded = ref(false)

const boardMap = computed(() => {
  const map = {}
  for (const b of allBoards.value) map[b.id] = b
  return map
})

const searchResults = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return []
  return allPins.value.filter((pin) => {
    const title = (pin.title || '').toLowerCase()
    const author = (pin.author || '').toLowerCase()
    const tags = (pin.tags || []).some((t) => t.toLowerCase().includes(q))
    return title.includes(q) || author.includes(q) || tags
  }).map((pin) => ({
    ...pin,
    boardName: boardMap.value[pin.boardId]?.name || 'Unknown',
  }))
})

async function loadSearchData() {
  const [pins, boards] = await Promise.all([getAllPins(), getAllBoards()])
  allPins.value = pins
  allBoards.value = boards
  searchLoaded.value = true
}

function goHome() {
  currentView.value = 'boards'
  selectedBoard.value = null
  selectedPin.value = null
}

function selectBoard(board) {
  selectedBoard.value = board
  currentView.value = 'board'
}

function backToBoards() {
  currentView.value = 'boards'
  selectedBoard.value = null
  boardListRef.value?.loadBoards()
}

function selectPin(pin) {
  selectedPin.value = pin
}

function closePreview() {
  selectedPin.value = null
}

function onSearchTagClick(pin, tag) {
  closePreview()
  const board = boardMap.value[pin.boardId]
  if (board) {
    selectBoard(board)
    setTimeout(() => boardViewRef.value?.addTagFilter(tag), 0)
  }
}

function onPreviewTagClick(tag) {
  closePreview()
  if (currentView.value === 'board') {
    boardViewRef.value?.addTagFilter(tag)
  }
}

function navToBoard(boardId) {
  const board = boardMap.value[boardId]
  if (board) {
    selectBoard(board)
  }
}

function downloadPin(pin) {
  const ext = pin.type === 'video' ? '.mp4' : '.png'
  const url = pin.image instanceof Blob ? URL.createObjectURL(pin.image) : pin.image
  const a = document.createElement('a')
  a.href = url
  a.download = (pin.title || 'pin') + ext
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  if (url.startsWith('blob:')) URL.revokeObjectURL(url)
}

async function toggleLike(pin) {
  const liked = !pin.liked
  await updatePin({ ...pin, liked })
  pin.liked = liked
  const idx = allPins.value.findIndex((p) => p.id === pin.id)
  if (idx !== -1) {
    allPins.value[idx] = { ...pin }
  }
}

function onEditPin() {
  editingPin.value = selectedPin.value
  closePreview()
  showAddPin.value = true
}

async function onDeletePin() {
  if (!confirm('Delete this pin?')) return
  await deletePin(selectedPin.value.id)
  closePreview()
  loadSearchData()
  if (currentView.value === 'board') {
    boardViewRef.value?.loadPins()
  } else {
    boardListRef.value?.loadBoards()
  }
}

function onAddPinSaved() {
  showAddPin.value = false
  editingPin.value = null
  droppedFiles.value = []
  importUrl.value = ''
  importPageUrl.value = ''
  importTags.value = []
  importAuthor.value = ''
  importTitle.value = ''
  loadSearchData()
  if (currentView.value === 'board') {
    boardViewRef.value?.loadPins()
  } else {
    boardListRef.value?.loadBoards()
  }
}

function onAddBoardSaved() {
  showAddBoard.value = false
  loadSearchData()
  boardListRef.value?.loadBoards()
}

function onDataImported() {
  loadSearchData()
  boardListRef.value?.loadBoards()
  if (currentView.value === 'board') {
    boardViewRef.value?.loadPins()
  }
}

function onFilesDropped(files) {
  const supported = Array.from(files).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))
  if (supported.length > 0) {
    droppedFiles.value = supported
    showAddPin.value = true
  }
}

function onAppDragOver(e) {
  if (e.dataTransfer.types.includes('Files')) {
    e.preventDefault()
    isDragUpload.value = true
  }
}

function onAppDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    isDragUpload.value = false
  }
}

function onAppDrop(e) {
  e.preventDefault()
  isDragUpload.value = false
  if (e.dataTransfer.files.length > 0) {
    onFilesDropped(e.dataTransfer.files)
  }
}

function isInputFocused() {
  const tag = document.activeElement?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable
}

function onPaste(e) {
  if (isInputFocused()) return
  const items = e.clipboardData?.items
  if (!items) return
  const mediaFiles = []
  for (const item of items) {
    if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
      const file = item.getAsFile()
      if (file) mediaFiles.push(file)
    }
  }
  if (mediaFiles.length > 0) {
    e.preventDefault()
    onFilesDropped(mediaFiles)
  }
}

onMounted(() => {
  loadSearchData()
  document.addEventListener('paste', onPaste)
  const params = new URLSearchParams(location.search)
  const extUrl = params.get('import')
  if (extUrl) {
    importUrl.value = extUrl
    importPageUrl.value = params.get('pageUrl') || ''
    importTags.value = params.get('tags') ? params.get('tags').split(',').filter(Boolean) : []
    importAuthor.value = params.get('author') || ''
    importTitle.value = params.get('title') || ''
    showAddPin.value = true
    history.replaceState(null, '', location.pathname)
    return
  }
  const action = params.get('action')
  if (action === 'export') {
    history.replaceState(null, '', location.pathname)
    ;(async () => {
      const blob = await exportAll()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `private-pin-backup-${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
    })()
  } else if (action === 'import') {
    history.replaceState(null, '', location.pathname)
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.zip'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        await importAll(file)
        loadSearchData()
        boardListRef.value?.loadBoards()
        if (currentView.value === 'board') {
          boardViewRef.value?.loadPins()
        }
      } catch (err) {
        alert('Import failed: ' + err.message)
      }
    }
    input.click()
  }
})
onUnmounted(() => document.removeEventListener('paste', onPaste))
</script>

<template>
  <div
    class="min-h-screen bg-white dark:bg-pin-dark relative"
    @dragover="onAppDragOver"
    @dragleave="onAppDragLeave"
    @drop="onAppDrop"
  >
    <div
      v-if="isDragUpload"
      class="fixed inset-0 z-50 bg-pin-red/10 border-4 border-dashed border-pin-red flex items-center justify-center pointer-events-none"
    >
      <div class="bg-white dark:bg-pin-surface rounded-2xl px-8 py-6 shadow-2xl text-center">
        <svg class="w-10 h-10 text-pin-red mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p class="text-pin-red font-semibold">Drop images or videos to create pins</p>
      </div>
    </div>

    <PinNav v-model:search-query="searchQuery" @go-home="goHome" @data-imported="onDataImported" />

    <template v-if="searchQuery.trim() && currentView === 'boards'">
      <div class="max-w-7xl mx-auto px-6 py-4">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {{ searchResults.length }} result{{ searchResults.length !== 1 ? 's' : '' }}
          for "{{ searchQuery }}"
        </p>
        <div v-if="!searchLoaded" class="flex justify-center py-20">
          <div class="w-8 h-8 border-2 border-pin-red border-t-transparent rounded-full animate-spin" />
        </div>
        <div v-else-if="searchResults.length === 0" class="text-center py-20 text-gray-400 dark:text-gray-500">
          <p class="text-lg">No results found</p>
        </div>
        <div v-else class="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
          <div
            v-for="pin in searchResults"
            :key="pin.id"
            class="break-inside-avoid mb-3"
          >
            <div @click="selectPin(pin)">
              <PinCard
                :image="pin.image"
                :title="pin.title"
                :author="pin.author"
                :tags="pin.tags || []"
                :type="pin.type || 'image'"
                :width="pin.width || 300"
                :height="pin.height || 400"
                :pin-id="pin.id"
                :liked="!!pin.liked"
                @tag-click="onSearchTagClick(pin, $event)"
                @save="downloadPin(pin)"
                @like="toggleLike(pin)"
              />
            </div>
            <button
              class="mt-1 text-xs font-medium text-pin-red hover:text-red-700 dark:hover:text-red-400 transition cursor-pointer"
              @click="navToBoard(pin.boardId)"
            >
              {{ pin.boardName }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <BoardList
      v-if="currentView === 'boards' && !searchQuery.trim()"
      ref="boardListRef"
      @select-board="selectBoard"
      @create-board="showAddBoard = true"
    />

    <BoardView
      v-if="currentView === 'board' && selectedBoard"
      ref="boardViewRef"
      :board="selectedBoard"
      :search-query="searchQuery"
      @back="backToBoards"
      @select-pin="selectPin"
    />

    <PinPreview
      v-if="selectedPin"
      :pin="selectedPin"
      @close="closePreview"
      @tag-click="onPreviewTagClick"
      @edit="onEditPin"
      @delete="onDeletePin"
    />

    <button
      class="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-pin-red text-white shadow-lg flex items-center justify-center hover:bg-red-700 transition cursor-pointer"
      @click="showAddPin = true; editingPin = null"
    >
      <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
    </button>

    <AddPinModal
      v-if="showAddPin"
      :initial-files="droppedFiles"
      :current-board-id="selectedBoard?.id || null"
      :edit-pin="editingPin"
      :external-url="importUrl"
      :external-source-url="importPageUrl"
      :external-tags="importTags"
      :external-author="importAuthor"
      :external-title="importTitle"
      @close="showAddPin = false; editingPin = null; droppedFiles = []; importUrl = ''; importPageUrl = ''; importTags = []; importAuthor = ''; importTitle = ''"
      @saved="onAddPinSaved"
    />

    <AddBoardModal
      v-if="showAddBoard"
      @close="showAddBoard = false"
      @saved="onAddBoardSaved"
    />
  </div>
</template>
