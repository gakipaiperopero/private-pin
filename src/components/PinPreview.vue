<script setup>
import { ref, computed } from 'vue'
import { deletePin } from '../utils/db.js'
import { getMediaUrl } from '../utils/media.js'

const props = defineProps({
  pin: { type: Object, required: true },
})

const emit = defineEmits(['close', 'tag-click', 'edit', 'delete'])

const displayUrl = computed(() => getMediaUrl(props.pin.image))

const showDeleteConfirm = ref(false)

async function handleDelete() {
  if (!confirm('Delete this pin?')) return
  await deletePin(props.pin.id)
  emit('delete')
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    @click.self="$emit('close')"
  >
    <div class="bg-white dark:bg-pin-surface rounded-3xl w-full max-w-4xl mx-4 overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
      <div class="md:w-3/5 bg-pin-gray dark:bg-pin-dark flex items-center justify-center min-h-[300px]">
        <img
          v-if="pin.type !== 'video'"
          :src="displayUrl"
          :alt="pin.title"
          class="w-full h-full object-contain max-h-[60vh] md:max-h-[80vh]"
        />
        <video
          v-else
          :src="displayUrl"
          class="w-full h-full max-h-[60vh] md:max-h-[80vh]"
          controls
          playsinline
        />
      </div>

      <div class="md:w-2/5 p-6 flex flex-col gap-4 overflow-y-auto">
        <div class="flex items-start justify-between">
          <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">{{ pin.title || 'Untitled' }}</h2>
          <button
            class="w-8 h-8 rounded-full bg-pin-gray dark:bg-pin-surface flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#303030] transition cursor-pointer shrink-0"
            @click="$emit('close')"
          >
            <svg class="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p class="text-sm text-gray-500 dark:text-gray-400">by {{ pin.author || 'Anonymous' }}</p>

        <div v-if="pin.tags && pin.tags.length > 0" class="flex gap-1.5 flex-wrap">
          <button
            v-for="tag in pin.tags"
            :key="tag"
            class="px-2.5 py-1 rounded-full text-xs font-medium bg-pin-red/10 text-pin-red dark:bg-pin-red/20 cursor-pointer hover:bg-pin-red/20 dark:hover:bg-pin-red/30 transition"
            @click="emit('tag-click', tag)"
          >
            {{ tag }}
          </button>
        </div>

        <div class="flex gap-2 mt-2">
          <button
            class="flex-1 py-2.5 rounded-full bg-pin-red text-white font-semibold text-sm transition cursor-pointer hover:bg-red-700"
            @click="emit('edit')"
          >
            Edit
          </button>
          <button
            class="w-11 h-11 rounded-full border border-gray-300 dark:border-pin-border text-gray-500 dark:text-gray-400 flex items-center justify-center transition cursor-pointer hover:bg-gray-100 dark:hover:bg-[#303030] shrink-0"
            @click="emit('delete')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        <div class="mt-4 pt-4 border-t border-gray-200 dark:border-pin-border space-y-1">
          <p class="text-xs text-gray-400 dark:text-gray-500">
            {{ pin.width }} x {{ pin.height }}
          </p>
          <a
            v-if="pin.sourceUrl"
            :href="pin.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-xs text-pin-red hover:underline"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Visit source
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
