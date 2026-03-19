<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import BaseModal from './BaseModal.vue'

import { useTimeEntryStore } from '../stores/timeEntryStore'
import type { TimeEntry } from '../types'
import BaseTextArea from './BaseTextArea.vue'

// Define props and emits
interface Props {
  isOpen: boolean
  taskId: string
  timeEntry?: TimeEntry | null // TimeEntry to edit (null/undefined for create mode)
}

interface TimeEntryFormData {
  startTime: string
  endTime: string
  minutes: number
  notes: string
  isManual: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  timeEntryCreated: []
  timeEntryUpdated: []
}>()

// Use the time entries store
const timeEntryStore = useTimeEntryStore()

// Form data
const timeEntryForm = ref<TimeEntryFormData>({
  startTime: '',
  endTime: '',
  minutes: 30,
  notes: '',
  isManual: true,
})

// Check if we're in edit mode
const isEditMode = computed(() => !!props.timeEntry)

// Modal title
const modalTitle = computed(() => (isEditMode.value ? 'Edit Time Entry' : 'Add Time Entry'))

// Form validation
const isFormValid = computed(() => {
  if (timeEntryForm.value.isManual) {
    return timeEntryForm.value.minutes > 0 && timeEntryForm.value.startTime
  } else {
    return timeEntryForm.value.startTime && timeEntryForm.value.endTime
  }
})

// Calculate minutes from start and end time
const calculateMinutes = () => {
  if (!timeEntryForm.value.startTime || !timeEntryForm.value.endTime) return 0

  const start = new Date(timeEntryForm.value.startTime)
  const end = new Date(timeEntryForm.value.endTime)

  if (end <= start) return 0

  return Math.round((end.getTime() - start.getTime()) / (1000 * 60))
}

// Watch for time changes to auto-calculate minutes
watch([() => timeEntryForm.value.startTime, () => timeEntryForm.value.endTime], () => {
  if (!timeEntryForm.value.isManual) {
    timeEntryForm.value.minutes = calculateMinutes()
  }
})

// Watch manual toggle to set appropriate defaults
watch(
  () => timeEntryForm.value.isManual,
  (isManual) => {
    if (isManual) {
      // Set to current date/time for manual entry
      const now = new Date()
      timeEntryForm.value.startTime = now.toISOString().slice(0, 16)
      timeEntryForm.value.endTime = ''
    } else {
      // Set reasonable defaults for time range
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      timeEntryForm.value.startTime = oneHourAgo.toISOString().slice(0, 16)
      timeEntryForm.value.endTime = now.toISOString().slice(0, 16)
      timeEntryForm.value.minutes = 60
    }
  },
)

