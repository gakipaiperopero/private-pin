<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { exportAll, importAll, estimateStorage } from '../utils/db.js'

const emit = defineEmits(['go-home', 'update:searchQuery', 'data-imported'])

const GITHUB_REPO = 'gakipaiperopero/private-pin'

const dark = ref(true)
const searchQuery = ref('')
const showUserMenu = ref(false)
const showBellMenu = ref(false)
const storageInfo = ref(null)
const loadingStorage = ref(false)
const commits = ref([])
const bellLoaded = ref(false)
const lastSeenSha = ref(localStorage.getItem('lastSeenCommit') || '')

const hasUnseen = computed(() => {
  if (!bellLoaded.value || commits.value.length === 0) return false
  return commits.value[0].sha !== lastSeenSha.value
})

function onSearchInput(e) {
  searchQuery.value = e.target.value
  emit('update:searchQuery', searchQuery.value)
}

function toggleTheme() {
  dark.value = !dark.value
  const cls = dark.value ? 'dark' : 'light'
  localStorage.setItem('theme', cls)
  document.documentElement.classList.toggle('dark', dark.value)
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', cls)
}

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value
  if (showUserMenu.value) showBellMenu.value = false
}

function toggleBellMenu() {
  showBellMenu.value = !showBellMenu.value
  if (showBellMenu.value) {
    showUserMenu.value = false
    if (commits.value.length > 0) {
      lastSeenSha.value = commits.value[0].sha
      localStorage.setItem('lastSeenCommit', lastSeenSha.value)
    }
  }
}

function onClickAway(e) {
  const path = e.composedPath()
  const inUser = path.some((el) => el.nodeType === 1 && el.classList?.contains('user-menu-container'))
  const inBell = path.some((el) => el.nodeType === 1 && el.classList?.contains('bell-menu-container'))
  if (!inUser) showUserMenu.value = false
  if (!inBell) showBellMenu.value = false
}

async function fetchCommits() {
  const cached = localStorage.getItem('cachedCommits')
  const cachedTime = localStorage.getItem('cachedCommitsTime')
  const oneHour = 60 * 60 * 1000
  if (cached && cachedTime && Date.now() - Number(cachedTime) < oneHour) {
    try { commits.value = JSON.parse(cached) } catch {}
    bellLoaded.value = true
    return
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/commits?sha=main&per_page=5`, {
      headers: { 'User-Agent': 'PrivatePin/1.0' },
    })
    if (!res.ok) {
      if (cached) {
        try { commits.value = JSON.parse(cached) } catch {}
      }
      bellLoaded.value = true
      return
    }
    const data = await res.json()
    const mapped = data.map((c) => ({
      sha: c.sha,
      message: c.commit.message.split('\n')[0],
      author: c.commit.author?.name || 'Unknown',
      date: c.commit.author?.date,
      url: c.html_url,
    }))
    commits.value = mapped
    localStorage.setItem('cachedCommits', JSON.stringify(mapped))
    localStorage.setItem('cachedCommitsTime', String(Date.now()))
  } catch {
    if (cached) {
      try { commits.value = JSON.parse(cached) } catch {}
    }
  }
  bellLoaded.value = true
}

onMounted(() => {
  const t = localStorage.getItem('theme')
  dark.value = t === 'light' ? false : true
  document.addEventListener('click', onClickAway)
  fetchCommits()
})

onUnmounted(() => {
  document.removeEventListener('click', onClickAway)
})

async function doExport() {
  const blob = await exportAll()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `private-pin-backup-${new Date().toISOString().slice(0, 10)}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
  showUserMenu.value = false
}

function doImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.zip'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      await importAll(file)
      emit('data-imported')
    } catch (err) {
      alert('Import failed: ' + err.message)
    }
  }
  input.click()
  showUserMenu.value = false
}

async function loadStorage() {
  loadingStorage.value = true
  storageInfo.value = await estimateStorage()
  loadingStorage.value = false
}
</script>

