<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useTaskStore } from '@/stores/taskStore'
import { useTimeEntryStore } from '@/stores/timeEntryStore'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import TimeEntryFormModal from '@/components/TimeEntryFormModal.vue'
import type { Task, Week, TaskStatus, TaskArea, TimeEntry } from '@/types'
import { weeks } from '@/composables/useWeek'

// Router setup
const route = useRoute()
const router = useRouter()

// Use centralized stores
const taskStore = useTaskStore()
const timeEntryStore = useTimeEntryStore()

// API base URL for weeks
const API_BASE_URL = 'http://localhost:3000'

// Use store state for time entries
const timeEntries = computed(() => timeEntryStore.timeEntries)
const timeEntriesLoading = computed(() => timeEntryStore.isLoading)

// Time entry actions - delegate to store
const fetchTimeEntries = () => timeEntryStore.fetchTimeEntries()
const deleteTimeEntry = (timeEntryId: string) => timeEntryStore.deleteTimeEntry(timeEntryId)

// Use store for task management
const tasks = computed(() => taskStore.tasks)
const taskIsLoading = computed(() => taskStore.isLoading)
const taskError = computed(() => taskStore.error)

// Task actions - delegate to store
const fetchTasks = () => taskStore.fetchTasks()
const getTaskById = (taskId: string) => taskStore.getTaskById(taskId)
const updateTaskStatus = (taskId: string, status: TaskStatus) =>
  taskStore.updateTaskStatus(taskId, status)

// Week management logic (simple local state without caching)
const weekIsLoading = ref(false)
const weekError = ref<string | null>(null)

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

// Get the current task from route
const taskId = computed(() => route.params.id as string)

// Get the current task data
const currentTask = computed(() => {
  return getTaskById(taskId.value)
})

// Get the week this task belongs to
const taskWeek = computed(() => {
  if (!currentTask.value) return null
  return getWeekById(currentTask.value.weekId)
})

// Get time entries for current task
const taskTimeEntries = computed(() => {
  if (!timeEntries.value || !taskId.value) return []
  return timeEntries.value.filter((entry: TimeEntry) => entry.taskId === taskId.value)
})

// Navigation
const currentTaskIndex = computed(() => {
  if (!tasks.value || !taskId.value) return -1
  return tasks.value.findIndex((t: Task) => t.id === taskId.value)
})

const canGoToPrevious = computed(() => currentTaskIndex.value > 0)
const canGoToNext = computed(
  () => currentTaskIndex.value >= 0 && currentTaskIndex.value < (tasks.value?.length || 0) - 1,
)

const goToPreviousTask = () => {
  if (canGoToPrevious.value && tasks.value) {
    const prevTask = tasks.value[currentTaskIndex.value - 1]
    router.push(`/tasks/${prevTask.id}`)
  }
}

const goToNextTask = () => {
  if (canGoToNext.value && tasks.value) {
    const nextTask = tasks.value[currentTaskIndex.value + 1]
    router.push(`/tasks/${nextTask.id}`)
  }
}

const goBackToTasks = () => {
  router.push('/tasks')
}

const goToWeekPage = () => {
  if (currentTask.value) {
    router.push(`/planner/week/${currentTask.value.weekId}`)
  }
}

// Initialize data on component mount
onMounted(async () => {
  await Promise.all([fetchTasks(), fetchWeeks(), fetchTimeEntries()])
})

// Watch for route changes to handle direct navigation to task pages
watch(
  () => route.params.id,
  async (newTaskId) => {
    if (newTaskId && !currentTask.value) {
      // If we don't have the task data, try fetching it
      await fetchTasks()
    }
  },
  { immediate: true },
)

// Loading state
const isLoading = computed(
  () => taskIsLoading.value || weekIsLoading.value || timeEntriesLoading.value,
)

// Calculate time stats
const timeStats = computed(() => {
  const totalTracked = taskTimeEntries.value.reduce(
    (sum: number, entry: TimeEntry) => sum + entry.minutes,
    0,
  )
  const estimated = currentTask.value?.estimatedMinutes || 0
  const actual = currentTask.value?.actualMinutes || 0

  return {
    totalTracked,
    estimated,
    actual,
    variance: totalTracked - estimated, // Use totalTracked for real-time variance
    efficiency: estimated > 0 ? Math.round((totalTracked / estimated) * 100) : 0, // Use totalTracked for real-time efficiency
  }
})