// Format minutes to hours and minutes
const formatTime = (minutes: number) => {
  if (minutes === 0) return '0 min'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}min`
}

// Initialize form data
const initializeForm = () => {
  if (isEditMode.value && props.timeEntry) {
    // Pre-fill form with existing time entry data
    const entry = props.timeEntry
    timeEntryForm.value = {
      startTime: entry.startTime.slice(0, 16), // Format for datetime-local input
      endTime: entry.endTime ? entry.endTime.slice(0, 16) : '',
      minutes: entry.minutes,
      notes: entry.notes || '',
      isManual: entry.isManual,
    }
  } else {
    // Initialize with defaults for new time entry
    const now = new Date()
    timeEntryForm.value = {
      startTime: now.toISOString().slice(0, 16),
      endTime: '',
      minutes: 30,
      notes: '',
      isManual: true,
    }
  }
}

// Create or update time entry using store
const saveTimeEntry = async () => {
  if (!isFormValid.value) return

  try {
    const entryData = {
      taskId: props.taskId,
      startTime: new Date(timeEntryForm.value.startTime).toISOString(),
      endTime: timeEntryForm.value.endTime
        ? new Date(timeEntryForm.value.endTime).toISOString()
        : undefined,
      minutes: timeEntryForm.value.isManual ? timeEntryForm.value.minutes : calculateMinutes(),
      isManual: timeEntryForm.value.isManual,
      notes: timeEntryForm.value.notes.trim() || undefined,
    }

    if (isEditMode.value && props.timeEntry) {
      // Update existing time entry
      await timeEntryStore.updateTimeEntry(props.timeEntry.id, entryData)
      emit('timeEntryUpdated')
    } else {
      // Create new time entry
      await timeEntryStore.createTimeEntry(entryData)
      emit('timeEntryCreated')
    }

    closeModal()
  } catch (error) {
    console.error('Failed to save time entry:', error)
    // Error handling is managed by the store
  }
}

// Close modal
const closeModal = () => {
  emit('close')
}

// Watch for modal opening to initialize form
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      initializeForm()
    }
  },
)
</script>

<template>
  <BaseModal
    :is-open="isOpen"
    :title="modalTitle"
    max-width="lg"
    :is-loading="timeEntryStore.isLoading"
    @close="closeModal"
  >
    <!-- Form -->
    <form @submit.prevent="saveTimeEntry" class="space-y-6">
      <!-- Entry Type -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">Entry Type</span>
        </label>
        <div class="flex gap-4">
          <label class="label cursor-pointer gap-2">
            <input
              v-model="timeEntryForm.isManual"
              type="radio"
              :value="true"
              class="radio radio-primary"
              :disabled="timeEntryStore.isLoading"
            />
            <span class="label-text">Manual Entry</span>
          </label>
          <label class="label cursor-pointer gap-2">
            <input
              v-model="timeEntryForm.isManual"
              type="radio"
              :value="false"
              class="radio radio-primary"
              :disabled="timeEntryStore.isLoading"
            />
            <span class="label-text">Time Range</span>
          </label>
        </div>
      </div>

      <!-- Start Time -->
      <div class="form-control">
        <label class="label" for="start-time">
          <span class="label-text font-medium">Start Time *</span>
        </label>
        <input
          id="start-time"
          v-model="timeEntryForm.startTime"
          class="input input-bordered w-full"
          type="datetime-local"
          :disabled="timeEntryStore.isLoading"
          required
        />
      </div>

      <!-- End Time (only for time range) -->
      <div v-if="!timeEntryForm.isManual" class="form-control">
        <label class="label" for="end-time">
          <span class="label-text font-medium">End Time *</span>
        </label>
        <input
          id="end-time"
          v-model="timeEntryForm.endTime"
          class="input input-bordered w-full"
          type="datetime-local"
          :disabled="timeEntryStore.isLoading"
          :min="timeEntryForm.startTime"
          required
        />
      </div>

      <!-- Minutes (manual entry or calculated display) -->
      <div class="form-control">
        <label class="label" for="minutes">
          <span class="label-text font-medium">
            {{ timeEntryForm.isManual ? 'Duration (minutes) *' : 'Calculated Duration' }}
          </span>
        </label>
        <div class="flex items-center gap-4">
          <input
            id="minutes"
            v-model.number="timeEntryForm.minutes"
            class="input input-bordered flex-1"
            type="number"
            :disabled="timeEntryStore.isLoading || !timeEntryForm.isManual"
            :required="timeEntryForm.isManual"
          />
          <div class="badge badge-info">{{ formatTime(timeEntryForm.minutes) }}</div>
        </div>
      </div>

      <!-- Notes -->
      <BaseTextArea
        id="notes"
        label="Notes"
        v-model="timeEntryForm.notes"
        class="textarea textarea-bordered w-full"
        placeholder="Add any notes about this time entry..."
        :disabled="timeEntryStore.isLoading"
      />
    </form>

    <!-- Actions -->
    <template #actions>
      <button
        type="button"
        @click="closeModal"
        class="btn btn-outline"
        :disabled="timeEntryStore.isLoading"
      >
        Cancel
      </button>
      <button
        type="submit"
        @click="saveTimeEntry"
        class="btn btn-primary"
        :disabled="!isFormValid || timeEntryStore.isLoading"
      >
        <Icon
          v-if="timeEntryStore.isLoading"
          icon="lucide:loader-2"
          width="16"
          height="16"
          class="animate-spin"
        />
        <Icon v-else :icon="isEditMode ? 'lucide:save' : 'lucide:plus'" width="16" height="16" />
        {{
          timeEntryStore.isLoading
            ? isEditMode
              ? 'Updating...'
              : 'Creating...'
            : isEditMode
              ? 'Update Entry'
              : 'Add Entry'
        }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
/* Using DaisyUI modal system - no custom styles needed */
</style>
