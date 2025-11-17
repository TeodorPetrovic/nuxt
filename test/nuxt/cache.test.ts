/// <reference path="../fixtures/basic/.nuxt/nuxt.d.ts" />

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineEventHandler } from 'h3'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'

import { useAsyncData } from '#app/composables/asyncData'
import { 
  getCachedData, 
  setCachedData, 
  revalidateTag, 
  revalidatePath, 
  clearCache,
  getCacheKeys,
  getCacheTags,
  getCacheEntry,
} from '#app/composables/cache'
import { useNuxtApp } from '#app/nuxt'

registerEndpoint('/api/cache-test', defineEventHandler(() => ({
  data: 'test-data',
  timestamp: Date.now(),
})))

describe('cache composables', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearCache()
  })

  describe('basic cache operations', () => {
    it('should set and get cached data', () => {
      const key = 'test-key'
      const data = { value: 'test' }

      setCachedData(key, data)
      const cached = getCachedData(key)

      expect(cached).toEqual(data)
    })

    it('should return undefined for non-existent keys', () => {
      const cached = getCachedData('non-existent')
      expect(cached).toBeUndefined()
    })

    it('should clear all cache', () => {
      setCachedData('key1', 'value1')
      setCachedData('key2', 'value2')

      clearCache()

      expect(getCachedData('key1')).toBeUndefined()
      expect(getCachedData('key2')).toBeUndefined()
    })

    it('should get all cache keys', () => {
      setCachedData('key1', 'value1')
      setCachedData('key2', 'value2')

      const keys = getCacheKeys()
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys.length).toBe(2)
    })
  })

  describe('cache with revalidation', () => {
    it('should respect revalidate time', async () => {
      const key = 'revalidate-test'
      const data = { value: 'test' }

      // Set cache with 1 second revalidation
      setCachedData(key, data, { revalidate: 1 })

      // Should get cached data immediately
      expect(getCachedData(key)).toEqual(data)

      // Wait for revalidation time to pass
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Should return undefined after revalidation time
      expect(getCachedData(key)).toBeUndefined()
    })

    it('should not revalidate when revalidate is false', async () => {
      const key = 'no-revalidate-test'
      const data = { value: 'test' }

      setCachedData(key, data, { revalidate: false })

      // Wait some time
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should still have cached data
      expect(getCachedData(key)).toEqual(data)
    })
  })

  describe('cache with tags', () => {
    it('should set and retrieve cache tags', () => {
      setCachedData('key1', 'value1', { tags: ['tag1', 'tag2'] })
      setCachedData('key2', 'value2', { tags: ['tag2', 'tag3'] })

      const tags = getCacheTags()
      expect(tags).toContain('tag1')
      expect(tags).toContain('tag2')
      expect(tags).toContain('tag3')
    })

    it('should revalidate by tag', () => {
      setCachedData('key1', 'value1', { tags: ['tag1'] })
      setCachedData('key2', 'value2', { tags: ['tag2'] })
      setCachedData('key3', 'value3', { tags: ['tag1', 'tag2'] })

      revalidateTag('tag1')

      // key1 and key3 should be removed
      expect(getCachedData('key1')).toBeUndefined()
      expect(getCachedData('key3')).toBeUndefined()
      // key2 should still exist
      expect(getCachedData('key2')).toBe('value2')
    })

    it('should handle multiple tag revalidations', () => {
      setCachedData('key1', 'value1', { tags: ['tag1', 'tag2'] })

      revalidateTag('tag1')
      expect(getCachedData('key1')).toBeUndefined()

      setCachedData('key1', 'value1', { tags: ['tag1', 'tag2'] })
      revalidateTag('tag2')
      expect(getCachedData('key1')).toBeUndefined()
    })
  })

  describe('cache with path revalidation', () => {
    it('should revalidate by exact path', () => {
      setCachedData('/api/users', 'users-data')
      setCachedData('/api/posts', 'posts-data')

      revalidatePath('/api/users')

      expect(getCachedData('/api/users')).toBeUndefined()
      expect(getCachedData('/api/posts')).toBe('posts-data')
    })

    it('should revalidate by path pattern with wildcard', () => {
      setCachedData('/api/users/1', 'user1')
      setCachedData('/api/users/2', 'user2')
      setCachedData('/api/posts/1', 'post1')

      revalidatePath('/api/users/*')

      expect(getCachedData('/api/users/1')).toBeUndefined()
      expect(getCachedData('/api/users/2')).toBeUndefined()
      expect(getCachedData('/api/posts/1')).toBe('post1')
    })

    it('should revalidate all with wildcard', () => {
      setCachedData('/api/users', 'users')
      setCachedData('/api/posts', 'posts')

      revalidatePath('*')

      expect(getCachedData('/api/users')).toBeUndefined()
      expect(getCachedData('/api/posts')).toBeUndefined()
    })
  })

  describe('cache entry metadata', () => {
    it('should retrieve cache entry with metadata', () => {
      const key = 'metadata-test'
      const data = { value: 'test' }
      const options = {
        revalidate: 60,
        tags: ['tag1', 'tag2'],
      }

      setCachedData(key, data, options)
      const entry = getCacheEntry(key)

      expect(entry).toBeDefined()
      expect(entry?.data).toEqual(data)
      expect(entry?.revalidate).toBe(60)
      expect(entry?.tags).toEqual(['tag1', 'tag2'])
      expect(entry?.timestamp).toBeDefined()
    })
  })

  describe('integration with useAsyncData', () => {
    it('should use cache with revalidate option', async () => {
      let callCount = 0
      const fetchFn = vi.fn(async () => {
        callCount++
        return { data: `call-${callCount}` }
      })

      // First call
      const { data: data1 } = await useAsyncData('cache-key', fetchFn, {
        revalidate: 60,
      })

      expect(data1.value).toEqual({ data: 'call-1' })
      expect(fetchFn).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const { data: data2 } = await useAsyncData('cache-key', fetchFn, {
        revalidate: 60,
      })

      expect(data2.value).toEqual({ data: 'call-1' })
      expect(fetchFn).toHaveBeenCalledTimes(1) // Should not call again
    })

    it('should support cache tags with useAsyncData', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }))

      await useAsyncData('tagged-key', fetchFn, {
        tags: ['test-tag'],
        revalidate: 60,
      })

      const tags = getCacheTags()
      expect(tags).toContain('test-tag')
    })

    it('should not cache with no-store strategy', async () => {
      let callCount = 0
      const fetchFn = vi.fn(async () => {
        callCount++
        return { data: `call-${callCount}` }
      })

      // First call
      const result1 = await useAsyncData('no-store-key', fetchFn, {
        cacheStrategy: 'no-store',
      })

      expect(fetchFn).toHaveBeenCalledTimes(1)

      // Clear the data to allow a fresh fetch
      result1.clear()

      // Second call should not use cache and should fetch again
      await useAsyncData('no-store-key', fetchFn, {
        cacheStrategy: 'no-store',
      })

      expect(fetchFn).toHaveBeenCalledTimes(2)
    })
  })
})
