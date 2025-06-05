<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import TaskFormModal from '@/components/TaskFormModal.vue'
import TimeEntryFormModal from '@/components/TimeEntryFormModal.vue'

import { filterTasks, formatTaskStatusLabel } from '@/composables/useTask'

import { useTaskStore } from '@/stores/taskStore'
import { useTimeEntryStore } from '@/stores/timeEntryStore'

import type { Task, TaskStatus, TaskArea, TimeEntry, Week } from '@/types'
import type { RouterLink } from 'vue-router'

import { weeks } from '@/composables/useWeek'

// API base URL
const API_BASE_URL = 'http://localhost:3000'

// Use the centralized stores
const taskStore = useTaskStore()
const timeEntryStore = useTimeEntryStore()

// Week state
const weekIsLoading = ref(false)
const weekError = ref<string | null>(null)

// Week getters
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

// Task functions
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return 'badge-success'
    case 'in_progress':
      return 'badge-warning'
    case 'not_started':
      return 'badge-ghost'
    default:
      return 'badge-neutral'
  }
}

const formatTime = (minutes: number) => {
  if (minutes === 0) return '0 min'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}min`
}

const formatDateTimeShort = (dateTimeString: string) => {
  return new Date(dateTimeString).toLocaleDateString()
}

// Modal factory logic
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

// Modal management using modal factory logic
const taskDeleteModal = createModalState<Task>({
  confirmAction: async (task) => {
    await taskStore.deleteTask(task.id)
  },
})
const timeEntryFormModal = createModalState<TimeEntry>({
  onClose: () => {
    selectedTaskId.value = ''
  },
})
const timeEntryDeleteModal = createModalState<TimeEntry>({
  confirmAction: async (timeEntry) => {
    await timeEntryStore.deleteTimeEntry(timeEntry.id)
  },
})

// Task ID for new time entries
const selectedTaskId = ref<string>('')

// Initialize data on component mount
onMounted(async () => {
  await Promise.all([taskStore.fetchTasks(), fetchWeeks(), timeEntryStore.fetchTimeEntries()])
})

// Filter and sort options
const selectedWeek = ref('all')
const selectedStatus = ref('all')
const selectedArea = ref('all')
const searchTerm = ref('')

// Expandable time entries state
const expandedTimeEntries = ref<Set<string>>(new Set())

// Filter tasks using inline method
const filteredTasks = computed(() => {
  return filterTasks(taskStore.tasks, {
    weekId: selectedWeek.value === 'all' ? undefined : selectedWeek.value,
    status: selectedStatus.value as TaskStatus | 'all',
    area: selectedArea.value as TaskArea | 'all',
    searchTerm: searchTerm.value.trim() || undefined,
  })
})

// Modal handlers
const taskFormModalRef = ref<InstanceType<typeof TaskFormModal> | null>(null)
const currentEditingTask = ref<Task | null>(null)

const openNewTaskForm = () => {
  currentEditingTask.value = null
  taskFormModalRef.value?.open()
}

const openEditTaskForm = (task: Task) => {
  currentEditingTask.value = task
  taskFormModalRef.value?.open()
}

const openDeleteTaskModal = (task: Task) => taskDeleteModal.open(task)

// Time entry modal handlers
const openNewTimeEntryForm = (taskId: string) => {
  selectedTaskId.value = taskId
  timeEntryFormModal.open()
}

const openEditTimeEntryForm = (timeEntry: TimeEntry) => {
  selectedTaskId.value = timeEntry.taskId
  timeEntryFormModal.open(timeEntry)
}

// Get time entries for a specific task (sorted by start time, newest first)
const getTaskTimeEntries = (taskId: string) => {
  return timeEntryStore.timeEntries
    .filter((entry: TimeEntry) => entry.taskId === taskId)
    .sort(
      (a: TimeEntry, b: TimeEntry) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    )
}

// Get total time from time entries for a task
const getTaskTotalTimeFromEntries = (taskId: string) => {
  const entries = getTaskTimeEntries(taskId)
  return entries.reduce((total, entry) => total + entry.minutes, 0)
}

// Get time entry count for a task
const getTaskTimeEntryCount = (taskId: string) => {
  return getTaskTimeEntries(taskId).length
}

// Format time entry display text
const formatTimeEntryInfo = (taskId: string) => {
  const entries = getTaskTimeEntries(taskId)
  const count = entries.length

  if (count === 0) return 'No time entries'
  if (count === 1) return '1 time entry'
  return `${count} time entries`
}

const isTimeEntriesExpanded = (taskId: string) => {
  return expandedTimeEntries.value.has(taskId)
}

const toggleTimeEntries = (taskId: string) => {
  if (expandedTimeEntries.value.has(taskId)) {
    expandedTimeEntries.value.delete(taskId)
  } else {
    expandedTimeEntries.value.add(taskId)
  }
}
</script>

<template>
  <div class="tasks-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1 class="text-4xl font-bold text-primary mb-2">Tasks</h1>
          <p class="text-base-content/70 text-lg">
            Manage and track your tasks across different weeks and areas
          </p>
        </div>
        <button @click="openNewTaskForm" class="btn btn-primary" :disabled="taskStore.isLoading">
          <Icon icon="lucide:plus" width="20" height="20" />
          Add New Task
        </button>
      </div>
    </div>

    <!-- Task Form Modal Component -->
    <TaskFormModal ref="taskFormModalRef" :task="currentEditingTask" />

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmModal
      :is-open="taskDeleteModal.isOpen.value"
      :title="`Delete Task`"
      :message="`Are you sure you want to delete &quot;${taskDeleteModal.editingItem.value?.title}&quot;? This action cannot be undone.`"
      :is-loading="taskDeleteModal.isLoading.value"
      @close="taskDeleteModal.close"
      @confirm="taskDeleteModal.confirm"
    />

    <!-- Time Entry Form Modal -->
    <TimeEntryFormModal
      :is-open="timeEntryFormModal.isOpen.value"
      :task-id="selectedTaskId"
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

    <!-- Filters -->
    <div class="filters">
      <div class="form-control flex-1 min-w-80">
        <label class="label">
          <span class="label-text font-medium">Search:</span>
        </label>
        <label class="input input-bordered flex items-center gap-2">
          <Icon icon="lucide:search" width="16" height="16" class="text-base-content/40" />
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Search tasks by title or description..."
            class="grow"
          />
          <button
            v-if="searchTerm"
            @click="searchTerm = ''"
            class="btn btn-ghost btn-xs"
            type="button"
            title="Clear search"
          >
            <Icon icon="lucide:x" width="14" height="14" />
          </button>
        </label>
      </div>

      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">Week:</span>
        </label>
        <select v-model="selectedWeek" class="select select-bordered">
          <option value="all">All Weeks</option>
          <option v-for="week in weeks" :key="week.id" :value="week.id">
            {{ week.id }} ({{ new Date(week.startDate).toLocaleDateString() }})
          </option>
        </select>
      </div>

      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">Status:</span>
        </label>
        <select v-model="selectedStatus" class="select select-bordered">
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
          <option value="not_started">Not Started</option>
        </select>
      </div>

      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">Area:</span>
        </label>
        <select v-model="selectedArea" class="select select-bordered">
          <option value="all">All Areas</option>
          <option v-for="area in taskStore.uniqueAreas" :key="area" :value="area">
            {{ area }}
          </option>
        </select>
      </div>
    </div>

    <!-- Tasks Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div
        v-for="task in filteredTasks"
        :key="task.id"
        class="card bg-base-100 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <div class="card-body">
          <div class="flex justify-between items-start mb-4">
            <RouterLink
              :to="`/tasks/${task.id}`"
              class="card-title text-lg hover:text-primary transition-colors cursor-pointer text-left"
              title="View task details"
            >
              {{ task.title }}
            </RouterLink>
            <div :class="['badge', getStatusBadge(task.status)]">
              {{ formatTaskStatusLabel(task.status) }}
            </div>
          </div>

          <p class="text-base-content/70 mb-4">{{ task.description }}</p>

          <div class="flex flex-wrap gap-1 mb-4">
            <div v-for="area in task.areas" :key="area" class="badge badge-primary badge-outline">
              {{ area }}
            </div>
          </div>

          <div class="space-y-2 mb-4">
            <div class="flex items-center gap-2 text-sm text-base-content/70">
              <Icon icon="lucide:target" width="16" height="16" />
              <span>Estimated: {{ formatTime(task.estimatedMinutes) }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm text-base-content/70">
              <Icon icon="lucide:clock" width="16" height="16" />
              <span>Actual: {{ formatTime(task.actualMinutes) }}</span>
            </div>
          </div>

          <!-- Time Entries Info -->
          <div class="mb-4">
            <!-- Time Entries Summary -->
            <div
              v-if="getTaskTimeEntryCount(task.id) > 0"
              class="bg-info/10 rounded-lg border border-info/20"
            >
              <!-- Summary Header -->
              <div class="flex items-center justify-between p-3">
                <div class="flex items-center gap-2">
                  <Icon icon="lucide:timer" width="16" height="16" class="text-info" />
                  <div class="flex-1">
                    <div class="text-sm font-medium text-info">
                      {{ formatTimeEntryInfo(task.id) }}
                    </div>
                    <div class="text-xs text-base-content/60 mt-1 flex items-center gap-4">
                      <span>Tracked: {{ formatTime(getTaskTotalTimeFromEntries(task.id)) }}</span>
                      <span
                        v-if="
                          task.actualMinutes > 0 &&
                          getTaskTotalTimeFromEntries(task.id) !== task.actualMinutes
                        "
                        :class="
                          getTaskTotalTimeFromEntries(task.id) > task.actualMinutes
                            ? 'text-warning'
                            : 'text-success'
                        "
                      >
                        {{ getTaskTotalTimeFromEntries(task.id) > task.actualMinutes ? '+' : ''
                        }}{{
                          formatTime(getTaskTotalTimeFromEntries(task.id) - task.actualMinutes)
                        }}
                        vs actual
                      </span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    @click="openNewTimeEntryForm(task.id)"
                    class="btn btn-xs btn-primary btn-outline"
                    title="Add time entry"
                  >
                    <Icon icon="lucide:plus" width="12" height="12" />
                  </button>
                  <button
                    @click="toggleTimeEntries(task.id)"
                    class="btn btn-xs btn-ghost"
                    :title="isTimeEntriesExpanded(task.id) ? 'Collapse entries' : 'Show entries'"
                  >
                    <Icon
                      :icon="
                        isTimeEntriesExpanded(task.id) ? 'lucide:chevron-up' : 'lucide:chevron-down'
                      "
                      width="16"
                      height="16"
                    />
                  </button>
                </div>
              </div>

              <!-- Expanded Time Entries List -->
              <div v-if="isTimeEntriesExpanded(task.id)" class="border-t border-info/20 p-3 pt-2">
                <div class="space-y-2">
                  <div
                    v-for="entry in getTaskTimeEntries(task.id)"
                    :key="entry.id"
                    class="flex items-center justify-between p-2 bg-base-100 rounded border"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 text-sm">
                        <Icon
                          :icon="entry.isManual ? 'lucide:edit-3' : 'lucide:clock'"
                          width="12"
                          height="12"
                          :class="entry.isManual ? 'text-warning' : 'text-primary'"
                        />
                        <span class="font-medium">{{ formatTime(entry.minutes) }}</span>
                        <span class="text-base-content/60">
                          {{ formatDateTimeShort(entry.startTime) }}
                        </span>
                      </div>
                      <div v-if="entry.notes" class="text-xs text-base-content/70 mt-1 truncate">
                        {{ entry.notes }}
                      </div>
                    </div>
                    <div class="flex items-center gap-1 ml-2">
                      <button
                        @click="openEditTimeEntryForm(entry)"
                        class="btn btn-xs btn-ghost"
                        title="Edit entry"
                      >
                        <Icon icon="lucide:edit" width="12" height="12" />
                      </button>
                      <button
                        @click="timeEntryStore.deleteTimeEntry(entry.id)"
                        class="btn btn-xs btn-ghost text-error"
                        title="Delete entry"
                      >
                        <Icon icon="lucide:trash-2" width="12" height="12" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Summary Footer -->
                <div
                  class="flex justify-between items-center mt-3 pt-2 border-t border-base-300 text-xs text-base-content/70"
                >
                  <span>{{ getTaskTimeEntryCount(task.id) }} entries total</span>
                  <span class="font-medium"
                    >Total: {{ formatTime(getTaskTotalTimeFromEntries(task.id)) }}</span
                  >
                </div>
              </div>
            </div>

            <!-- No Time Entries State -->
            <div
              v-else
              class="flex items-center justify-between p-2 text-xs text-base-content/50 border border-dashed border-base-300 rounded-lg"
            >
              <div class="flex items-center gap-2">
                <Icon icon="lucide:clock" width="14" height="14" />
                <span>No time entries yet</span>
              </div>
              <button
                @click="openNewTimeEntryForm(task.id)"
                class="btn btn-xs btn-primary btn-outline"
                title="Add first time entry"
              >
                <Icon icon="lucide:plus" width="12" height="12" />
                <span>Add</span>
              </button>
            </div>
          </div>

          <!-- Task Actions -->
          <div class="card-actions justify-end mt-4 pt-4 border-t border-base-300">
            <button
              @click="openEditTaskForm(task)"
              class="btn btn-sm btn-outline btn-primary gap-1"
              :disabled="taskStore.isLoading"
              title="Edit task"
            >
              <Icon icon="lucide:edit" width="14" height="14" />
              Edit
            </button>
            <button
              @click="openDeleteTaskModal(task)"
              class="btn btn-sm btn-outline btn-error gap-1"
              :disabled="taskStore.isLoading"
              title="Delete task"
            >
              <Icon icon="lucide:trash-2" width="14" height="14" />
              Delete
            </button>
          </div>

          <div
            class="flex justify-between text-xs text-base-content/50 pt-4 border-t border-base-300"
          >
            <span>Week: {{ task.weekId }}</span>
            <span>Updated: {{ new Date(task.updatedAt).toLocaleDateString() }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="filteredTasks.length === 0" class="text-center py-12">
      <Icon
        icon="lucide:search-x"
        width="48"
        height="48"
        class="text-base-content/40 mx-auto mb-4"
      />
      <h3 class="text-xl font-semibold text-base-content mb-2">No tasks found</h3>
      <p v-if="searchTerm" class="text-base-content/70 mb-4">
        No tasks match your search for "<strong>{{ searchTerm }}</strong
        >".
        <br />
        Try different keywords or check your spelling.
      </p>
      <p v-else class="text-base-content/70 mb-4">Try adjusting your filters to see more tasks.</p>
      <button v-if="searchTerm" @click="searchTerm = ''" class="btn btn-outline">
        Clear Search
      </button>
    </div>
  </div>
</template>

<style scoped>
.tasks-page {
  max-width: 80rem;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
}

.filters {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .tasks-page {
    padding: 1rem;
  }

  .filters {
    flex-direction: column;
  }

  .header-content {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
