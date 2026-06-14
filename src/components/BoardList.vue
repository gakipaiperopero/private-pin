<script setup>
import { ref, onMounted } from 'vue'
import { getAllBoards, getAllPins, clearAll } from '../utils/db.js'
import BoardCard from './BoardCard.vue'

const emit = defineEmits(['select-board', 'create-board'])

const boards = ref([])
const pinCounts = ref({})
const covers = ref({})
const loaded = ref(false)

async function clearAllData() {
  if (!confirm('Delete all boards and pins?')) return
  await clearAll()
  loadBoards()
}

async function loadBoards() {
  const all = await getAllBoards()
  const allPins = await getAllPins()

  const counts = {}
  const coverMap = {}
  for (const board of all) {
    const boardPins = allPins.filter((p) => p.boardId === board.id)
    counts[board.id] = boardPins.length
    coverMap[board.id] = boardPins.slice(0, 4).map((p) => ({ image: p.image, type: p.type || 'image' }))
  }

  pinCounts.value = counts
  covers.value = coverMap
  boards.value = all
  loaded.value = true
}

defineExpose({ loadBoards })
onMounted(loadBoards)
</script>

<template>
  <main class="max-w-7xl mx-auto px-6 py-4">
    <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">Your Boards</h1>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-2 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-pin-red dark:hover:text-pin-red border border-gray-300 dark:border-pin-border transition cursor-pointer"
            @click="clearAllData"
          >
            Delete All
          </button>
          <button
            class="px-5 py-2.5 rounded-full bg-pin-red text-white text-sm font-semibold transition cursor-pointer hover:bg-red-700"
            @click="$emit('create-board')"
          >
            + Create Board
          </button>
        </div>
    </div>

    <div v-if="!loaded" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 border-pin-red border-t-transparent rounded-full animate-spin" />
    </div>
    <div v-else-if="boards.length === 0" class="text-center py-20 text-gray-400 dark:text-gray-500">
      <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <p class="text-lg">No boards yet</p>
      <p class="text-sm mt-1">Create your first board to get started</p>
    </div>
    <div v-else class="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
      <div
        v-for="board in boards"
        :key="board.id"
        @click="$emit('select-board', board)"
      >
        <BoardCard
          :board="board"
          :pin-count="pinCounts[board.id] || 0"
          :cover-images="covers[board.id] || []"
        />
      </div>
    </div>
  </main>
</template>
