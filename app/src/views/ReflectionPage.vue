<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Icon } from '@iconify/vue'

import { useTimeEntryStore } from '../stores/timeEntryStore'
import { useTaskStore } from '../stores/taskStore'
import type { Task, Week, TimeEntry } from '../types'
import { weeks } from '@/composables/useWeek'

// Use the time entries store
const timeEntryStore = useTimeEntryStore()

// Use the centralized task store
const taskStore = useTaskStore()

// API base URL for weeks (keeping week logic local for now)
const API_BASE_URL = 'http://localhost:3000'

// Use store for task management
const tasks = computed(() => taskStore.tasks)
const taskIsLoading = computed(() => taskStore.isLoading)
const error = computed(() => taskStore.error)

// Task actions - delegate to store
const fetchTasks = () => taskStore.fetchTasks()

// Helper method - Get tasks by week
const getTasksByWeek = (weekId: string): Task[] => {
  return tasks.value.filter((task) => task.weekId === weekId)
}

// Week management logic (simple local state without caching)
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

// Initialize data on component mount
onMounted(async () => {
  await Promise.all([fetchTasks(), fetchWeeks(), timeEntryStore.fetchTimeEntries()])
})

// Loading state
const isLoading = computed(
  () => taskIsLoading.value || weekIsLoading.value || timeEntryStore.isLoading,
)

// Selected week for reflection
const selectedWeekId = ref<string>('')

// Initialize with current week or first week
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

// Get selected week data
const selectedWeek = computed(() => {
  return weeks.value?.find((w: Week) => w.id === selectedWeekId.value)
})

// Get tasks for selected week
const weekTasks = computed(() => {
  if (!tasks.value || !selectedWeekId.value) return []
  return getTasksByWeek(selectedWeekId.value)
})

// Get time entries for selected week tasks
const weekTimeEntries = computed(() => {
  if (!timeEntryStore.timeEntries || !weekTasks.value.length) return []
  const taskIds = weekTasks.value.map((t: Task) => t.id)
  return timeEntryStore.timeEntries.filter((entry: TimeEntry) => taskIds.includes(entry.taskId))
})

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

// Calculate time stats
const timeStats = computed(() => {
  const plannedMinutes = selectedWeek.value?.totalPlannedMinutes || 0
  const actualMinutes = selectedWeek.value?.totalActualMinutes || 0
  const efficiency = plannedMinutes > 0 ? Math.round((actualMinutes / plannedMinutes) * 100) : 0

  return {
    plannedMinutes,
    actualMinutes,
    efficiency,
    variance: actualMinutes - plannedMinutes,
  }
})

