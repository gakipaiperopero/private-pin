<script setup>
import { ref, onMounted } from 'vue'
import { getAllPins, updatePin, addPin } from '../utils/db.js'
import PinCard from './PinCard.vue'

const emit = defineEmits(['files-dropped'])

const pins = ref([])
const dragOverIndex = ref(-1)
const isDragOver = ref(false)

const dummyImages = [
  { w: 300, h: 420, title: 'Modern minimalist workspace', author: 'Design Studio' },
  { w: 300, h: 320, title: 'Geometric abstract pattern', author: 'Art by Maya' },
  { w: 300, h: 500, title: 'Urban photography series', author: 'Lens & Light' },
  { w: 300, h: 280, title: 'Typography exploration', author: 'Type Foundry' },
  { w: 300, h: 450, title: 'Nature color palette', author: 'Chromatic' },
  { w: 300, h: 350, title: 'UI component library', author: 'UX Collective' },
  { w: 300, h: 480, title: 'Hand-drawn illustration', author: 'Sketchbook Pro' },
  { w: 300, h: 300, title: 'Architecture detail shot', author: 'Building Visions' },
  { w: 300, h: 520, title: 'Abstract fluid art', author: 'Liquid Dreams' },
  { w: 300, h: 380, title: 'Product photography', author: 'Studio 9' },
  { w: 300, h: 440, title: 'Minimal logo collection', author: 'Brand Lab' },
  { w: 300, h: 310, title: 'Botanical illustration', author: 'Green Garden' },
  { w: 300, h: 490, title: 'Vintage poster design', author: 'Retro Revival' },
  { w: 300, h: 360, title: 'Digital art portrait', author: 'Pixel Artist' },
  { w: 300, h: 410, title: 'Texture study', author: 'Material World' },
  { w: 300, h: 340, title: 'Gradient exploration', author: 'Color Theory' },
  { w: 300, h: 470, title: 'Surreal landscape', author: 'Dreamscape' },
  { w: 300, h: 290, title: 'Pattern design', author: 'Pattern Lab' },
  { w: 300, h: 430, title: 'Editorial layout', author: 'Grid Systems' },
  { w: 300, h: 370, title: 'Icon set design', author: 'Icon Craft' },
  { w: 300, h: 510, title: 'Fashion illustration', author: 'Style Sketch' },
  { w: 300, h: 330, title: 'Food photography', author: 'Taste Visuals' },
  { w: 300, h: 460, title: 'Brand identity mockup', author: 'Brand Studio' },
  { w: 300, h: 390, title: 'Celestial art', author: 'Star Gazer' },
]

const loaded = ref(false)

function isDbPin(id) {
  return typeof id === 'number'
}

async function loadPins() {
  const stored = await getAllPins()
  if (stored.length > 0) {
    pins.value = stored
  } else {
    pins.value = dummyImages.map((img, i) => ({
      id: `dummy-${i}`,
      ...img,
      image: `https://picsum.photos/seed/pin${i + 1}/${img.w}/${img.h}`,
    }))
  }
  loaded.value = true
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

defineExpose({ loadPins })
onMounted(loadPins)
</script>

<template>
  <main
    class="max-w-7xl mx-auto px-6 py-4 relative"
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

    <div v-if="!loaded" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 border-pin-red border-t-transparent rounded-full animate-spin" />
    </div>
    <div v-else-if="pins.length === 0" class="text-center py-20 text-gray-400 dark:text-gray-500">
      <p class="text-lg">No pins yet — click + to add your first one</p>
    </div>
    <div v-else class="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
      <div
        v-for="(pin, i) in pins"
        :key="pin.id"
        :data-pin-id="pin.id"
        class="transition-opacity"
        :class="dragOverIndex === i ? 'opacity-60' : ''"
        @dragover.prevent="dragOverIndex = i"
        @dragleave="dragOverIndex = -1"
      >
        <PinCard
          :image="pin.image"
          :title="pin.title"
          :author="pin.author"
          :type="pin.type || 'image'"
          :width="pin.width || 300"
          :height="pin.height || 400"
          :pin-id="pin.id"
        />
      </div>
    </div>
  </main>
</template>
