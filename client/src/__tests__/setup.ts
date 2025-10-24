/**
 * Vitest Setup - Global test configuration for React components
 */

import { beforeAll, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Global test setup
beforeAll(() => {
  // Mock WebSocket globally
  global.WebSocket = vi.fn(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1, // OPEN
  })) as any

  // Mock fetch API
  global.fetch = vi.fn()

  // Mock window.matchMedia for responsive components
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
})

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Test utilities for React components
export const mockWebSocketManager = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  getConnectionStatus: vi.fn(() => 'connected'),
}

// Mock conversation store
export const mockConversationStore = {
  messages: [],
  isConnected: true,
  currentPhase: 'discovery',
  sessionId: 'test-session-123',
  addMessage: vi.fn(),
  updatePhase: vi.fn(),
  setConnectionStatus: vi.fn(),
  clearConversation: vi.fn(),
}

// Test data generators for components
export const componentTestData = {
  createMessage: (overrides: any = {}) => ({
    id: `msg-${Date.now()}`,
    role: 'user' as const,
    content: 'Test message content',
    timestamp: new Date(),
    ...overrides
  }),

  createOKRSet: (overrides: any = {}) => ({
    id: `okr-${Date.now()}`,
    objective: {
      id: 'obj-1',
      text: 'Increase user engagement by improving product features',
      qualityScore: 75,
      feedback: [],
      versions: []
    },
    keyResults: [
      {
        id: 'kr-1',
        text: 'Increase daily active users from 10K to 15K',
        qualityScore: 85,
        feedback: [],
        isQuantified: true,
        baseline: '10K',
        target: '15K',
        metric: 'DAU'
      }
    ],
    overallScore: 80,
    createdAt: new Date(),
    ...overrides
  }),

  createKnowledgeSuggestion: (overrides: any = {}) => ({
    id: `suggestion-${Date.now()}`,
    type: 'example' as const,
    title: 'Sample Suggestion',
    content: 'This is a test knowledge suggestion',
    explanation: 'This helps improve your OKR quality',
    relevance: 0.8,
    ...overrides
  })
}

// Performance testing utilities for components
export const componentPerformanceUtils = {
  measureRenderTime: async (renderFn: () => void): Promise<number> => {
    const start = performance.now()
    renderFn()
    // Allow for React reconciliation
    await new Promise(resolve => setTimeout(resolve, 0))
    return performance.now() - start
  },

  expectFastRender: (renderTime: number, componentName: string) => {
    const threshold = 100 // 100ms threshold for component rendering
    if (renderTime > threshold) {
      console.warn(`⚠️  Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`)
    }
    expect(renderTime).toBeLessThan(threshold * 2) // Allow buffer for CI
  }
}

// Accessibility testing utilities
export const a11yTestUtils = {
  checkBasicA11y: (container: HTMLElement) => {
    // Check for basic accessibility requirements
    const buttons = container.querySelectorAll('button')
    const links = container.querySelectorAll('a')
    const inputs = container.querySelectorAll('input, textarea, select')

    // All interactive elements should have accessible names
    buttons.forEach(button => {
      expect(
        button.getAttribute('aria-label') ||
        button.textContent?.trim() ||
        button.getAttribute('title')
      ).toBeTruthy()
    })

    // All form inputs should have labels or aria-labels
    inputs.forEach(input => {
      expect(
        input.getAttribute('aria-label') ||
        input.getAttribute('aria-labelledby') ||
        container.querySelector(`label[for="${input.id}"]`)
      ).toBeTruthy()
    })
  }
}