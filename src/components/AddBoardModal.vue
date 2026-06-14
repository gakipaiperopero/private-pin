<script setup>
import { ref } from 'vue'
import { addBoard } from '../utils/db.js'

const emit = defineEmits(['close', 'saved'])

const name = ref('')
const description = ref('')
const saving = ref(false)
const error = ref('')

async function handleSave() {
  if (!name.value.trim()) {
    error.value = 'Please enter a board name'
    return
  }

  saving.value = true
  error.value = ''

  try {
    await addBoard({
      name: name.value.trim(),
      description: description.value.trim(),
    })
    emit('saved')
  } catch {
    error.value = 'Failed to create board'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    @click.self="$emit('close')"
  >
    <div class="bg-white dark:bg-pin-surface rounded-3xl w-full max-w-md mx-4 overflow-hidden shadow-2xl">
      <div class="flex items-center justify-between p-4 border-b border-gray-100 dark:border-pin-border">
        <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">Create Board</h2>
        <button
          class="w-8 h-8 rounded-full bg-pin-gray dark:bg-pin-surface flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#303030] transition cursor-pointer"
          @click="$emit('close')"
        >
          <svg class="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6 space-y-4">
        <input
          v-model="name"
          type="text"
          placeholder="Board name..."
          class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-pin-border bg-white dark:bg-pin-surface outline-none focus:border-gray-400 dark:focus:border-gray-500 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition"
        />

        <textarea
          v-model="description"
          placeholder="Description (optional)"
          rows="3"
          class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-pin-border bg-white dark:bg-pin-surface outline-none focus:border-gray-400 dark:focus:border-gray-500 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition resize-none"
        />

        <p v-if="error" class="text-pin-red text-sm">{{ error }}</p>

        <button
          class="w-full py-3 rounded-full text-white font-semibold text-sm transition cursor-pointer disabled:opacity-50"
          :class="saving ? 'bg-gray-400' : 'bg-pin-red hover:bg-red-700'"
          :disabled="saving"
          @click="handleSave"
        >
          {{ saving ? 'Creating...' : 'Create Board' }}
        </button>
      </div>
    </div>
  </div>
</template>
