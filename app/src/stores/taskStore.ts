import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Task, TaskStatus, TaskFilters } from '../types'
import { useStorage } from '@vueuse/core'

const API_BASE_URL = 'http://localhost:3000'

export const useTaskStore = defineStore('taskStore', () => {
  const tasks = useStorage<Task[]>('taskList', [])
  const isLoading = ref(false)
  const error = ref(null as string | null)

  // getters - computed
  const taskCount = computed(() => tasks.value.length)

  const tasksByStatus = computed(() => {
    return tasks.value.reduce(
      (acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1
        return acc
      },
      {} as Record<TaskStatus, number>,
    )
  })

  const tasksByArea = computed(() => {
    const areaCount: Record<string, number> = {}
    tasks.value.forEach((task) => {
      task.areas.forEach((area) => {
        areaCount[area] = (areaCount[area] || 0) + 1
      })
    })
    return areaCount
  })

  const uniqueAreas = computed(() => {
    const allAreas = tasks.value.flatMap((task) => task.areas)
    return [...new Set(allAreas)].sort()
  })

  // actions
  async function fetchTasks() {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE_URL}/tasks`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const fetchedTasks: Task[] = await response.json()
      tasks.value = fetchedTasks
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch tasks'
      console.error('Error fetching tasks:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createTask(
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'actualMinutes'>,
  ) {
    isLoading.value = true
    error.value = null

    try {
      const newTask: Task = {
        ...taskData,
        id: `task-${Date.now()}`,
        actualMinutes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Optimistic update - add to local state first
      tasks.value.push(newTask)

      // Then sync with server
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTask),
      })

      if (!response.ok) {
        // Rollback optimistic update
        tasks.value = tasks.value.filter((task) => task.id !== newTask.id)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const createdTask: Task = await response.json()

      // Update with server response (in case server modified the task)
      const taskIndex = tasks.value.findIndex((task) => task.id === newTask.id)
      if (taskIndex !== -1) {
        tasks.value[taskIndex] = createdTask
      }

      return createdTask
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create task'
      console.error('Error creating task:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) {
    isLoading.value = true
    error.value = null

    try {
      const taskIndex = tasks.value.findIndex((task) => task.id === taskId)
      if (taskIndex === -1) {
        throw new Error('Task not found')
      }

      const originalTask = { ...tasks.value[taskIndex] }
      const updatedTask: Task = {
        ...originalTask,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      // Optimistic update
      tasks.value[taskIndex] = updatedTask

      // Sync with server
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTask),
      })

      if (!response.ok) {
        // Rollback optimistic update
        tasks.value[taskIndex] = originalTask
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const serverTask: Task = await response.json()
      tasks.value[taskIndex] = serverTask

      return serverTask
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update task'
      console.error('Error updating task:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function deleteTask(taskId: string) {
    isLoading.value = true
    error.value = null

    try {
      const taskIndex = tasks.value.findIndex((task) => task.id === taskId)
      if (taskIndex === -1) {
        throw new Error('Task not found')
      }

      const deletedTask = tasks.value[taskIndex]

      // Optimistic update
      tasks.value.splice(taskIndex, 1)

      // Sync with server
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        // Rollback optimistic update
        tasks.value.splice(taskIndex, 0, deletedTask)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete task'
      console.error('Error deleting task:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Helper methods
  function getTaskById(taskId: string): Task | null {
    return tasks.value.find((task) => task.id === taskId) || null
  }

  function getTasksByWeek(weekId: string): Task[] {
    return tasks.value.filter((task) => task.weekId === weekId)
  }

  // Convenience methods for common updates
  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    return updateTask(taskId, { status })
  }

  async function updateTaskTime(taskId: string, actualMinutes: number) {
    return updateTask(taskId, { actualMinutes })
  }

  return {
    // state
    tasks,
    isLoading,
    error,
    // getters
    taskCount,
    tasksByStatus,
    tasksByArea,
    uniqueAreas,
    // actions
    createTask,
    updateTask,
    deleteTask,
    getTaskById,
    getTasksByWeek,
    updateTaskStatus,
    updateTaskTime,
  }
})
