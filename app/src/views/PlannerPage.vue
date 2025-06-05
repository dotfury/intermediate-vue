<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useTaskStore } from '@/stores/taskStore'
import WeekFormModal from '../components/WeekFormModal.vue'
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue'
import type { Task, Week } from '../types'
import NewPlannerCardBody from '@/components/NewPlannerCardBody.vue'
import { weeks } from '@/composables/useWeek'

// Router setup
const router = useRouter()

// Use centralized task store
const taskStore = useTaskStore()

// API base URL for week operations
const API_BASE_URL = 'http://localhost:3000'

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

// Modal references
const weekFormModal = ref()
const deleteConfirmModal = ref()
const weekToDelete = ref<Week | null>(null)

// Week CRUD operations
const deleteWeek = async (weekId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/weeks/${weekId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Remove from local state
    weeks.value = weeks.value.filter((week) => week.id !== weekId)

    // If deleted week was selected, select another week
    if (selectedWeekId.value === weekId) {
      selectedWeekId.value = weeks.value[0]?.id || ''
    }

    return true
  } catch (err) {
    console.error('Error deleting week:', err)
    throw err
  }
}

// Modal event handlers
const openCreateWeekModal = () => {
  weekFormModal.value?.open()
}

const openEditWeekModal = () => {
  if (selectedWeek.value && weekFormModal.value) {
    weekFormModal.value.openForEdit(selectedWeek.value)
  }
}

const openDeleteWeekModal = () => {
  if (selectedWeek.value) {
    weekToDelete.value = selectedWeek.value
    deleteConfirmModal.value = true
  }
}

const handleWeekCreated = async () => {
  await fetchWeeks() // Refresh weeks from backend

  // If no week is currently selected, select the newly created week
  if (!selectedWeekId.value && weeks.value.length > 0) {
    // Sort weeks and select the most recent one
    const sortedWeeks = [...weeks.value].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    selectedWeekId.value = sortedWeeks[0].id
  }
}

const handleWeekUpdated = async () => {
  await fetchWeeks() // Refresh weeks from backend
}

const handleDeleteConfirm = async () => {
  if (weekToDelete.value) {
    try {
      await deleteWeek(weekToDelete.value.id)
      deleteConfirmModal.value = false
      weekToDelete.value = null
    } catch (error) {
      console.error('Failed to delete week:', error)
    }
  }
}

const handleDeleteCancel = () => {
  deleteConfirmModal.value = false
  weekToDelete.value = null
}