<template>
  <nav class="sticky top-0 z-50 bg-white dark:bg-pin-dark border-b border-gray-200 dark:border-pin-border">
    <div class="flex items-center gap-4 px-6 h-16 max-w-7xl mx-auto">
      <button
        class="text-pin-red text-2xl font-bold tracking-tight shrink-0 cursor-pointer hover:opacity-80 transition"
        @click="$emit('go-home')"
      >
        <span class="text-pin-red">P</span>rivate Pin
      </button>

      <div class="flex items-center gap-1 bg-pin-gray dark:bg-pin-surface rounded-full px-4 h-12 flex-1 max-w-2xl">
        <svg class="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <input
          type="text"
          :value="searchQuery"
          placeholder="Search tags, titles, authors..."
          class="bg-transparent outline-none px-3 py-2 w-full text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
          @input="onSearchInput"
        />
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <button
          class="w-10 h-10 rounded-full bg-pin-gray dark:bg-pin-surface flex items-center justify-center hover:brightness-95 dark:hover:brightness-125 transition cursor-pointer text-lg text-gray-700 dark:text-gray-200"
          @click="toggleTheme"
          :title="dark ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          {{ dark ? '☾' : '☀' }}
        </button>

        <div class="relative bell-menu-container" @click.stop>
          <button
            class="w-10 h-10 rounded-full bg-pin-gray dark:bg-pin-surface flex items-center justify-center hover:brightness-95 dark:hover:brightness-125 transition cursor-pointer relative"
            @click="toggleBellMenu"
          >
            <svg class="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a7.002 7.002 0 00-5-6.708V3a1 1 0 10-2 0v1.292A7.002 7.002 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
            </svg>
            <span
              v-if="hasUnseen"
              class="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-pin-red text-white text-[9px] font-bold flex items-center justify-center"
            >
              !
            </span>
          </button>
          <div
            v-if="showBellMenu"
            class="absolute right-0 mt-2 w-80 bg-white dark:bg-pin-surface border border-gray-200 dark:border-pin-border rounded-xl shadow-xl overflow-hidden"
          >
            <div class="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-pin-border">
              Recent Commits
            </div>
            <div v-if="!bellLoaded" class="px-4 py-6 text-center text-sm text-gray-400">
              Loading...
            </div>
            <div v-else-if="commits.length === 0" class="px-4 py-6 text-center text-sm text-gray-400">
              No commits found
            </div>
            <template v-else>
              <a
                v-for="c in commits"
                :key="c.sha"
                :href="c.url"
                target="_blank"
                class="block px-4 py-3 hover:bg-pin-gray dark:hover:bg-[#303030] transition border-b border-gray-100 dark:border-pin-border last:border-0"
              >
                <p class="text-sm text-gray-800 dark:text-gray-100 line-clamp-2">{{ c.message }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ c.author }} &middot; {{ new Date(c.date).toLocaleDateString() }}
                </p>
              </a>
            </template>
          </div>
        </div>

        <div class="relative user-menu-container" @click.stop>
          <button
            class="w-10 h-10 rounded-full bg-pin-gray dark:bg-pin-surface flex items-center justify-center hover:brightness-95 dark:hover:brightness-125 transition cursor-pointer"
            @click="toggleUserMenu"
          >
            <svg class="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
          <div
            v-if="showUserMenu"
            class="absolute right-0 mt-2 w-48 bg-white dark:bg-pin-surface border border-gray-200 dark:border-pin-border rounded-xl shadow-xl overflow-hidden"
          >
            <button
              class="w-full px-4 py-3 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-pin-gray dark:hover:bg-[#303030] transition cursor-pointer flex items-center gap-3"
              @click="doExport"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5-5 5 5M12 6v12" />
              </svg>
              Export Data
            </button>
            <button
              class="w-full px-4 py-3 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-pin-gray dark:hover:bg-[#303030] transition cursor-pointer flex items-center gap-3"
              @click="doImport"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 13l5 5 5-5M12 6v12" />
              </svg>
              Import Data
            </button>
            <div class="border-t border-gray-100 dark:border-pin-border">
              <button
                class="w-full px-4 py-3 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-pin-gray dark:hover:bg-[#303030] transition cursor-pointer flex items-center gap-3"
                @click="loadStorage"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                {{ loadingStorage ? 'Calculating...' : storageInfo ? `${storageInfo.pins} pins · ${storageInfo.boards} boards · ${storageInfo.estimatedMB} MB` : 'Storage' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>
