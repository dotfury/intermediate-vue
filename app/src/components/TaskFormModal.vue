<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PropType } from 'vue'
import { Icon } from '@iconify/vue'
import { useTaskStore } from '@/stores/taskStore'
import BaseModal from './BaseModal.vue'

import type { Task, TaskStatus, TaskArea, Week } from '../types'
import { onMounted } from 'vue'
import BaseTextArea from './BaseTextArea.vue'

interface TaskFormData {
  title: string
  description: string
  weekId: string
  areas: TaskArea[]
  estimatedMinutes: number
  status: TaskStatus
}

const props = defineProps({
  task: Object as PropType<Task> | undefined,
})

// Use centralized task store
const taskStore = useTaskStore()

// Internal modal state
const isOpen = ref(false)
const isLoading = ref(false)

// API base URL for week operations
const API_BASE_URL = 'http://localhost:3000'

// Error state
const error = ref<string | null>(null)

// Task actions - delegate to store
const createTask = async (
  taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'actualMinutes'>,
) => {
  isLoading.value = true
  error.value = null

  try {
    const createdTask = await taskStore.createTask(taskData)
    return createdTask
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create task'
    console.error('Error creating task:', err)
    throw err
  } finally {
    isLoading.value = false
  }
}

const updateTask = async (taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
  isLoading.value = true
  error.value = null

  try {
    const updatedTask = await taskStore.updateTask(taskId, updates)
    return updatedTask
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update task'
    console.error('Error updating task:', err)
    throw err
  } finally {
    isLoading.value = false
  }
}

// Week management logic (simple local state without caching)
const weeks = ref<Week[]>([])
const weekIsLoading = ref(false)
const weekError = ref<string | null>(null)

// Computed properties
const currentWeek = computed(() => {
  return weeks.value.find((week) => week.isCurrentWeek) || null
})