// Utility function
const formatTime = (minutes: number) => {
  if (minutes === 0) return '0 min'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}min`
}

// Initialize data on component mount
onMounted(async () => {
  await Promise.all([taskStore.fetchTasks(), fetchWeeks()])
})

// Selected week state
const selectedWeekId = ref<string>('')

// Watch for weeks to set default selected week to current week
watch(
  () => weeks.value,
  (newWeeks) => {
    if (newWeeks && newWeeks.length > 0 && !selectedWeekId.value) {
      const currentWeek = newWeeks.find((w: Week) => w.isCurrentWeek)
      selectedWeekId.value = currentWeek?.id || newWeeks[0].id
    }
  },
  { immediate: true },
)

// Selected week computed
const selectedWeek = computed(() => {
  return weeks.value?.find((w: Week) => w.id === selectedWeekId.value)
})

// Week navigation
const currentWeekIndex = computed(() => {
  if (!weeks.value || !selectedWeekId.value) return -1
  return weeks.value.findIndex((w: Week) => w.id === selectedWeekId.value)
})

const canGoToPrevious = computed(() => currentWeekIndex.value > 0)
const canGoToNext = computed(
  () => currentWeekIndex.value >= 0 && currentWeekIndex.value < (weeks.value?.length || 0) - 1,
)

const goToPreviousWeek = () => {
  if (canGoToPrevious.value && weeks.value) {
    selectedWeekId.value = weeks.value[currentWeekIndex.value - 1].id
  }
}

const goToNextWeek = () => {
  if (canGoToNext.value && weeks.value) {
    selectedWeekId.value = weeks.value[currentWeekIndex.value + 1].id
  }
}

const goToCurrentWeek = () => {
  const currentWeek = weeks.value?.find((w: Week) => w.isCurrentWeek)
  if (currentWeek) {
    selectedWeekId.value = currentWeek.id
  }
}

// Navigate to dedicated week page
const goToWeekPage = (weekId: string) => {
  router.push(`/planner/week/${weekId}`)
}

// Get tasks for selected week
const selectedWeekTasks = computed(() => {
  if (!taskStore.tasks || !selectedWeekId.value) return []
  return taskStore.getTasksByWeek(selectedWeekId.value)
})

// Track expanded state for task list
const isTaskListExpanded = ref(false)

// Toggle expanded state for task list
const toggleTaskList = () => {
  isTaskListExpanded.value = !isTaskListExpanded.value
}

// Calculate progress percentage
const getProgressPercentage = (actual: number, planned: number) => {
  if (planned === 0) return 0
  return Math.round((actual / planned) * 100)
}

// Get progress status
const getProgressStatus = (percentage: number) => {
  if (percentage >= 100) return 'completed'
  if (percentage >= 75) return 'on-track'
  if (percentage >= 50) return 'behind'
  return 'concerning'
}

// Get week status
const getWeekStatus = () => {
  const tasksInWeek = selectedWeekTasks.value || []
  const completedTasks = tasksInWeek.filter((t: Task) => t.status === 'completed').length
  const totalTasks = tasksInWeek.length

  if (totalTasks === 0) return 'no-tasks'
  if (completedTasks === totalTasks) return 'completed'
  if (completedTasks > 0) return 'in-progress'
  return 'not-started'
}

// Format date range
const formatDateRange = (startDate: string, endDate: string) => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-primary mb-2">Weekly Planner</h1>
      <p class="text-base-content/70 text-lg">Track your weekly progress and plan ahead</p>
    </div>

    <!-- Overview Stats -->
    <div v-if="!weekIsLoading" class="border-base-300 pb-8">
      <h2 class="text-2xl font-semibold text-primary mb-6">Overview</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-primary">
              <Icon icon="lucide:calendar-days" width="24" height="24" />
            </div>
            <div class="stat-title">Total Weeks</div>
            <div class="stat-value text-primary">{{ weeks?.length || 0 }}</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-secondary">
              <Icon icon="lucide:check-square" width="24" height="24" />
            </div>
            <div class="stat-title">Total Tasks</div>
            <div class="stat-value text-secondary">{{ taskStore.tasks?.length || 0 }}</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-accent">
              <Icon icon="lucide:clock" width="24" height="24" />
            </div>
            <div class="stat-title">Time Planned</div>
            <div class="stat-value text-accent text-lg">
              {{
                formatTime(
                  weeks?.reduce((sum: number, w: any) => sum + w.totalPlannedMinutes, 0) || 0,
                )
              }}
            </div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-info">
              <Icon icon="lucide:activity" width="24" height="24" />
            </div>
            <div class="stat-title">Time Actual</div>
            <div class="stat-value text-info text-lg">
              {{
                formatTime(
                  weeks?.reduce((sum: number, w: any) => sum + w.totalActualMinutes, 0) || 0,
                )
              }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Week Selector -->
    <div v-if="!weekIsLoading" class="card bg-primary/5 shadow-sm mb-8">
      <div class="card-body">
        <div class="flex flex-col lg:flex-row lg:items-center gap-4">
          <!-- Week Navigation -->
          <div class="flex items-center gap-3">
            <button
              @click="goToPreviousWeek"
              :disabled="!canGoToPrevious"
              class="btn btn-circle btn-primary"
              :class="{
                'btn-disabled opacity-30 cursor-not-allowed': !canGoToPrevious,
                'hover:btn-primary-focus': canGoToPrevious,
              }"
              title="Previous Week"
            >
              <Icon
                icon="lucide:chevron-left"
                width="20"
                height="20"
                :class="{
                  'text-primary-content': canGoToPrevious,
                  'text-base-content/30': !canGoToPrevious,
                }"
              />
            </button>

            <button
              @click="goToCurrentWeek"
              class="btn btn-primary"
              :class="{
                'btn-outline': !selectedWeek?.isCurrentWeek,
                'btn-primary': selectedWeek?.isCurrentWeek,
              }"
              title="Go to Current Week"
            >
              <Icon icon="lucide:calendar-days" width="16" height="16" class="mr-2" />
              Current Week
            </button>

            <button
              @click="goToNextWeek"
              :disabled="!canGoToNext"
              class="btn btn-circle btn-primary"
              :class="{
                'btn-disabled opacity-30 cursor-not-allowed': !canGoToNext,
                'hover:btn-primary-focus': canGoToNext,
              }"
              title="Next Week"
            >
              <Icon
                icon="lucide:chevron-right"
                width="20"
                height="20"
                :class="{
                  'text-primary-content': canGoToNext,
                  'text-base-content/30': !canGoToNext,
                }"
              />
            </button>
          </div>

          <!-- Week Dropdown -->
          <div class="form-control flex-1">
            <label class="label" for="week-select">
              <span class="label-text font-medium">Select Week:</span>
            </label>
            <select
              id="week-select"
              v-model="selectedWeekId"
              class="select select-bordered w-full max-w-md"
            >
              <option v-for="week in weeks" :key="week.id" :value="week.id">
                {{ week.id }} - {{ formatDateRange(week.startDate, week.endDate) }}
                <span v-if="week.isCurrentWeek">(Current)</span>
              </option>
            </select>
          </div>

          <!-- Week CRUD Actions -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              @click="openCreateWeekModal"
              class="btn btn-primary btn-sm"
              title="Create New Week"
            >
              <Icon icon="lucide:plus" width="16" height="16" />
              <span class="hidden sm:inline ml-1">New Week</span>
            </button>

            <button
              @click="openEditWeekModal"
              class="btn btn-outline btn-primary btn-sm"
              :disabled="!selectedWeek"
              title="Edit Week"
            >
              <Icon icon="lucide:edit-3" width="16" height="16" />
              <span class="hidden sm:inline ml-1">Edit</span>
            </button>

            <button
              @click="openDeleteWeekModal"
              class="btn btn-outline btn-error btn-sm"
              :disabled="!selectedWeek"
              title="Delete Week"
            >
              <Icon icon="lucide:trash-2" width="16" height="16" />
              <span class="hidden sm:inline ml-1">Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="weekIsLoading" class="flex flex-col items-center justify-center py-16">
      <div class="loading loading-spinner loading-lg text-primary"></div>
      <p class="mt-4 text-base-content/70">Loading your planner data...</p>
    </div>

    <!-- Selected Week Display -->
    <div v-else-if="selectedWeek" class="space-y-8">
      <!-- Week Card -->
      <div
        class="card bg-base-100 shadow-xl border"
        :class="{
          'border-success bg-success/5': getWeekStatus() === 'completed',
          'border-warning bg-warning/5': getWeekStatus() === 'in-progress',
          'border-base-300 bg-base-100':
            getWeekStatus() === 'not-started' || getWeekStatus() === 'no-tasks',
        }"
      >
        <div class="card-body">
          <div class="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-6">
            <div class="flex-1">
              <h3
                class="card-title text-primary text-xl mb-1 cursor-pointer hover:text-primary-focus transition-colors"
                @click="goToWeekPage(selectedWeek.id)"
                title="Click to view detailed week page"
              >
                {{ selectedWeek.id }}
                <Icon icon="lucide:external-link" width="16" height="16" class="ml-1 opacity-60" />
              </h3>
              <p class="text-base-content/60 text-sm mb-2">
                {{ formatDateRange(selectedWeek.startDate, selectedWeek.endDate) }}
              </p>
              <div v-if="selectedWeek.isCurrentWeek" class="badge badge-primary badge-sm">
                Current Week
              </div>
            </div>

            <div class="stats stats-vertical lg:stats-horizontal shadow-sm bg-base-200/50">
              <div class="stat p-3">
                <div class="stat-title text-xs">Planned</div>
                <div class="stat-value text-primary text-sm">
                  {{ formatTime(selectedWeek.totalPlannedMinutes) }}
                </div>
              </div>
              <div class="stat p-3">
                <div class="stat-title text-xs">Actual</div>
                <div class="stat-value text-secondary text-sm">
                  {{ formatTime(selectedWeek.totalActualMinutes) }}
                </div>
              </div>
            </div>
          </div>

          <div class="mb-6">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm font-medium">Progress</span>
              <span class="text-xs text-base-content/60">
                {{
                  getProgressPercentage(
                    selectedWeek.totalActualMinutes,
                    selectedWeek.totalPlannedMinutes,
                  )
                }}% completed
              </span>
            </div>
            <progress
              class="progress w-full"
              :class="{
                'progress-success':
                  getProgressStatus(
                    getProgressPercentage(
                      selectedWeek.totalActualMinutes,
                      selectedWeek.totalPlannedMinutes,
                    ),
                  ) === 'completed',
                'progress-warning':
                  getProgressStatus(
                    getProgressPercentage(
                      selectedWeek.totalActualMinutes,
                      selectedWeek.totalPlannedMinutes,
                    ),
                  ) === 'on-track',
                'progress-error':
                  getProgressStatus(
                    getProgressPercentage(
                      selectedWeek.totalActualMinutes,
                      selectedWeek.totalPlannedMinutes,
                    ),
                  ) === 'concerning',
                'progress-info':
                  getProgressStatus(
                    getProgressPercentage(
                      selectedWeek.totalActualMinutes,
                      selectedWeek.totalPlannedMinutes,
                    ),
                  ) === 'behind',
              }"
              :value="
                Math.min(
                  100,
                  getProgressPercentage(
                    selectedWeek.totalActualMinutes,
                    selectedWeek.totalPlannedMinutes,
                  ),
                )
              "
              max="100"
            ></progress>
          </div>

          <div class="mb-4">
            <h4 class="font-semibold text-base-content mb-3">
              Tasks ({{ selectedWeekTasks.length || 0 }})
            </h4>

            <div v-if="selectedWeekTasks.length > 0" class="space-y-2 mb-3">
              <div class="flex items-center gap-2 text-sm">
                <Icon icon="lucide:check-circle" width="16" height="16" class="text-success" />
                <span class="text-base-content/70">
                  {{ selectedWeekTasks.filter((t: any) => t.status === 'completed').length }}
                  completed
                </span>
              </div>
              <div class="flex items-center gap-2 text-sm">
                <Icon icon="lucide:play-circle" width="16" height="16" class="text-warning" />
                <span class="text-base-content/70">
                  {{ selectedWeekTasks.filter((t: any) => t.status === 'in_progress').length }}
                  in progress
                </span>
              </div>
              <div class="flex items-center gap-2 text-sm">
                <Icon icon="lucide:circle" width="16" height="16" class="text-base-content/40" />
                <span class="text-base-content/70">
                  {{ selectedWeekTasks.filter((t: any) => t.status === 'not_started').length }}
                  not started
                </span>
              </div>
            </div>

            <div v-else class="flex items-center gap-2 text-base-content/50 text-sm">
              <Icon icon="lucide:calendar-x" width="20" height="20" />
              <span>No tasks planned</span>
            </div>
          </div>

          <NewPlannerCardBody :taskList="selectedWeekTasks" :isExpanded="isTaskListExpanded">
            <template #taskList="{ taskList }">
              <pre>{{ taskList }}</pre>
            </template>
          </NewPlannerCardBody>

          <div v-if="selectedWeekTasks.length > 0" class="border-t border-base-300 pt-4">
            <div class="space-y-2">
              <div
                v-for="(task, index) in selectedWeekTasks"
                :key="task.id"
                class="flex items-center gap-2 text-sm"
                :class="{ hidden: !isTaskListExpanded && index >= 3 }"
              >
                <Icon
                  :icon="
                    task.status === 'completed'
                      ? 'lucide:check-circle'
                      : task.status === 'in_progress'
                        ? 'lucide:play-circle'
                        : 'lucide:circle'
                  "
                  width="14"
                  height="14"
                  :class="{
                    'text-success': task.status === 'completed',
                    'text-warning': task.status === 'in_progress',
                    'text-base-content/40': task.status === 'not_started',
                  }"
                />
                <span class="flex-1 text-base-content">{{ task.title }}</span>
                <span class="text-xs text-base-content/60">
                  {{ formatTime(task.actualMinutes) }}/{{ formatTime(task.estimatedMinutes) }}
                </span>
              </div>

              <button
                v-if="selectedWeekTasks.length > 3"
                @click="toggleTaskList"
                class="btn btn-ghost btn-sm w-full gap-2 mt-2"
              >
                <span v-if="!isTaskListExpanded">
                  +{{ selectedWeekTasks.length - 3 }} more tasks
                </span>
                <span v-else>Show less</span>
                <Icon
                  :icon="isTaskListExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                  width="14"
                  height="14"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Week Selected -->
    <div v-else-if="!weekIsLoading" class="text-center py-16">
      <Icon
        icon="lucide:calendar-x"
        width="64"
        height="64"
        class="mx-auto text-base-content/30 mb-4"
      />
      <h3 class="text-xl font-semibold text-base-content/70 mb-2">No weeks available</h3>
      <p class="text-base-content/50">Create your first week to start planning!</p>
    </div>
  </div>

  <!-- Week Form Modal -->
  <WeekFormModal
    ref="weekFormModal"
    @weekCreated="handleWeekCreated"
    @weekUpdated="handleWeekUpdated"
  />

  <!-- Delete Confirmation Modal -->
  <DeleteConfirmModal
    :is-open="deleteConfirmModal"
    :title="`Delete Week ${weekToDelete?.id || ''}`"
    :message="`Are you sure you want to delete this week? This action cannot be undone and will also delete all tasks associated with this week.`"
    :is-loading="false"
    @close="handleDeleteCancel"
    @confirm="handleDeleteConfirm"
  />
</template>

<style scoped>
/* Responsive adjustments for very small screens */
@media (max-width: 480px) {
  .stats-vertical .stat {
    padding: 0.75rem;
  }

  .card-body {
    padding: 1rem;
  }
}
</style>
