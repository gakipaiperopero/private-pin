<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { getPinsByBoard, getAllPins, updatePin } from '../utils/db.js'
import PinCard from './PinCard.vue'

const props = defineProps({
  board: { type: Object, required: true },
  searchQuery: { type: String, default: '' },
})

const emit = defineEmits(['back', 'select-pin'])

const pins = ref([])
const loaded = ref(false)
const dragOverIndex = ref(-1)
const isDragOver = ref(false)
const activeTags = ref([])

const filteredPins = computed(() => {
  let result = pins.value
  const q = props.searchQuery.toLowerCase().trim()
  if (q) {
    result = result.filter((pin) => {
      const title = (pin.title || '').toLowerCase()
      const author = (pin.author || '').toLowerCase()
      const tags = (pin.tags || []).some((t) => t.toLowerCase().includes(q))
      return title.includes(q) || author.includes(q) || tags
    })
  }
  if (activeTags.value.length > 0) {
    result = result.filter((pin) =>
      activeTags.value.every((t) => (pin.tags || []).includes(t))
    )
  }
  return result
})

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
  pins.value = [...pins.value]
}

const sortedPins = computed(() => {
  return [...filteredPins.value].sort((a, b) => {
    if (a.liked && !b.liked) return -1
    if (!a.liked && b.liked) return 1
    return (a.order ?? Infinity) - (b.order ?? Infinity)
  })
})

async function loadPins() {
  const stored = await getPinsByBoard(props.board.id)
  pins.value = stored
  loaded.value = true
}

watch(() => props.board?.id, () => {
  activeTags.value = []
  loaded.value = false
  loadPins()
})

function isDbPin(id) {
  return typeof id === 'number'
}

async function persistOrder() {
  const dbPins = pins.value.filter((p) => isDbPin(p.id))
  for (let i = 0; i < dbPins.length; i++) {
    await updatePin({ ...dbPins[i], order: i })
  }
}

function onGridDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
}

function onGridDrop(e) {
  e.preventDefault()
  dragOverIndex.value = -1
  isDragOver.value = false

  const raw = e.dataTransfer.getData('text/plain')
  if (!raw) return

  const targetEl = e.target.closest('.pin-card')
  if (!targetEl) return
  const targetId = targetEl.dataset.pinId
  if (!targetId) return

  const fromIdx = pins.value.findIndex((p) => String(p.id) === raw)
  const toIdx = pins.value.findIndex((p) => String(p.id) === targetId)
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return

  const item = pins.value.splice(fromIdx, 1)[0]
  pins.value.splice(toIdx, 0, item)
  persistOrder()
}

function onDragEnterGrid(e) {
  e.preventDefault()
  isDragOver.value = true
}

function onDragLeaveGrid(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    isDragOver.value = false
    dragOverIndex.value = -1
  }
}

function onTagClick(tag) {
  const idx = activeTags.value.indexOf(tag)
  if (idx >= 0) {
    activeTags.value.splice(idx, 1)
  } else {
    activeTags.value.push(tag)
  }
}

function addTagFilter(tag) {
  if (!activeTags.value.includes(tag)) {
    activeTags.value.push(tag)
  }
}

defineExpose({ loadPins, addTagFilter })
onMounted(loadPins)
</script>

<template>
  <main class="max-w-7xl mx-auto px-6 py-4 relative">
    <div class="flex items-center gap-3 mb-6">
      <button
        class="w-9 h-9 rounded-full bg-pin-gray dark:bg-pin-surface flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#303030] transition cursor-pointer"
        @click="$emit('back')"
      >
        <svg class="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div>
        <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ board.name }}</h1>
        <p v-if="board.description" class="text-sm text-gray-500 dark:text-gray-400">{{ board.description }}</p>
      </div>
    </div>

    <div
      class="relative"
      @dragover="onGridDragOver"
      @drop.prevent="onGridDrop"
      @dragenter="onDragEnterGrid"
      @dragleave="onDragLeaveGrid"
    >
      <div
        v-if="isDragOver"
        class="absolute inset-0 z-10 border-2 border-dashed border-pin-red bg-pin-red/5 rounded-2xl pointer-events-none flex items-center justify-center"
      >
        <span class="bg-white dark:bg-pin-surface px-6 py-3 rounded-full shadow-lg text-pin-red font-semibold text-sm">
          Drop to reorder
        </span>
      </div>

      <div v-if="activeTags.length > 0" class="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <span>Filtering by:</span>
        <span
          v-for="tag in activeTags"
          :key="tag"
          class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-pin-red/10 text-pin-red dark:bg-pin-red/20"
        >
          #{{ tag }}
          <button
            class="cursor-pointer hover:opacity-70 transition"
            @click="onTagClick(tag)"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
        <button
          class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition cursor-pointer"
          @click="activeTags = []"
        >
          Clear all
        </button>
      </div>

      <div v-if="!loaded" class="flex justify-center py-20">
        <div class="w-8 h-8 border-2 border-pin-red border-t-transparent rounded-full animate-spin" />
      </div>
      <div v-else-if="filteredPins.length === 0" class="text-center py-20 text-gray-400 dark:text-gray-500">
        <p class="text-lg">{{ pins.length === 0 ? 'No pins in this board yet' : 'No pins match your search' }}</p>
      </div>
      <div v-else class="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
        <div
          v-for="(pin, i) in sortedPins"
          :key="pin.id"
          :data-pin-id="pin.id"
          class="transition-opacity cursor-pointer"
          :class="dragOverIndex === i ? 'opacity-60' : ''"
          @dragover.prevent="dragOverIndex = i"
          @dragleave="dragOverIndex = -1"
          @click="$emit('select-pin', pin)"
        >
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
            @tag-click="onTagClick"
            @save="downloadPin(pin)"
            @like="toggleLike(pin)"
          />
        </div>
      </div>
    </div>
  </main>
</template>
