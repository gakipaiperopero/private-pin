let urlMap = new WeakMap()

export function getMediaUrl(item) {
  if (item instanceof Blob) {
    if (!urlMap.has(item)) {
      urlMap.set(item, URL.createObjectURL(item))
    }
    return urlMap.get(item)
  }
  return item || ''
}

export function revokeMedia(item) {
  if (item instanceof Blob && urlMap.has(item)) {
    URL.revokeObjectURL(urlMap.get(item))
    urlMap.delete(item)
  }
}
