import { computed, ref, readonly } from 'vue'
import type { Week } from '@/types'

const API_BASE_URL = 'http://localhost:3000'

// Singleton - Shared state
export const weeks = ref<Week[]>([])
const weekIsLoading = ref(false)
const weekError = ref<string | null>(null)

// Factory
export function useWeekStore() {
  // Getters
  const numberOfWeeks = computed(() => {
    return weeks.value.length
  })

  // Actions
  async function fetchWeeks() {
    weekIsLoading.value = true
    weekError.value = null

    try {
      const response = await fetch(`${API_BASE_URL}/weeks`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const fetchedWeeks: Week[] = await response.json()
      weeks.value = fetchedWeeks

      return fetchedWeeks
    } catch (err) {
      weekError.value = err instanceof Error ? err.message : 'Failed to fetch weeks'
      console.error('Error fetching weeks:', err)
      throw err
    } finally {
      weekIsLoading.value = false
    }
  }

  return {
    // State
    weekIsLoading: readonly(weekIsLoading),
    weekError: readonly(weekError),
    // Getters
    numberOfWeeks,
    // Actions
    fetchWeeks,
  }
}

// Factory - Generated unique state
export function generateWeeks() {
  const newWeeks = ref<Week[]>([])

  return newWeeks
}
