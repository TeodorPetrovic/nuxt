/**
 * Server-side cache utilities
 * These functions are designed to work with Nitro's cache system
 */

import type { H3Event } from 'h3'

/**
 * Revalidate cache by tag on the server
 * This is a server-only function that works with Nitro's cache system
 * @param event - H3 event
 * @param tag - Cache tag to revalidate
 */
export async function revalidateTagServer(event: H3Event, tag: string): Promise<void> {
  if (import.meta.client) {
    throw new Error('[nuxt] revalidateTagServer can only be called on the server')
  }

  // Clear cache entries with this tag
  // This integrates with Nitro's cache system through the event context
  const nuxtApp = event.context.nuxt
  if (nuxtApp) {
    const { revalidateTag } = await import('./composables/cache')
    revalidateTag(tag, nuxtApp)
  }
}

/**
 * Revalidate cache by path on the server
 * This is a server-only function that works with Nitro's cache system
 * @param event - H3 event
 * @param path - Path pattern to revalidate
 */
export async function revalidatePathServer(event: H3Event, path: string): Promise<void> {
  if (import.meta.client) {
    throw new Error('[nuxt] revalidatePathServer can only be called on the server')
  }

  // Clear cache entries matching this path
  const nuxtApp = event.context.nuxt
  if (nuxtApp) {
    const { revalidatePath } = await import('./composables/cache')
    revalidatePath(path, nuxtApp)
  }
}

/**
 * Set cache headers for a response
 * @param event - H3 event
 * @param options - Cache options
 */
export function setCacheHeaders(
  event: H3Event,
  options: {
    maxAge?: number
    sMaxAge?: number
    staleWhileRevalidate?: number
    staleIfError?: number
    public?: boolean
  },
): void {
  const parts: string[] = []

  if (options.public !== false) {
    parts.push('public')
  } else {
    parts.push('private')
  }

  if (options.maxAge !== undefined) {
    parts.push(`max-age=${options.maxAge}`)
  }

  if (options.sMaxAge !== undefined) {
    parts.push(`s-maxage=${options.sMaxAge}`)
  }

  if (options.staleWhileRevalidate !== undefined) {
    parts.push(`stale-while-revalidate=${options.staleWhileRevalidate}`)
  }

  if (options.staleIfError !== undefined) {
    parts.push(`stale-if-error=${options.staleIfError}`)
  }

  event.node.res.setHeader('Cache-Control', parts.join(', '))
}