// Week actions
const fetchWeeks = async () => {
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

const getWeekById = (weekId: string) => {
  return weeks.value.find((week) => week.id === weekId) || null
}

// Form data
const taskForm = ref<TaskFormData>({
  title: '',
  description: '',
  weekId: '',
  areas: [],
  estimatedMinutes: 60,
  status: 'not_started',
})

// Predefined areas for the form
const availableAreas: TaskArea[] = ['work', 'personal', 'learning', 'health', 'social', 'creative']

// Check if we're in edit mode
const isEditMode = computed(() => !!props.task)

// Modal title
const modalTitle = computed(() => (isEditMode.value ? 'Edit Task' : 'Create New Task'))

// Initialize form with current week or task data
const initializeForm = () => {
  if (isEditMode.value && props.task) {
    // Pre-fill form with existing task data
    taskForm.value = {
      title: props.task.title,
      description: props.task.description || '',
      weekId: props.task.weekId,
      areas: [...props.task.areas], // Create a copy to avoid mutation
      estimatedMinutes: props.task.estimatedMinutes,
      status: props.task.status,
    }
  } else {
    // Initialize with defaults for new task
    taskForm.value = {
      title: '',
      description: '',
      weekId: currentWeek.value?.id || '',
      areas: [],
      estimatedMinutes: 60,
      status: 'not_started',
    }
  }
}

// Toggle area selection
const toggleArea = (area: TaskArea) => {
  const index = taskForm.value.areas.indexOf(area)
  if (index === -1) {
    taskForm.value.areas.push(area)
  } else {
    taskForm.value.areas.splice(index, 1)
  }
}

// Form validation
const isFormValid = computed(() => {
  return (
    taskForm.value.title.trim().length > 0 &&
    taskForm.value.weekId &&
    taskForm.value.areas.length > 0 &&
    taskForm.value.estimatedMinutes > 0
  )
})

// Format minutes to hours and minutes
const formatTime = (minutes: number) => {
  if (minutes === 0) return '0 min'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}min`
}

// Create or update task using inline logic
const saveTask = async () => {
  if (!isFormValid.value) return

  try {
    if (isEditMode.value && props.task) {
      // Update existing task
      await updateTask(props.task.id, {
        title: taskForm.value.title.trim(),
        description: taskForm.value.description.trim() || undefined,
        weekId: taskForm.value.weekId,
        areas: taskForm.value.areas,
        estimatedMinutes: taskForm.value.estimatedMinutes,
        status: taskForm.value.status,
      })
    } else {
      // Create new task
      await createTask({
        title: taskForm.value.title.trim(),
        description: taskForm.value.description.trim() || undefined,
        weekId: taskForm.value.weekId,
        areas: taskForm.value.areas,
        estimatedMinutes: taskForm.value.estimatedMinutes,
        status: taskForm.value.status,
      })
    }

    close()
  } catch (error) {
    console.error('Failed to save task:', error)
    // Error handling is managed by the store
  }
}

// Close modal
const close = () => {
  isOpen.value = false
}

// Open modal (can be called by parent components)
const open = () => {
  isOpen.value = true
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
  close,
})

onMounted(async () => {
  await fetchWeeks()
})
</script>

<template>
  <BaseModal
    :is-open="isOpen"
    :title="modalTitle"
    :is-loading="isLoading"
    @close="close"
    max-width="2xl"
  >
    <!-- Form -->
    <form @submit.prevent="saveTask" class="space-y-6">
      <!-- Title -->
      <div class="form-control">
        <label class="label" for="task-title">
          <span class="label-text font-medium">Task Title *</span>
        </label>
        <input
          id="task-title"
          v-model="taskForm.title"
          class="input input-bordered w-full"
          type="text"
          placeholder="Enter task title..."
          :disabled="isLoading"
          required
        />
      </div>

      <!-- Description -->
      <BaseTextArea
        id="task-description"
        label="Description"
        placeholder="Describe your taskzzz..."
        v-model="taskForm.description"
        :disabled="isLoading"
      />
      <!-- Week Selection -->
      <div class="form-control">
        <label class="label" for="task-week">
          <span class="label-text font-medium">Week *</span>
        </label>
        <select
          id="task-week"
          v-model="taskForm.weekId"
          class="select select-bordered w-full"
          :disabled="isLoading"
          required
        >
          <option value="">Select a week...</option>
          <option v-for="week in weeks" :key="week.id" :value="week.id">
            {{ week.id }} ({{ new Date(week.startDate).toLocaleDateString() }})
            {{ week.isCurrentWeek ? ' - Current Week' : '' }}
          </option>
        </select>
      </div>

      <!-- Areas -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">Areas * (Select at least one)</span>
        </label>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
          <button
            v-for="area in availableAreas"
            :key="area"
            type="button"
            @click="toggleArea(area)"
            :class="[
              'btn btn-sm',
              taskForm.areas.includes(area) ? 'btn-primary' : 'btn-outline btn-primary',
            ]"
            :disabled="isLoading"
          >
            {{ area }}
          </button>
        </div>
      </div>

      <!-- Estimated Time -->
      <div class="form-control">
        <label class="label" for="task-time">
          <span class="label-text font-medium">Estimated Time (minutes) *</span>
        </label>
        <div class="flex items-center gap-4">
          <input
            id="task-time"
            v-model.number="taskForm.estimatedMinutes"
            class="input input-bordered flex-1"
            type="number"
            min="5"
            step="5"
            :disabled="isLoading"
            required
          />
          <div class="badge badge-info">{{ formatTime(taskForm.estimatedMinutes) }}</div>
        </div>
      </div>

      <!-- Status -->
      <div class="form-control">
        <label class="label" for="task-status">
          <span class="label-text font-medium">Status</span>
        </label>
        <select
          id="task-status"
          v-model="taskForm.status"
          class="select select-bordered w-full"
          :disabled="isLoading"
        >
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
    </form>

    <!-- Actions -->
    <template #actions>
      <button type="button" @click="close" class="btn btn-outline" :disabled="isLoading">
        Cancel
      </button>
      <button
        type="submit"
        @click="saveTask"
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
              ? 'Update Task'
              : 'Create Task'
        }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
/* Remove custom overlay styles since we're using DaisyUI modal */
</style>
