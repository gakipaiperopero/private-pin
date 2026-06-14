import JSZip from 'jszip'

const DB_NAME = 'PrivatePin'
const DB_VERSION = 3
const PIN_STORE = 'pins'
const BOARD_STORE = 'boards'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result

      if (db.objectStoreNames.contains(PIN_STORE)) {
        db.deleteObjectStore(PIN_STORE)
      }
      if (db.objectStoreNames.contains(BOARD_STORE)) {
        db.deleteObjectStore(BOARD_STORE)
      }

      const boardStore = db.createObjectStore(BOARD_STORE, { keyPath: 'id', autoIncrement: true })
      boardStore.createIndex('createdAt', 'createdAt', { unique: false })

      const pinStore = db.createObjectStore(PIN_STORE, { keyPath: 'id', autoIncrement: true })
      pinStore.createIndex('createdAt', 'createdAt', { unique: false })
      pinStore.createIndex('boardId', 'boardId', { unique: false })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ---- Boards ----

export async function getAllBoards() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BOARD_STORE, 'readonly')
    const store = tx.objectStore(BOARD_STORE)
    const index = store.index('createdAt')
    const request = index.openCursor(null, 'prev')
    const boards = []
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        boards.push(cursor.value)
        cursor.continue()
      } else {
        resolve(boards)
      }
    }
    request.onerror = () => reject(request.error)
  })
}

export async function addBoard(board) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BOARD_STORE, 'readwrite')
    const store = tx.objectStore(BOARD_STORE)
    const request = store.add({ ...board, createdAt: Date.now() })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteBoard(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BOARD_STORE, 'readwrite')
    const store = tx.objectStore(BOARD_STORE)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ---- Pins ----

export async function getAllPins() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PIN_STORE, 'readonly')
    const store = tx.objectStore(PIN_STORE)
    const index = store.index('createdAt')
    const request = index.openCursor(null, 'prev')
    const pins = []
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        pins.push(cursor.value)
        cursor.continue()
      } else {
        resolve(pins)
      }
    }
    request.onerror = () => reject(request.error)
  })
}

export async function getPinsByBoard(boardId) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PIN_STORE, 'readonly')
    const store = tx.objectStore(PIN_STORE)
    const index = store.index('boardId')
    const request = index.getAll(boardId)
    request.onsuccess = () => {
      const pins = request.result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      resolve(pins)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function addPin(pin) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PIN_STORE, 'readwrite')
    const store = tx.objectStore(PIN_STORE)
    const request = store.add({ ...pin, createdAt: Date.now() })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      console.error('IndexedDB addPin error:', request.error)
      reject(request.error)
    }
  })
}

export async function updatePin(pin) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PIN_STORE, 'readwrite')
    const store = tx.objectStore(PIN_STORE)
    const request = store.put(pin)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function deletePin(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PIN_STORE, 'readwrite')
    const store = tx.objectStore(PIN_STORE)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function estimateStorage() {
  const db = await openDB()
  const tx = db.transaction([PIN_STORE, BOARD_STORE], 'readonly')
  const [pins, boards] = await Promise.all([
    new Promise((resolve, reject) => {
      const req = tx.objectStore(PIN_STORE).getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    }),
    new Promise((resolve, reject) => {
      const req = tx.objectStore(BOARD_STORE).getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    }),
  ])

  let totalBytes = 0
  for (const pin of pins) {
    totalBytes += sizeof(pin)
  }
  for (const board of boards) {
    totalBytes += sizeof(board)
  }

  const navEstimate = await navigator.storage?.estimate?.()
  return {
    pins: pins.length,
    boards: boards.length,
    estimatedBytes: totalBytes,
    estimatedMB: (totalBytes / (1024 * 1024)).toFixed(2),
    quotaMB: navEstimate?.quota ? (navEstimate.quota / (1024 * 1024)).toFixed(0) : 'N/A',
    usageMB: navEstimate?.usage ? (navEstimate.usage / (1024 * 1024)).toFixed(2) : 'N/A',
  }
}

function sizeof(obj) {
  if (obj instanceof Blob) return obj.size
  if (typeof obj === 'string') return obj.length * 2
  if (typeof obj === 'number') return 8
  if (typeof obj === 'boolean') return 4
  if (Array.isArray(obj)) return obj.reduce((acc, v) => acc + sizeof(v), 0)
  if (obj && typeof obj === 'object') {
    let bytes = 0
    for (const key in obj) {
      if (Object.hasOwn(obj, key)) bytes += sizeof(obj[key])
    }
    return bytes
  }
  return 0
}

export async function clearAll() {
  const db = await openDB()
  const tx = db.transaction([PIN_STORE, BOARD_STORE], 'readwrite')
  tx.objectStore(PIN_STORE).clear()
  tx.objectStore(BOARD_STORE).clear()
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function exportAll(mediaDir = 'media') {
  const db = await openDB()
  const [pins, boards] = await Promise.all([
    new Promise((resolve, reject) => {
      const tx = db.transaction(PIN_STORE, 'readonly')
      const req = tx.objectStore(PIN_STORE).getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    }),
    new Promise((resolve, reject) => {
      const tx = db.transaction(BOARD_STORE, 'readonly')
      const req = tx.objectStore(BOARD_STORE).getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    }),
  ])

  const metadata = { version: DB_VERSION, boards }
  const zip = new JSZip()

  const dir = mediaDir.replace(/\/$/, '')
  const mediaPins = []
  for (const pin of pins) {
    if (pin.image instanceof Blob) {
      const ext = pin.type === 'video' ? '.webm' : '.bin'
      const name = `${dir}/${pin.id}${ext}`
      zip.file(name, pin.image)
      mediaPins.push({ ...pin, image: name })
    } else {
      mediaPins.push(pin)
    }
  }
  metadata.pins = mediaPins

  zip.file('metadata.json', JSON.stringify(metadata, null, 2))
  return zip.generateAsync({ type: 'blob' })
}

export async function importAll(blob) {
  const zip = await JSZip.loadAsync(blob)
  const metaFile = zip.file('metadata.json')
  if (!metaFile) throw new Error('Invalid backup: missing metadata.json')
  const metadata = JSON.parse(await metaFile.async('string'))
  const { pins, boards } = metadata

  for (const pin of pins) {
    if (typeof pin.image === 'string' && !pin.image.startsWith('http') && !pin.image.startsWith('data:')) {
      const mediaFile = zip.file(pin.image)
      if (mediaFile) {
        pin.image = await mediaFile.async('blob')
      }
    }
  }

  const db = await openDB()
  const tx = db.transaction([PIN_STORE, BOARD_STORE], 'readwrite')
  tx.objectStore(PIN_STORE).clear()
  tx.objectStore(BOARD_STORE).clear()
  for (const board of boards) {
    tx.objectStore(BOARD_STORE).add(board)
  }
  for (const pin of pins) {
    tx.objectStore(PIN_STORE).add(pin)
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
