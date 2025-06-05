import { computed, ref, readonly } from 'vue'
import type { Week } from '@/types'
import { useFetch } from '@/composables/useFetch'
import { defineStore } from 'pinia'

// Factory
export const useWeekStore = defineStore('weekStore', () => {
  // State
  const weeks = ref<Week[]>([])
  const weekIsLoading = ref(false)
  const weekError = ref<string | null>(null)

  // Getters
  const numberOfWeeks = computed(() => {
    return weeks.value.length
  })

  // Actions
  async function fetchWeeks() {
    weekIsLoading.value = true
    weekError.value = null

    try {
      const response = await useFetch('/weeks')
      weeks.value = response

      return response
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
    weeks,
    weekIsLoading,
    weekError,
    // Getters
    numberOfWeeks,
    // Actions
    fetchWeeks,
  }
})

/**
 *  Factory - Generated unique state
export
 * */
function generateWeeks() {
  const newWeeks = ref<Week[]>([])

  return newWeeks
}
