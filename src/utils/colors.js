import { reactive } from 'vue'

const STORAGE_KEY = 'pin-color-settings'

export const colorSettings = [
  { key: 'pin-red', label: '--color-pin-red', default: '#e60023' },
  { key: 'pin-gray', label: '--color-pin-gray', default: '#f0f0f0' },
  { key: 'pin-dark', label: '--color-pin-dark', default: '#0f0f0f' },
  { key: 'pin-surface', label: '--color-pin-surface', default: '#212121' },
  { key: 'pin-border', label: '--color-pin-border', default: '#303030' },
]

export const colors = reactive(
  Object.fromEntries(colorSettings.map((c) => [c.key, c.default]))
)

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved) {
      for (const s of colorSettings) {
        if (saved[s.key]) {
          colors[s.key] = saved[s.key]
        }
      }
    }
  } catch {}
}

function apply() {
  const el = document.documentElement
  for (const s of colorSettings) {
    el.style.setProperty(s.label, colors[s.key])
  }
}

export function initColors() {
  load()
  apply()
}

export function saveColor(key, hex) {
  colors[key] = hex
  const el = document.documentElement
  const setting = colorSettings.find((s) => s.key === key)
  if (setting) el.style.setProperty(setting.label, hex)
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...colors }))
}

export function resetColors() {
  for (const s of colorSettings) {
    colors[s.key] = s.default
    document.documentElement.style.removeProperty(s.label)
  }
  localStorage.removeItem(STORAGE_KEY)
}
