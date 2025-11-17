import { useNuxtApp } from '../nuxt'
import type { NuxtApp } from '../nuxt'

/**
 * Cache revalidation options similar to Next.js
 */
export interface CacheOptions {
  /**
   * Time in seconds after which the cache should be revalidated
   * Similar to Next.js revalidate option
   */
  revalidate?: number | false
  /**
   * Cache tags for granular cache invalidation
   * Similar to Next.js cache tags
   */
  tags?: string[]
  /**
   * Cache behavior
   * - 'force-cache': Always use cache, fetch if not available
   * - 'no-store': Never cache, always fetch fresh
   * - 'default': Use cache if available and not stale
   */
  cache?: 'force-cache' | 'no-store' | 'default'
}

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  revalidate?: number | false
  tags?: string[]
}

interface CacheStore {
  entries: Map<string, CacheEntry>
  tagIndex: Map<string, Set<string>>
}

/**
 * Get the cache store from Nuxt app
 */
function getCacheStore(nuxtApp: NuxtApp): CacheStore {
  if (!nuxtApp._cacheStore) {
    nuxtApp._cacheStore = {
      entries: new Map(),
      tagIndex: new Map(),
    }
  }
  return nuxtApp._cacheStore
}

/**
 * Check if a cache entry is stale based on revalidation time
 */
function isCacheStale(entry: CacheEntry): boolean {
  if (typeof entry.revalidate !== 'number') {
    return false
  }
  const now = Date.now()
  const age = (now - entry.timestamp) / 1000 // age in seconds
  return age > entry.revalidate
}

/**
 * Get cached data with revalidation support
 * @param key - Cache key
 * @param nuxtApp - Nuxt app instance
 * @returns Cached data if available and not stale, undefined otherwise
 */
export function getCachedData<T = any>(key: string, nuxtApp: NuxtApp = useNuxtApp()): T | undefined {
  const store = getCacheStore(nuxtApp)
  const entry = store.entries.get(key)

  if (!entry) {
    return undefined
  }

  if (isCacheStale(entry)) {
    return undefined
  }

  return entry.data as T
}

/**
 * Set cached data with options
 * @param key - Cache key
 * @param data - Data to cache
 * @param options - Cache options
 * @param nuxtApp - Nuxt app instance
 */
export function setCachedData<T = any>(
  key: string,
  data: T,
  options: CacheOptions = {},
  nuxtApp: NuxtApp = useNuxtApp(),
): void {
  const store = getCacheStore(nuxtApp)

  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    revalidate: options.revalidate,
    tags: options.tags,
  }

  store.entries.set(key, entry)

  // Update tag index
  if (options.tags) {
    for (const tag of options.tags) {
      if (!store.tagIndex.has(tag)) {
        store.tagIndex.set(tag, new Set())
      }
      store.tagIndex.get(tag)!.add(key)
    }
  }
}

/**
 * Revalidate cache by tag
 * Invalidates all cache entries associated with the given tag
 * @param tag - Cache tag to revalidate
 * @param nuxtApp - Nuxt app instance
 */
export function revalidateTag(tag: string, nuxtApp: NuxtApp = useNuxtApp()): void {
  const store = getCacheStore(nuxtApp)
  const keys = store.tagIndex.get(tag)

  if (!keys) {
    return
  }

  // Remove all entries with this tag
  for (const key of keys) {
    store.entries.delete(key)
  }

  // Clear the tag index
  store.tagIndex.delete(tag)

  // Remove this tag from other entries
  for (const [entryKey, entry] of store.entries) {
    if (entry.tags?.includes(tag)) {
      entry.tags = entry.tags.filter(t => t !== tag)
      if (entry.tags.length === 0) {
        delete entry.tags
      }
    }
  }
}

/**
 * Revalidate cache by path pattern
 * Invalidates all cache entries whose keys match the given path pattern
 * @param path - Path pattern to match (supports wildcards with *)
 * @param nuxtApp - Nuxt app instance
 */
export function revalidatePath(path: string, nuxtApp: NuxtApp = useNuxtApp()): void {
  const store = getCacheStore(nuxtApp)
  const pattern = path.replace(/\*/g, '.*')
  const regex = new RegExp(`^${pattern}$`)

  const keysToDelete: string[] = []

  for (const [key] of store.entries) {
    if (regex.test(key)) {
      keysToDelete.push(key)
    }
  }

  for (const key of keysToDelete) {
    const entry = store.entries.get(key)
    store.entries.delete(key)

    // Clean up tag index
    if (entry?.tags) {
      for (const tag of entry.tags) {
        store.tagIndex.get(tag)?.delete(key)
        if (store.tagIndex.get(tag)?.size === 0) {
          store.tagIndex.delete(tag)
        }
      }
    }
  }
}

/**
 * Clear all cache entries
 * @param nuxtApp - Nuxt app instance
 */
export function clearCache(nuxtApp: NuxtApp = useNuxtApp()): void {
  const store = getCacheStore(nuxtApp)
  store.entries.clear()
  store.tagIndex.clear()
}

/**
 * Get all cache keys
 * @param nuxtApp - Nuxt app instance
 * @returns Array of all cache keys
 */
export function getCacheKeys(nuxtApp: NuxtApp = useNuxtApp()): string[] {
  const store = getCacheStore(nuxtApp)
  return Array.from(store.entries.keys())
}

/**
 * Get all cache tags
 * @param nuxtApp - Nuxt app instance
 * @returns Array of all cache tags
 */
export function getCacheTags(nuxtApp: NuxtApp = useNuxtApp()): string[] {
  const store = getCacheStore(nuxtApp)
  return Array.from(store.tagIndex.keys())
}

/**
 * Get cache entry with metadata
 * @param key - Cache key
 * @param nuxtApp - Nuxt app instance
 * @returns Cache entry with metadata or undefined
 */
export function getCacheEntry<T = any>(key: string, nuxtApp: NuxtApp = useNuxtApp()): CacheEntry<T> | undefined {
  const store = getCacheStore(nuxtApp)
  return store.entries.get(key) as CacheEntry<T> | undefined
}
