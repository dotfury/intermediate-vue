<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import BaseModal from './BaseModal.vue'
import type { Week } from '../types'

// API base URL
const API_BASE_URL = 'http://localhost:3000'

// Define props
interface Props {
  week?: Week | null
}

interface WeekFormData {
  startDate: string
  description: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  weekCreated: []
  weekUpdated: []
}>()

// Internal modal state
const isOpen = ref(false)
const isLoading = ref(false)
const currentWeekForEditing = ref<Week | null>(null)

// Form data
const weekForm = ref<WeekFormData>({
  startDate: '',
  description: '',
})

// Computed end date (automatically calculated)
const endDate = computed(() => {
  if (!weekForm.value.startDate) return ''
  const start = new Date(weekForm.value.startDate)
  const end = new Date(start)
  end.setDate(start.getDate() + 6) // Week is 7 days, so add 6
  return end.toISOString().split('T')[0]
})

// Check if we're in edit mode
const isEditMode = computed(() => !!currentWeekForEditing.value)

// Modal title
const modalTitle = computed(() => (isEditMode.value ? 'Edit Week' : 'Create New Week'))

// Form validation
const isFormValid = computed(() => {
  return (
    weekForm.value.startDate &&
    endDate.value &&
    new Date(weekForm.value.startDate) <= new Date(endDate.value)
  )
})

// Generate week ID based on start date
const generateWeekId = (startDate: string) => {
  const date = new Date(startDate)
  const year = date.getFullYear()
  const weekNumber = getWeekNumber(date)
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`
}

// Get week number of the year
const getWeekNumber = (date: Date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

// Create week
const createWeek = async (
  weekData: Omit<
    Week,
    | 'id'
    | 'isCurrentWeek'
    | 'totalPlannedMinutes'
    | 'totalActualMinutes'
    | 'createdAt'
    | 'updatedAt'
  >,
) => {
  try {
    const newWeek: Week = {
      ...weekData,
      id: generateWeekId(weekData.startDate),
      isCurrentWeek: false, // Backend will determine this
      totalPlannedMinutes: 0,
      totalActualMinutes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const response = await fetch(`${API_BASE_URL}/weeks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newWeek),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const createdWeek: Week = await response.json()
    return createdWeek
  } catch (err) {
    console.error('Error creating week:', err)
    throw err
  }
}

// Update week
const updateWeek = async (
  weekId: string,
  updates: Partial<Omit<Week, 'id' | 'totalPlannedMinutes' | 'totalActualMinutes' | 'createdAt'>>,
) => {
  try {
    const updatedWeekData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    const response = await fetch(`${API_BASE_URL}/weeks/${weekId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedWeekData),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const serverWeek: Week = await response.json()
    return serverWeek
  } catch (err) {
    console.error('Error updating week:', err)
    throw err
  }
}

// Initialize form with week data or defaults
const initializeForm = () => {
  if (isEditMode.value && currentWeekForEditing.value) {
    // Pre-fill form with existing week data
    weekForm.value = {
      startDate: currentWeekForEditing.value.startDate,
      description: currentWeekForEditing.value.description || '',
    }
  } else {
    // Initialize with defaults for new week (start of current week)
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay()) // Start of current week (Sunday)

    weekForm.value = {
      startDate: startOfWeek.toISOString().split('T')[0],
      description: '',
    }
  }
}

// Create or update week
const saveWeek = async () => {
  if (!isFormValid.value) return

  isLoading.value = true
  try {
    if (isEditMode.value && currentWeekForEditing.value) {
      // Update existing week
      await updateWeek(currentWeekForEditing.value.id, {
        startDate: weekForm.value.startDate,
        endDate: endDate.value,
        description: weekForm.value.description.trim() || undefined,
      })
      emit('weekUpdated')
    } else {
      // Create new week
      await createWeek({
        startDate: weekForm.value.startDate,
        endDate: endDate.value,
        description: weekForm.value.description.trim() || undefined,
      })
      emit('weekCreated')
    }

    close()
  } catch (error) {
    console.error('Failed to save week:', error)
  } finally {
    isLoading.value = false
  }
}

// Close modal
const close = () => {
  isOpen.value = false
  currentWeekForEditing.value = null // Reset edit state
}

// Open modal for creating new week
const open = () => {
  currentWeekForEditing.value = null
  isOpen.value = true
}

// Open modal for editing existing week
const openForEdit = (week: Week) => {
  currentWeekForEditing.value = week
  isOpen.value = true
}

// Format date for display
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

// Watch for modal opening to initialize form
watch(
  () => isOpen.value,
  (openState) => {
    if (openState) {
      initializeForm()
    }
  },
)

// Expose methods for parent components
defineExpose({
  open,
  openForEdit,
  close,
})
</script>

<template>
  <BaseModal
    :is-open="isOpen"
    :title="modalTitle"
    max-width="lg"
    :is-loading="isLoading"
    @close="close"
  >
    <template #header-icon>
      <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon icon="lucide:calendar" width="24" height="24" class="text-primary" />
      </div>
    </template>

    <!-- Form -->
    <form @submit.prevent="saveWeek" class="space-y-6">
      <!-- Start Date -->
      <div class="form-control">
        <label class="label" for="start-date">
          <span class="label-text font-medium">Week Start Date *</span>
        </label>
        <input
          id="start-date"
          v-model="weekForm.startDate"
          class="input input-bordered w-full"
          type="date"
          :disabled="isLoading"
          required
        />
        <div class="label">
          <span class="label-text-alt text-base-content/60">
            Week will run from {{ formatDate(weekForm.startDate) }} to {{ formatDate(endDate) }}
          </span>
        </div>
      </div>

      <!-- Preview Week ID -->
      <div v-if="weekForm.startDate" class="alert alert-info">
        <Icon icon="lucide:info" width="20" height="20" />
        <span>
          Week ID will be: <strong>{{ generateWeekId(weekForm.startDate) }}</strong>
          <br />
          Date range: {{ formatDate(weekForm.startDate) }} - {{ formatDate(endDate) }}
        </span>
      </div>

      <!-- Description -->
      <BaseTextArea
        id="week-description"
        label="Week Description"
        v-model="weekForm.description"
        class="textarea textarea-bordered w-full"
        placeholder="Add goals, notes, or themes for this week..."
        :disabled="isLoading"
      />
    </form>

    <template #actions>
      <button type="button" @click="close" class="btn btn-outline" :disabled="isLoading">
        Cancel
      </button>
      <button
        type="submit"
        @click="saveWeek"
        class="btn btn-primary"
        :disabled="!isFormValid || isLoading"
      >
        <Icon v-if="isLoading" icon="lucide:loader-2" width="16" height="16" class="animate-spin" />
        <Icon v-else :icon="isEditMode ? 'lucide:save' : 'lucide:plus'" width="16" height="16" />
        {{
          isLoading
            ? isEditMode
              ? 'Updating...'
              : 'Creating...'
            : isEditMode
              ? 'Update Week'
              : 'Create Week'
        }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
/* Using DaisyUI modal system - no custom styles needed */
</style>
