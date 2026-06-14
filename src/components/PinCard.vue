<script setup>
import { computed } from 'vue'
import { getMediaUrl } from '../utils/media.js'

const props = defineProps({
  image: { required: true },
  title: { type: String, default: "" },
  author: { type: String, default: "" },
  tags: { type: Array, default: () => [] },
  type: { type: String, default: 'image' },
  width: { type: Number, default: 300 },
  height: { type: Number, default: 400 },
  pinId: { type: [Number, String], default: null },
  liked: { type: Boolean, default: false },
})

const emit = defineEmits(['dragstart', 'tag-click', 'save', 'like'])

const displayUrl = computed(() => getMediaUrl(props.image))

function onDragStart(e) {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', String(props.pinId))
  e.target.closest('.pin-card')?.classList.add('opacity-50')
}

function onDragEnd(e) {
  e.target.closest('.pin-card')?.classList.remove('opacity-50')
}
</script>

<template>
  <div
    class="pin-card break-inside-avoid mb-4 group cursor-grab active:cursor-grabbing"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <div class="relative rounded-2xl overflow-hidden bg-pin-gray dark:bg-pin-surface" :style="{ paddingBottom: `${(height / width) * 100}%` }">
      <img
        v-if="type === 'image'"
        :src="displayUrl"
        :alt="title"
        class="absolute inset-0 w-full h-full object-cover group-hover:brightness-90 transition pointer-events-none"
        loading="lazy"
        draggable="false"
      />
      <video
        v-else
        :src="displayUrl"
        class="absolute inset-0 w-full h-full object-cover pointer-events-none"
        muted
        loop
        playsinline
      />
      <div
        v-if="type === 'video'"
        class="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div class="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
          <svg class="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
        <button
          class="bg-pin-red text-white px-5 py-2 rounded-full text-sm font-semibold cursor-pointer hover:bg-red-700 transition"
          @click.stop="emit('save')"
        >
          Save
        </button>
      </div>
      <div class="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition">
        <button
          class="bg-white dark:bg-pin-surface bg-opacity-90 p-2 rounded-full cursor-pointer hover:bg-white dark:hover:bg-[#303030] transition shadow"
          @click.stop="emit('like')"
        >
          <svg
            class="w-4 h-4 transition"
            :class="liked ? 'text-pin-red fill-pin-red' : 'text-gray-700 dark:text-gray-200'"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
    </div>
    <p v-if="title" class="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{{ title }}</p>
    <p v-if="author" class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ author }}</p>
    <div v-if="tags.length > 0" class="flex gap-1 flex-wrap mt-1">
      <button
        v-for="tag in tags.slice(0, 3)"
        :key="tag"
        class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-pin-red/10 text-pin-red dark:bg-pin-red/20 leading-normal cursor-pointer hover:bg-pin-red/20 dark:hover:bg-pin-red/30 transition"
        @click.stop="emit('tag-click', tag)"
      >
        {{ tag }}
      </button>
      <span
        v-if="tags.length > 3"
        class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-pin-gray dark:bg-pin-surface text-gray-500 dark:text-gray-400 leading-normal"
      >
        +{{ tags.length - 3 }}
      </span>
    </div>
  </div>
</template>
