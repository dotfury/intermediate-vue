<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import type { Task, Week, TimeEntry } from '@/types'
import { useTimeEntryStore } from '@/stores/timeEntryStore'
import { useTaskStore } from '@/stores/taskStore'
import { weeks } from '@/composables/useWeek'
import { formatDateRange } from '@/utils/datetime'

// Router setup
const route = useRoute()
const router = useRouter()
const timeEntryStore = useTimeEntryStore()

// Use centralized task store
const taskStore = useTaskStore()

// API base URL for week operations
const API_BASE_URL = 'http://localhost:3000'

// Week management logic
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

// Task management logic (duplicated from tasks.vue)
// Use store for task management
const tasks = computed(() => taskStore.tasks)
const taskIsLoading = computed(() => taskStore.isLoading)

// Helper method - Get tasks by week (using store)
const getTasksByWeek = (weekId: string): Task[] => {
  return taskStore.getTasksByWeek(weekId)
}

// Get the current week from route
const weekId = computed(() => route.params.id as string)

// Get the current week data
const currentWeek = computed(() => {
  return getWeekById(weekId.value)
})

// Get tasks for current week
const weekTasks = computed(() => {
  if (!tasks.value || !weekId.value) return []
  return getTasksByWeek(weekId.value)
})

// Get time entries for week tasks
const weekTimeEntries = computed(() => {
  if (!timeEntryStore.timeEntries || !weekTasks.value.length) return []
  const taskIds = weekTasks.value.map((t: Task) => t.id)
  return timeEntryStore.timeEntries.filter((entry: TimeEntry) => taskIds.includes(entry.taskId))
})

// Navigation
const currentWeekIndex = computed(() => {
  if (!weeks.value || !weekId.value) return -1
  return weeks.value.findIndex((w: Week) => w.id === weekId.value)
})

const canGoToPrevious = computed(() => currentWeekIndex.value > 0)
const canGoToNext = computed(
  () => currentWeekIndex.value >= 0 && currentWeekIndex.value < (weeks.value?.length || 0) - 1,
)

const goToPreviousWeek = () => {
  if (canGoToPrevious.value && weeks.value) {
    const prevWeek = weeks.value[currentWeekIndex.value - 1]
    router.push(`/planner/week/${prevWeek.id}`)
  }
}

const goToNextWeek = () => {
  if (canGoToNext.value && weeks.value) {
    const nextWeek = weeks.value[currentWeekIndex.value + 1]
    router.push(`/planner/week/${nextWeek.id}`)
  }
}

const goToCurrentWeek = () => {
  const current = weeks.value?.find((w: Week) => w.isCurrentWeek)
  if (current) {
    router.push(`/planner/week/${current.id}`)
  }
}

const goBackToPlanner = () => {
  router.push('/planner')
}

// Initialize data on component mount
onMounted(async () => {
  await Promise.all([taskStore.fetchTasks(), fetchWeeks(), timeEntryStore.fetchTimeEntries()])
})

// Watch for route changes to handle direct navigation to week pages
watch(
  () => route.params.id,
  async (newWeekId) => {
    if (newWeekId && !currentWeek.value) {
      // If we don't have the week data, try fetching it
      await fetchWeeks()
    }
  },
  { immediate: true },
)

// Loading state
const isLoading = computed(
  () => weekIsLoading.value || taskIsLoading.value || timeEntryStore.isLoading,
)

// Calculate completion stats
const completionStats = computed(() => {
  const total = weekTasks.value.length
  const completed = weekTasks.value.filter((t: Task) => t.status === 'completed').length
  const inProgress = weekTasks.value.filter((t: Task) => t.status === 'in_progress').length
  const notStarted = weekTasks.value.filter((t: Task) => t.status === 'not_started').length

  return {
    total,
    completed,
    inProgress,
    notStarted,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
})

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

// Calculate area breakdown
const areaBreakdown = computed(() => {
  if (!weekTasks.value.length) return []

  const areas: Record<
    string,
    { tasks: number; completed: number; plannedMinutes: number; actualMinutes: number }
  > = {}

  weekTasks.value.forEach((task: Task) => {
    task.areas.forEach((area: string) => {
      if (!areas[area]) {
        areas[area] = { tasks: 0, completed: 0, plannedMinutes: 0, actualMinutes: 0 }
      }
      areas[area].tasks++
      if (task.status === 'completed') areas[area].completed++
      areas[area].plannedMinutes += task.estimatedMinutes || 0
      areas[area].actualMinutes += task.actualMinutes || 0
    })
  })

  return Object.entries(areas).map(([area, stats]) => ({
    area,
    ...stats,
    completionRate: stats.tasks > 0 ? Math.round((stats.completed / stats.tasks) * 100) : 0,
  }))
})

// Calculate daily time distribution
const dailyTimeDistribution = computed(() => {
  if (!currentWeek.value || !weekTimeEntries.value) return []

  const startDate = new Date(currentWeek.value.startDate)
  const days = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    // Extract date from startTime field to match with dateStr
    const dayEntries = weekTimeEntries.value.filter((entry: TimeEntry) => {
      const entryDate = entry.startTime.split('T')[0]
      return entryDate === dateStr
    })
    const totalMinutes = dayEntries.reduce(
      (sum: number, entry: TimeEntry) => sum + entry.minutes,
      0,
    )

    days.push({
      date: dateStr,
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      minutes: totalMinutes,
    })
  }

  return days
})