// Calculate area breakdown
const areaBreakdown = computed(() => {
  if (!weekTasks.value.length) return []

  const areas: Record<
    string,
    { tasks: number; completed: number; plannedMinutes: number; actualMinutes: number }
  > = {}

  weekTasks.value.forEach((task: Task) => {
    // Since areas is an array, we need to handle each area
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

// Calculate status breakdown (replacing priority breakdown since priority doesn't exist)
const statusBreakdown = computed(() => {
  if (!weekTasks.value.length) return []

  const statuses: Record<string, { tasks: number; percentage: number }> = {
    completed: { tasks: 0, percentage: 0 },
    in_progress: { tasks: 0, percentage: 0 },
    not_started: { tasks: 0, percentage: 0 },
  }

  weekTasks.value.forEach((task: Task) => {
    if (statuses[task.status]) {
      statuses[task.status].tasks++
    }
  })

  const total = weekTasks.value.length
  Object.keys(statuses).forEach((status) => {
    statuses[status].percentage = total > 0 ? Math.round((statuses[status].tasks / total) * 100) : 0
  })

  return Object.entries(statuses).map(([status, stats]) => ({
    status,
    ...stats,
  }))
})

// Calculate daily time distribution
const dailyTimeDistribution = computed(() => {
  if (!selectedWeek.value || !weekTimeEntries.value) return []

  const startDate = new Date(selectedWeek.value.startDate)
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

// Format time helper
const formatTime = (minutes: number) => {
  if (minutes === 0) return '0 min'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}min`
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
      <h1 class="text-4xl font-bold text-primary mb-2">Weekly Reflection</h1>
      <p class="text-base-content/70 text-lg">
        Analyze your productivity patterns and gain insights
      </p>
    </div>

    <!-- Week Selector -->
    <div v-if="!isLoading" class="card bg-primary/5 shadow-sm mb-8">
      <div class="card-body">
        <div class="form-control">
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
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-16">
      <div class="loading loading-spinner loading-lg text-primary"></div>
      <p class="mt-4 text-base-content/70">Loading your reflection data...</p>
    </div>

    <div v-else-if="selectedWeek" class="space-y-8">
      <!-- Key Metrics -->
      <div>
        <h2 class="text-2xl font-semibold text-primary mb-6">Key Metrics</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div class="stat-title">Time Efficiency</div>
              <div class="stat-value text-secondary">{{ timeStats.efficiency }}%</div>
              <div class="stat-desc">
                {{ formatTime(timeStats.actualMinutes) }} /
                {{ formatTime(timeStats.plannedMinutes) }}
              </div>
            </div>
          </div>

          <div class="stats shadow">
            <div class="stat">
              <div
                class="stat-figure"
                :class="{
                  'text-success': timeStats.variance >= 0,
                  'text-error': timeStats.variance < 0,
                }"
              >
                <Icon
                  :icon="timeStats.variance >= 0 ? 'lucide:trending-up' : 'lucide:trending-down'"
                  width="32"
                  height="32"
                />
              </div>
              <div class="stat-title">Time Variance</div>
              <div
                class="stat-value"
                :class="{
                  'text-success': timeStats.variance >= 0,
                  'text-error': timeStats.variance < 0,
                }"
              >
                {{ timeStats.variance >= 0 ? '+' : ''
                }}{{ formatTime(Math.abs(timeStats.variance)) }}
              </div>
              <div class="stat-desc">vs. planned time</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Daily Distribution -->
      <div>
        <h2 class="text-2xl font-semibold text-primary mb-6">Daily Time Distribution</h2>
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <div
              v-if="dailyTimeDistribution.length === 0"
              class="text-center py-8 text-base-content/60"
            >
              No time tracking data available for this week.
            </div>
            <div v-else-if="maxDailyMinutes <= 1" class="text-center py-8 text-base-content/60">
              No time entries recorded for this week.
            </div>
            <div v-else class="flex justify-between items-end h-full gap-2">
              <div
                v-for="day in dailyTimeDistribution"
                :key="day.date"
                class="flex flex-col items-center flex-1"
              >
                <div
                  class="w-8 bg-base-300 rounded-t flex-1 flex items-end overflow-hidden min-h-4"
                >
                  <div
                    class="w-full bg-primary rounded-t transition-all duration-300"
                    :style="{
                      height: `${day.minutes > 0 ? Math.max(5, (day.minutes / maxDailyMinutes) * 100) : 0}px`,
                    }"
                  ></div>
                </div>

                <div class="text-xs font-medium text-primary mt-2">
                  <p class="text-center text-xs text-base-content/60 mb-2">{{ day.day }}</p>

                  <p>{{ formatTime(day.minutes) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Area Breakdown -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 class="text-2xl font-semibold text-primary mb-6">Performance by Area</h2>
          <div class="space-y-4">
            <div v-for="area in areaBreakdown" :key="area.area" class="card bg-base-100 shadow">
              <div class="card-body">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="card-title text-lg capitalize">{{ area.area }}</h3>
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
                <div class="grid grid-cols-2 gap-4">
                  <div class="stat bg-base-200 rounded-lg p-3">
                    <div class="stat-title text-xs">Tasks</div>
                    <div class="stat-value text-sm">{{ area.completed }}/{{ area.tasks }}</div>
                  </div>
                  <div class="stat bg-base-200 rounded-lg p-3">
                    <div class="stat-title text-xs">Time</div>
                    <div class="stat-value text-sm">{{ formatTime(area.actualMinutes) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Status Breakdown -->
        <div>
          <h2 class="text-2xl font-semibold text-primary mb-6">Task Status Distribution</h2>
          <div class="space-y-4">
            <div
              v-for="status in statusBreakdown"
              :key="status.status"
              class="card bg-base-100 shadow"
            >
              <div class="card-body">
                <div class="flex justify-between items-center mb-3">
                  <div class="flex items-center gap-2">
                    <Icon
                      :icon="
                        status.status === 'completed'
                          ? 'lucide:check'
                          : status.status === 'in_progress'
                            ? 'lucide:clock'
                            : 'lucide:circle'
                      "
                      width="16"
                      height="16"
                      :class="{
                        'text-success': status.status === 'completed',
                        'text-warning': status.status === 'in_progress',
                        'text-base-content/40': status.status === 'not_started',
                      }"
                    />
                    <span class="font-medium capitalize">
                      {{ status.status.replace('_', ' ') }}
                    </span>
                  </div>
                  <span class="font-semibold">{{ status.percentage }}%</span>
                </div>
                <progress
                  class="progress w-full"
                  :class="{
                    'progress-success': status.status === 'completed',
                    'progress-warning': status.status === 'in_progress',
                    'progress-info': status.status === 'not_started',
                  }"
                  :value="status.percentage"
                  max="100"
                ></progress>
                <div class="text-xs text-base-content/60 mt-1">{{ status.tasks }} tasks</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Task Details -->
      <div>
        <h2 class="text-2xl font-semibold text-primary mb-6">Task Summary</h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              <h3 class="card-title text-success gap-2 mb-4">
                <Icon icon="lucide:check-circle" width="20" height="20" />
                Completed ({{ completionStats.completed }})
              </h3>
              <div class="space-y-3">
                <div
                  v-for="task in weekTasks.filter((t: Task) => t.status === 'completed')"
                  :key="task.id"
                  class="p-3 bg-success/10 border border-success/20 rounded-lg"
                >
                  <div class="font-medium text-base-content">{{ task.title }}</div>
                  <div class="text-sm text-base-content/60 mt-1">
                    {{ task.areas.join(', ') }} • {{ formatTime(task.actualMinutes) }}
                  </div>
                </div>
                <div
                  v-if="completionStats.completed === 0"
                  class="text-center text-base-content/50 py-4"
                >
                  No completed tasks this week
                </div>
              </div>
            </div>
          </div>

          <div
            class="card bg-base-100 shadow"
            v-if="completionStats.inProgress > 0 || completionStats.notStarted > 0"
          >
            <div class="card-body">
              <h3 class="card-title text-warning gap-2 mb-4">
                <Icon icon="lucide:circle-dashed" width="20" height="20" />
                Incomplete ({{ completionStats.inProgress + completionStats.notStarted }})
              </h3>
              <div class="space-y-3">
                <div
                  v-for="task in weekTasks.filter((t: Task) => t.status !== 'completed')"
                  :key="task.id"
                  class="p-3 bg-warning/10 border border-warning/20 rounded-lg"
                >
                  <div class="font-medium text-base-content">{{ task.title }}</div>
                  <div class="text-sm text-base-content/60 mt-1">
                    {{ task.areas.join(', ') }} •
                    <span
                      class="badge badge-sm"
                      :class="{
                        'badge-warning': task.status === 'in_progress',
                        'badge-ghost': task.status === 'not_started',
                      }"
                    >
                      {{ task.status.replace('_', ' ') }}
                    </span>
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
/* Custom animations for loading spinner if needed */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Minimal responsive adjustments */
@media (max-width: 640px) {
  .stats {
    width: 100%;
  }
}
</style>
