<script setup>
import { colorSettings, colors, saveColor, resetColors } from '../utils/colors.js'

const emit = defineEmits(['close'])

function handleReset() {
  resetColors()
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    @click.self="$emit('close')"
  >
    <div class="bg-white dark:bg-pin-surface rounded-3xl w-full max-w-md mx-4 overflow-hidden shadow-2xl">
      <div class="flex items-center justify-between p-4 border-b border-gray-100 dark:border-pin-border">
        <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">Settings</h2>
        <button
          class="w-8 h-8 rounded-full bg-pin-gray dark:bg-pin-surface flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#303030] transition cursor-pointer"
          @click="$emit('close')"
        >
          <svg class="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6 space-y-5">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Customize the app colors. Changes apply immediately.
        </p>

        <div
          v-for="s in colorSettings"
          :key="s.key"
          class="flex items-center gap-4"
        >
          <label class="flex-1 text-sm font-mono text-gray-700 dark:text-gray-200" :for="'color-' + s.key">
            {{ s.label }}
          </label>
          <div class="relative">
            <input
              :id="'color-' + s.key"
              type="color"
              :value="colors[s.key]"
              class="w-10 h-10 rounded-lg border border-gray-200 dark:border-pin-border cursor-pointer p-0.5 bg-transparent"
              @input="saveColor(s.key, $event.target.value)"
            />
          </div>
        </div>

        <div class="pt-2 flex gap-3">
          <button
            class="flex-1 py-3 rounded-full text-sm font-semibold text-white bg-pin-red hover:bg-red-700 transition cursor-pointer"
            @click="$emit('close')"
          >
            Done
          </button>
          <button
            class="py-3 px-5 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-pin-border hover:bg-pin-gray dark:hover:bg-[#303030] transition cursor-pointer"
            @click="handleReset"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
