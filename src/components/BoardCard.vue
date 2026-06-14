<script setup>
import { computed } from 'vue'
import { getMediaUrl } from '../utils/media.js'

const props = defineProps({
  board: { type: Object, required: true },
  pinCount: { type: Number, default: 0 },
  coverImages: { type: Array, default: () => [] },
})

const covers = computed(() =>
  props.coverImages.map((item) => ({
    ...item,
    url: getMediaUrl(item.image),
  }))
)
</script>

<template>
  <div class="break-inside-avoid mb-4 group cursor-pointer">
    <div class="relative rounded-2xl overflow-hidden bg-pin-gray dark:bg-pin-surface aspect-[4/3]">
      <template v-if="covers.length === 1">
        <img
          v-if="covers[0].type !== 'video'"
          :src="covers[0].url"
          :alt="board.name"
          class="absolute inset-0 w-full h-full object-cover group-hover:brightness-90 transition"
          loading="lazy"
        />
        <video
          v-else
          :src="covers[0].url"
          class="absolute inset-0 w-full h-full object-cover group-hover:brightness-90 transition"
          muted
          playsinline
        />
      </template>

      <template v-else-if="covers.length >= 2">
        <div class="grid grid-cols-2 grid-rows-2 w-full h-full">
          <template v-for="(item, i) in covers.slice(0, 4)" :key="i">
            <img
              v-if="item.type !== 'video'"
              :src="item.url"
              :alt="`${board.name} ${i + 1}`"
              class="w-full h-full object-cover group-hover:brightness-90 transition"
              :class="coverImages.length === 2 && i === 0 ? 'row-span-2' : ''"
              loading="lazy"
            />
            <video
              v-else
              :src="item.url"
              class="w-full h-full object-cover group-hover:brightness-90 transition"
              :class="coverImages.length === 2 && i === 0 ? 'row-span-2' : ''"
              muted
              playsinline
            />
          </template>
        </div>
      </template>

      <div
        v-else
        class="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500"
      >
        <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    </div>
    <p class="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{{ board.name }}</p>
    <p v-if="board.description" class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ board.description }}</p>
    <p class="text-xs text-gray-400 dark:text-gray-500">{{ pinCount }} {{ pinCount === 1 ? 'pin' : 'pins' }}</p>
  </div>
</template>
