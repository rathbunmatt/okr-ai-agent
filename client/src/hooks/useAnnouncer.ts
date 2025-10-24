import { useCallback } from 'react'

/**
 * Custom hook for screen reader announcements
 * Provides polite and assertive announcement capabilities
 */
export function useAnnouncer() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Create a temporary element for the announcement
    const announcer = document.createElement('div')
    announcer.setAttribute('aria-live', priority)
    announcer.setAttribute('aria-atomic', 'true')
    announcer.setAttribute('class', 'sr-only')

    document.body.appendChild(announcer)

    // Add the message
    announcer.textContent = message

    // Clean up after announcement
    setTimeout(() => {
      document.body.removeChild(announcer)
    }, 1000)
  }, [])

  return { announce }
}