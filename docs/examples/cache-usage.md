# Next.js-style Caching in Nuxt

This example demonstrates the new Next.js-style caching functionality in Nuxt.

## Features

### 1. Time-based Revalidation

Cache data with automatic revalidation after a specified time:

```vue
<script setup lang="ts">
// Cache for 60 seconds
const { data } = await useFetch('/api/data', {
  revalidate: 60
})

// Or with useAsyncData
const { data: posts } = await useAsyncData('posts', 
  () => $fetch('/api/posts'),
  { revalidate: 300 } // 5 minutes
)
</script>
```

### 2. Cache Tags

Tag your cached data for granular invalidation:

```vue
<script setup lang="ts">
// Tag the cached data
const { data: user } = await useFetch('/api/user', {
  revalidate: 60,
  tags: ['user', 'profile']
})

// Invalidate all data with the 'user' tag
function updateUser() {
  // After updating user data
  revalidateTag('user')
}
</script>
```

### 3. Path-based Revalidation

Invalidate cache by path patterns:

```vue
<script setup lang="ts">
// Clear all user-related cache
function clearUserCache() {
  revalidatePath('/api/user*')
}

// Clear specific path
function clearPostCache(id: number) {
  revalidatePath(`/api/posts/${id}`)
}
</script>
```

### 4. Cache Strategy

Control caching behavior:

```vue
<script setup lang="ts">
// Always fetch fresh data
const { data: realtime } = await useFetch('/api/realtime', {
  cacheStrategy: 'no-store'
})

// Always use cache if available
const { data: static } = await useFetch('/api/static', {
  cacheStrategy: 'force-cache',
  revalidate: false
})

// Default behavior (use cache if not stale)
const { data: normal } = await useFetch('/api/data', {
  cacheStrategy: 'default',
  revalidate: 60
})
</script>
```

## Server-side Usage

For server routes, you can use the server-side utilities:

```ts
// server/api/revalidate.post.ts
export default defineEventHandler(async (event) => {
  const { tag } = await readBody(event)
  
  // Revalidate by tag
  await revalidateTagServer(event, tag)
  
  return { success: true }
})
```

```ts
// server/api/data.get.ts
export default defineEventHandler((event) => {
  // Set cache headers
  setCacheHeaders(event, {
    maxAge: 60,
    staleWhileRevalidate: 300
  })
  
  return { data: 'cached data' }
})
```

## Manual Cache Management

You can also manually manage the cache:

```vue
<script setup lang="ts">
// Set cache data
setCachedData('my-key', { value: 'data' }, {
  revalidate: 60,
  tags: ['my-tag']
})

// Get cache data
const cachedData = getCachedData('my-key')

// Get cache entry with metadata
const entry = getCacheEntry('my-key')
console.log(entry?.timestamp, entry?.revalidate)

// Clear all cache
clearCache()

// Get all cache keys
const keys = getCacheKeys()

// Get all cache tags
const tags = getCacheTags()
</script>
```

## Complete Example

```vue
<script setup lang="ts">
// Fetch posts with caching
const { data: posts, refresh } = await useFetch('/api/posts', {
  revalidate: 60, // Cache for 60 seconds
  tags: ['posts'], // Tag for invalidation
  cacheStrategy: 'default'
})

// Create a new post
async function createPost(post: any) {
  await $fetch('/api/posts', {
    method: 'POST',
    body: post
  })
  
  // Invalidate the posts cache
  revalidateTag('posts')
  
  // Refresh the data
  await refresh()
}

// Delete a post
async function deletePost(id: number) {
  await $fetch(`/api/posts/${id}`, {
    method: 'DELETE'
  })
  
  // Invalidate by path pattern
  revalidatePath('/api/posts*')
  
  await refresh()
}
</script>

<template>
  <div>
    <h1>Posts</h1>
    <ul>
      <li v-for="post in posts" :key="post.id">
        {{ post.title }}
        <button @click="deletePost(post.id)">Delete</button>
      </li>
    </ul>
  </div>
</template>
```

## Comparison with Next.js

| Next.js | Nuxt (with this feature) |
|---------|---------------------------|
| `fetch('/api/data', { next: { revalidate: 60 } })` | `useFetch('/api/data', { revalidate: 60 })` |
| `fetch('/api/data', { next: { tags: ['posts'] } })` | `useFetch('/api/data', { tags: ['posts'] })` |
| `revalidateTag('posts')` | `revalidateTag('posts')` |
| `revalidatePath('/posts')` | `revalidatePath('/posts')` |
| `fetch('/api/data', { cache: 'no-store' })` | `useFetch('/api/data', { cacheStrategy: 'no-store' })` |

## Benefits

1. **Performance**: Reduce unnecessary API calls with intelligent caching
2. **Flexibility**: Fine-grained control over cache invalidation
3. **Simplicity**: Familiar API for developers coming from Next.js
4. **Type-safe**: Full TypeScript support
5. **Automatic**: Works seamlessly with existing `useFetch` and `useAsyncData`