// Get the maximum minutes for scaling the chart
const maxDailyMinutes = computed(() => {
  const max = Math.max(...dailyTimeDistribution.value.map((d) => d.minutes))
  return max > 0 ? max : 1 // Prevent division by zero
})

// Utility functions
const formatTime = (minutes: number) => {
  if (minutes === 0) return '0 min'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}min`
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header with Navigation -->
    <div class="mb-8">
      <div class="flex items-center gap-4 mb-4">
        <button @click="goBackToPlanner" class="btn btn-ghost btn-circle" title="Back to Planner">
          <Icon icon="lucide:arrow-left" width="20" height="20" />
        </button>

        <div class="flex-1">
          <h1 class="text-4xl font-bold text-primary mb-2">
            {{ currentWeek?.id || weekId }}
          </h1>
          <p v-if="currentWeek" class="text-base-content/70 text-lg">
            {{ formatDateRange(currentWeek.startDate, currentWeek.endDate) }}
          </p>
        </div>

        <!-- Week Navigation -->
        <div class="flex items-center gap-2">
          <button
            @click="goToPreviousWeek"
            :disabled="!canGoToPrevious"
            class="btn btn-circle btn-primary btn-sm"
            :class="{
              'btn-disabled opacity-30 cursor-not-allowed': !canGoToPrevious,
            }"
            title="Previous Week"
          >
            <Icon icon="lucide:chevron-left" width="16" height="16" />
          </button>

          <button
            @click="goToCurrentWeek"
            class="btn btn-primary btn-sm"
            :class="{
              'btn-outline': !currentWeek?.isCurrentWeek,
            }"
            title="Go to Current Week"
          >
            <Icon icon="lucide:calendar-days" width="14" height="14" class="mr-1" />
            Current
          </button>

          <button
            @click="goToNextWeek"
            :disabled="!canGoToNext"
            class="btn btn-circle btn-primary btn-sm"
            :class="{
              'btn-disabled opacity-30 cursor-not-allowed': !canGoToNext,
            }"
            title="Next Week"
          >
            <Icon icon="lucide:chevron-right" width="16" height="16" />
          </button>
        </div>
      </div>

      <div v-if="currentWeek?.isCurrentWeek" class="badge badge-primary mb-4">Current Week</div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-16">
      <div class="loading loading-spinner loading-lg text-primary"></div>
      <p class="mt-4 text-base-content/70">Loading week data...</p>
    </div>

    <!-- Week Not Found -->
    <div v-else-if="!currentWeek" class="text-center py-16">
      <Icon
        icon="lucide:calendar-x"
        width="64"
        height="64"
        class="mx-auto text-base-content/30 mb-4"
      />
      <h3 class="text-xl font-semibold text-base-content/70 mb-2">Week not found</h3>
      <p class="text-base-content/50 mb-4">The requested week could not be found.</p>
      <button @click="goBackToPlanner" class="btn btn-primary">Back to Planner</button>
    </div>

    <!-- Week Content -->
    <div v-else class="space-y-8">
      <!-- Week Overview -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-primary">
              <Icon icon="lucide:target" width="32" height="32" />
            </div>
            <div class="stat-title">Completion Rate</div>
            <div class="stat-value text-primary">{{ completionStats.completionRate }}%</div>
            <div class="stat-desc">
              {{ completionStats.completed }}/{{ completionStats.total }} tasks
            </div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-secondary">
              <Icon icon="lucide:clock" width="32" height="32" />
            </div>
            <div class="stat-title">Time Planned</div>
            <div class="stat-value text-secondary">
              {{ formatTime(currentWeek.totalPlannedMinutes) }}
            </div>
            <div class="stat-desc">estimated time</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-figure text-accent">
              <Icon icon="lucide:activity" width="32" height="32" />
            </div>
            <div class="stat-title">Time Actual</div>
            <div class="stat-value text-accent">
              {{ formatTime(currentWeek.totalActualMinutes) }}
            </div>
            <div class="stat-desc">
              {{
                getProgressPercentage(
                  currentWeek.totalActualMinutes,
                  currentWeek.totalPlannedMinutes,
                )
              }}% of planned
            </div>
          </div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">Weekly Progress</h3>
          <div class="mb-2">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm font-medium">Overall Progress</span>
              <span class="text-xs text-base-content/60">
                {{
                  getProgressPercentage(
                    currentWeek.totalActualMinutes,
                    currentWeek.totalPlannedMinutes,
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
                      currentWeek.totalActualMinutes,
                      currentWeek.totalPlannedMinutes,
                    ),
                  ) === 'completed',
                'progress-warning':
                  getProgressStatus(
                    getProgressPercentage(
                      currentWeek.totalActualMinutes,
                      currentWeek.totalPlannedMinutes,
                    ),
                  ) === 'on-track',
                'progress-error':
                  getProgressStatus(
                    getProgressPercentage(
                      currentWeek.totalActualMinutes,
                      currentWeek.totalPlannedMinutes,
                    ),
                  ) === 'concerning',
                'progress-info':
                  getProgressStatus(
                    getProgressPercentage(
                      currentWeek.totalActualMinutes,
                      currentWeek.totalPlannedMinutes,
                    ),
                  ) === 'behind',
              }"
              :value="
                Math.min(
                  100,
                  getProgressPercentage(
                    currentWeek.totalActualMinutes,
                    currentWeek.totalPlannedMinutes,
                  ),
                )
              "
              max="100"
            ></progress>
          </div>
        </div>
      </div>

      <!-- Daily Time Distribution -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">Daily Time Distribution</h3>
          <div
            v-if="dailyTimeDistribution.length === 0"
            class="text-center py-8 text-base-content/60"
          >
            No time tracking data available for this week.
          </div>
          <div v-else-if="maxDailyMinutes <= 1" class="text-center py-8 text-base-content/60">
            No time entries recorded for this week.
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="day in dailyTimeDistribution"
              :key="day.date"
              class="flex items-center gap-4"
            >
              <div class="w-16 text-sm font-medium text-base-content/70">
                {{ day.day }}
              </div>
              <div class="flex-1 bg-base-200 rounded-full h-6 relative">
                <div
                  class="bg-primary rounded-full h-6 transition-all duration-300 flex items-center justify-end pr-2"
                  :style="{
                    width: `${day.minutes > 0 ? Math.max(15, (day.minutes / maxDailyMinutes) * 100) : 0}%`,
                  }"
                >
                  <span v-if="day.minutes > 0" class="text-xs text-primary-content font-medium">
                    {{ formatTime(day.minutes) }}
                  </span>
                </div>
              </div>
              <div class="w-20 text-sm text-base-content/60">
                {{ formatDate(day.date).split(',')[0] }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tasks by Area -->
      <div v-if="areaBreakdown.length > 0" class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">Performance by Area</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="area in areaBreakdown" :key="area.area" class="card bg-base-200 shadow-sm">
              <div class="card-body p-4">
                <div class="flex justify-between items-center mb-3">
                  <h4 class="font-semibold capitalize">{{ area.area }}</h4>
                  <div
                    class="badge badge-lg font-semibold"
                    :class="{
                      'badge-success': area.completionRate >= 80,
                      'badge-warning': area.completionRate >= 60 && area.completionRate < 80,
                      'badge-info': area.completionRate >= 40 && area.completionRate < 60,
                      'badge-error': area.completionRate < 40,
                    }"
                  >
                    {{ area.completionRate }}%
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="text-center">
                    <div class="text-xs text-base-content/60">Tasks</div>
                    <div class="font-semibold">{{ area.completed }}/{{ area.tasks }}</div>
                  </div>
                  <div class="text-center">
                    <div class="text-xs text-base-content/60">Time</div>
                    <div class="font-semibold">{{ formatTime(area.actualMinutes) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Task List -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h3 class="card-title mb-4">Tasks ({{ weekTasks.length }})</h3>

          <div v-if="weekTasks.length === 0" class="text-center py-8 text-base-content/60">
            <Icon icon="lucide:calendar-x" width="48" height="48" class="mx-auto mb-2" />
            <p>No tasks planned for this week</p>
          </div>

          <div v-else class="space-y-3">
            <div v-for="task in weekTasks" :key="task.id" class="card bg-base-200 shadow-sm">
              <div class="card-body p-4">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <Icon
                        :icon="
                          task.status === 'completed'
                            ? 'lucide:check-circle'
                            : task.status === 'in_progress'
                              ? 'lucide:play-circle'
                              : 'lucide:circle'
                        "
                        width="16"
                        height="16"
                        :class="{
                          'text-success': task.status === 'completed',
                          'text-warning': task.status === 'in_progress',
                          'text-base-content/40': task.status === 'not_started',
                        }"
                      />
                      <h4 class="font-semibold">{{ task.title }}</h4>
                    </div>

                    <p v-if="task.description" class="text-sm text-base-content/70 mb-2">
                      {{ task.description }}
                    </p>

                    <div class="flex flex-wrap gap-1 mb-2">
                      <span
                        v-for="area in task.areas"
                        :key="area"
                        class="badge badge-outline badge-sm"
                      >
                        {{ area }}
                      </span>
                    </div>
                  </div>

                  <div class="text-right">
                    <div class="text-sm text-base-content/60">
                      {{ formatTime(task.actualMinutes) }} / {{ formatTime(task.estimatedMinutes) }}
                    </div>
                    <div
                      class="badge badge-sm"
                      :class="{
                        'badge-success': task.status === 'completed',
                        'badge-warning': task.status === 'in_progress',
                        'badge-ghost': task.status === 'not_started',
                      }"
                    >
                      {{ task.status.replace('_', ' ') }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