// Group time entries by date
const timeEntriesByDate = computed(() => {
  if (!taskTimeEntries.value.length) return []

  const grouped = taskTimeEntries.value.reduce((acc: any, entry: TimeEntry) => {
    const date = entry.startTime.split('T')[0]
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(entry)
    return acc
  }, {})

  return Object.entries(grouped)
    .map(([date, entries]: [string, any]) => ({
      date,
      entries,
      totalMinutes: entries.reduce((sum: number, entry: TimeEntry) => sum + entry.minutes, 0),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

// Handle status change
const handleStatusChange = async (event: Event) => {
  if (!currentTask.value) return

  const target = event.target as HTMLSelectElement
  const newStatus = target.value as TaskStatus

  try {
    await updateTaskStatus(currentTask.value.id, newStatus)
  } catch (err) {
    console.error('Failed to update task status:', err)
  }
}

// Utility functions
const formatTime = (minutes: number) => {
  if (minutes === 0) return '0 min'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}min`
}

const formatDateTime = (dateTimeStr: string) => {
  return new Date(dateTimeStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const getStatusIcon = (status: TaskStatus) => {
  switch (status) {
    case 'completed':
      return 'lucide:check-circle'
    case 'in_progress':
      return 'lucide:play-circle'
    case 'not_started':
      return 'lucide:circle'
    default:
      return 'lucide:circle'
  }
}

const getStatusColor = (status: TaskStatus) => {
  switch (status) {
    case 'completed':
      return 'text-success'
    case 'in_progress':
      return 'text-warning'
    case 'not_started':
      return 'text-base-content/40'
    default:
      return 'text-base-content/40'
  }
}

// Modal factory logic for time entry CRUD
interface ModalConfig<T = any> {
  confirmAction?: (item: T) => Promise<void>
  onClose?: () => void
}

function createModalState<T = any>(config: ModalConfig<T> = {}) {
  const isOpen = ref(false)
  const editingItem = ref<T | null>(null)
  const isLoading = ref(false)

  const open = (item?: T) => {
    editingItem.value = item || null
    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
    editingItem.value = null
    isLoading.value = false
    config.onClose?.()
  }

  const confirm = async () => {
    if (!config.confirmAction || !editingItem.value) return

    try {
      isLoading.value = true
      await config.confirmAction(editingItem.value)
      close()
    } catch (error) {
      console.error('Modal action failed:', error)
      isLoading.value = false
      // Keep modal open on error so user can retry
    }
  }

  return {
    isOpen,
    editingItem,
    isLoading,
    open,
    close,
    confirm,
    isEditing: computed(() => !!editingItem.value),
    isCreating: computed(() => isOpen.value && !editingItem.value),
  }
}

// Modal management for time entry CRUD
const timeEntryFormModal = createModalState<TimeEntry>()
const timeEntryDeleteModal = createModalState<TimeEntry>({
  confirmAction: async (timeEntry) => {
    await deleteTimeEntry(timeEntry.id)
  },
})

// Time entry modal handlers
const openNewTimeEntryForm = () => {
  if (!currentTask.value) return
  timeEntryFormModal.open()
}

const openEditTimeEntryForm = (timeEntry: TimeEntry) => {
  timeEntryFormModal.open(timeEntry)
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header with Navigation -->
    <div class="mb-8">
      <div class="flex items-center gap-4 mb-4">
        <button @click="goBackToTasks" class="btn btn-ghost btn-circle" title="Back to Tasks">
          <Icon icon="lucide:arrow-left" width="20" height="20" />
        </button>

        <div class="flex-1">
          <h1 class="text-4xl font-bold text-primary mb-2">
            {{ currentTask?.title || 'Task Details' }}
          </h1>
          <div v-if="taskWeek" class="flex items-center gap-2 text-base-content/70">
            <Icon icon="lucide:calendar" width="16" height="16" />
            <button
              @click="goToWeekPage"
              class="hover:text-primary transition-colors cursor-pointer"
              title="Go to week page"
            >
              {{ taskWeek.id }}
            </button>
          </div>
        </div>

        <!-- Task Navigation -->
        <div class="flex items-center gap-2">
          <button
            @click="goToPreviousTask"
            :disabled="!canGoToPrevious"
            class="btn btn-circle btn-primary btn-sm"
            :class="{
              'btn-disabled opacity-30 cursor-not-allowed': !canGoToPrevious,
            }"
            title="Previous Task"
          >
            <Icon icon="lucide:chevron-left" width="16" height="16" />
          </button>

          <button
            @click="goToNextTask"
            :disabled="!canGoToNext"
            class="btn btn-circle btn-primary btn-sm"
            :class="{
              'btn-disabled opacity-30 cursor-not-allowed': !canGoToNext,
            }"
            title="Next Task"
          >
            <Icon icon="lucide:chevron-right" width="16" height="16" />
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-16">
      <div class="loading loading-spinner loading-lg text-primary"></div>
      <p class="mt-4 text-base-content/70">Loading task data...</p>
    </div>

    <!-- Task Not Found -->
    <div v-else-if="!currentTask" class="text-center py-16">
      <Icon
        icon="lucide:search-x"
        width="64"
        height="64"
        class="mx-auto text-base-content/30 mb-4"
      />
      <h3 class="text-xl font-semibold text-base-content/70 mb-2">Task not found</h3>
      <p class="text-base-content/50 mb-4">The requested task could not be found.</p>
      <button @click="goBackToTasks" class="btn btn-primary">Back to Tasks</button>
    </div>

    <!-- Task Content -->
    <div v-else class="space-y-8">
      <!-- Task Overview -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-4">
                <Icon
                  :icon="getStatusIcon(currentTask.status)"
                  width="24"
                  height="24"
                  :class="getStatusColor(currentTask.status)"
                />
                <select
                  :value="currentTask.status"
                  @change="handleStatusChange"
                  class="select select-bordered select-sm"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div v-if="currentTask.description" class="mb-4">
                <h3 class="font-semibold text-base-content mb-2">Description</h3>
                <p class="text-base-content/70">{{ currentTask.description }}</p>
              </div>

              <div class="flex flex-wrap gap-2 mb-4">
                <span
                  v-for="area in currentTask.areas"
                  :key="area"
                  class="badge badge-outline badge-lg"
                >
                  {{ area }}
                </span>
              </div>

              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-base-content/60">Created:</span>
                  <span class="ml-2">{{ formatDateTime(currentTask.createdAt) }}</span>
                </div>
                <div>
                  <span class="text-base-content/60">Updated:</span>
                  <span class="ml-2">{{ formatDateTime(currentTask.updatedAt) }}</span>
                </div>
              </div>
            </div>

            <div class="stats stats-vertical lg:stats-horizontal shadow-sm bg-base-200/50">
              <div class="stat p-4">
                <div class="stat-title text-xs">Estimated</div>
                <div class="stat-value text-primary text-lg">
                  {{ formatTime(currentTask.estimatedMinutes) }}
                </div>
              </div>
              <div class="stat p-4">
                <div class="stat-title text-xs">Actual</div>
                <div class="stat-value text-secondary text-lg">
                  {{ formatTime(currentTask.actualMinutes) }}
                </div>
              </div>
              <div class="stat p-4">
                <div class="stat-title text-xs">Efficiency</div>
                <div
                  class="stat-value text-lg"
                  :class="{
                    'text-success': timeStats.efficiency <= 100,
                    'text-warning': timeStats.efficiency > 100 && timeStats.efficiency <= 150,
                    'text-error': timeStats.efficiency > 150,
                  }"
                >
                  {{ timeStats.efficiency }}%
                </div>
              </div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="mt-6">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm font-medium">Time Progress</span>
              <span class="text-xs text-base-content/60">
                {{ timeStats.efficiency }}% of estimated time
              </span>
            </div>
            <progress
              class="progress w-full"
              :class="{
                'progress-success': timeStats.efficiency <= 100,
                'progress-warning': timeStats.efficiency > 100 && timeStats.efficiency <= 150,
                'progress-error': timeStats.efficiency > 150,
              }"
              :value="Math.min(200, timeStats.efficiency)"
              max="200"
            ></progress>
            <div class="flex justify-between text-xs text-base-content/60 mt-1">
              <span>0%</span>
              <span>100%</span>
              <span>200%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Time Tracking Summary -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-primary">
              <Icon icon="lucide:timer" width="32" height="32" />
            </div>
            <div class="stat-title">Total Tracked</div>
            <div class="stat-value text-primary">{{ formatTime(timeStats.totalTracked) }}</div>
            <div class="stat-desc">across {{ taskTimeEntries.length }} entries</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-accent">
              <Icon icon="lucide:trending-up" width="32" height="32" />
            </div>
            <div class="stat-title">Time Variance</div>
            <div
              class="stat-value text-accent"
              :class="{
                'text-success': timeStats.variance <= 0,
                'text-warning':
                  timeStats.variance > 0 &&
                  timeStats.variance <= currentTask.estimatedMinutes * 0.5,
                'text-error': timeStats.variance > currentTask.estimatedMinutes * 0.5,
              }"
            >
              {{ timeStats.variance >= 0 ? '+' : '' }}{{ formatTime(Math.abs(timeStats.variance)) }}
            </div>
            <div class="stat-desc">vs. estimated</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-info">
              <Icon icon="lucide:calendar-clock" width="32" height="32" />
            </div>
            <div class="stat-title">Days Worked</div>
            <div class="stat-value text-info">{{ timeEntriesByDate.length }}</div>
            <div class="stat-desc">tracking sessions</div>
          </div>
        </div>
      </div>

      <!-- Time Entries -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <div class="flex justify-between items-center mb-4">
            <h3 class="card-title">Time Entries ({{ taskTimeEntries.length }})</h3>
            <button
              @click="openNewTimeEntryForm"
              class="btn btn-primary btn-sm"
              title="Add time entry"
            >
              <Icon icon="lucide:plus" width="16" height="16" class="mr-1" />
              Add Time Entry
            </button>
          </div>

          <div v-if="taskTimeEntries.length === 0" class="text-center py-8 text-base-content/60">
            <Icon icon="lucide:clock-x" width="48" height="48" class="mx-auto mb-2" />
            <p class="mb-4">No time entries recorded for this task</p>
            <button
              @click="openNewTimeEntryForm"
              class="btn btn-primary btn-sm"
              title="Add first time entry"
            >
              <Icon icon="lucide:plus" width="16" height="16" class="mr-1" />
              Add First Entry
            </button>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="dateGroup in timeEntriesByDate"
              :key="dateGroup.date"
              class="card bg-base-200 shadow-sm"
            >
              <div class="card-body p-4">
                <div class="flex justify-between items-center mb-3">
                  <h4 class="font-semibold">{{ formatDate(dateGroup.date) }}</h4>
                  <div class="badge badge-primary">{{ formatTime(dateGroup.totalMinutes) }}</div>
                </div>

                <div class="space-y-2">
                  <div
                    v-for="entry in dateGroup.entries"
                    :key="entry.id"
                    class="flex items-center justify-between p-3 bg-base-100 rounded-lg"
                  >
                    <div class="flex items-center gap-3">
                      <Icon icon="lucide:play" width="16" height="16" class="text-primary" />
                      <div>
                        <div class="font-medium">{{ formatTime(entry.minutes) }}</div>
                        <div class="text-xs text-base-content/60">
                          {{
                            new Date(entry.startTime).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          }}
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center gap-3">
                      <div
                        v-if="entry.notes"
                        class="text-sm text-base-content/70 max-w-xs truncate"
                      >
                        {{ entry.notes }}
                      </div>
                      <div class="flex items-center gap-1">
                        <button
                          @click="openEditTimeEntryForm(entry)"
                          class="btn btn-xs btn-ghost"
                          title="Edit entry"
                        >
                          <Icon icon="lucide:edit" width="12" height="12" />
                        </button>
                        <button
                          @click="deleteTimeEntry(entry)"
                          class="btn btn-xs btn-ghost text-error"
                          title="Delete entry"
                        >
                          <Icon icon="lucide:trash-2" width="12" height="12" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Task Actions -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">Actions</h3>
          <div class="flex flex-wrap gap-4">
            <button @click="goToWeekPage" class="btn btn-outline btn-primary" :disabled="!taskWeek">
              <Icon icon="lucide:calendar" width="16" height="16" class="mr-2" />
              View Week
            </button>

            <button @click="goBackToTasks" class="btn btn-ghost">
              <Icon icon="lucide:list" width="16" height="16" class="mr-2" />
              All Tasks
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Time Entry Form Modal -->
    <TimeEntryFormModal
      :is-open="timeEntryFormModal.isOpen.value"
      :task-id="taskId"
      :time-entry="timeEntryFormModal.editingItem.value"
      @close="timeEntryFormModal.close"
    />

    <!-- Delete Time Entry Confirmation Modal -->
    <DeleteConfirmModal
      :is-open="timeEntryDeleteModal.isOpen.value"
      :title="`Delete Time Entry`"
      :message="`Are you sure you want to delete this time entry (${timeEntryDeleteModal.editingItem.value ? formatTime(timeEntryDeleteModal.editingItem.value.minutes) : ''})? This action cannot be undone.`"
      :is-loading="timeEntryDeleteModal.isLoading.value"
      @close="timeEntryDeleteModal.close"
      @confirm="timeEntryDeleteModal.confirm"
    />
  </div>
</template>

<style scoped>
/* Custom responsive adjustments */
@media (max-width: 640px) {
  .stats {
    width: 100%;
  }
}
</style>
