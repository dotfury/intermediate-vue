import { defineStore } from 'pinia'
import type { Task, TaskStatus, TaskFilters } from '../types'
import { useStorage } from '@vueuse/core'

const API_BASE_URL = 'http://localhost:3000'

export const useTaskStore = defineStore('taskStore', {
  state: () => ({
    tasks: useStorage<Task[]>('taskList', []),
    isLoading: false,
    error: null as string | null,
  }),

  getters: {
    taskCount: (state) => state.tasks.length,

    tasksByStatus: (state) => {
      return state.tasks.reduce(
        (acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1
          return acc
        },
        {} as Record<TaskStatus, number>,
      )
    },

    tasksByArea: (state) => {
      const areaCount: Record<string, number> = {}
      state.tasks.forEach((task) => {
        task.areas.forEach((area) => {
          areaCount[area] = (areaCount[area] || 0) + 1
        })
      })
      return areaCount
    },

    uniqueAreas: (state) => {
      const allAreas = state.tasks.flatMap((task) => task.areas)
      return [...new Set(allAreas)].sort()
    },
  },

  actions: {
    async fetchTasks() {
      this.isLoading = true
      this.error = null

      try {
        const response = await fetch(`${API_BASE_URL}/tasks`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const fetchedTasks: Task[] = await response.json()
        this.tasks = fetchedTasks
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch tasks'
        console.error('Error fetching tasks:', err)
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'actualMinutes'>) {
      this.isLoading = true
      this.error = null

      try {
        const newTask: Task = {
          ...taskData,
          id: `task-${Date.now()}`,
          actualMinutes: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        // Optimistic update - add to local state first
        this.tasks.push(newTask)

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
          this.tasks = this.tasks.filter((task) => task.id !== newTask.id)
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const createdTask: Task = await response.json()

        // Update with server response (in case server modified the task)
        const taskIndex = this.tasks.findIndex((task) => task.id === newTask.id)
        if (taskIndex !== -1) {
          this.tasks[taskIndex] = createdTask
        }

        return createdTask
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to create task'
        console.error('Error creating task:', err)
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) {
      this.isLoading = true
      this.error = null

      try {
        const taskIndex = this.tasks.findIndex((task) => task.id === taskId)
        if (taskIndex === -1) {
          throw new Error('Task not found')
        }

        const originalTask = { ...this.tasks[taskIndex] }
        const updatedTask: Task = {
          ...originalTask,
          ...updates,
          updatedAt: new Date().toISOString(),
        }

        // Optimistic update
        this.tasks[taskIndex] = updatedTask

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
          this.tasks[taskIndex] = originalTask
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const serverTask: Task = await response.json()
        this.tasks[taskIndex] = serverTask

        return serverTask
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to update task'
        console.error('Error updating task:', err)
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async deleteTask(taskId: string) {
      this.isLoading = true
      this.error = null

      try {
        const taskIndex = this.tasks.findIndex((task) => task.id === taskId)
        if (taskIndex === -1) {
          throw new Error('Task not found')
        }

        const deletedTask = this.tasks[taskIndex]

        // Optimistic update
        this.tasks.splice(taskIndex, 1)

        // Sync with server
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          // Rollback optimistic update
          this.tasks.splice(taskIndex, 0, deletedTask)
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        return true
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to delete task'
        console.error('Error deleting task:', err)
        throw err
      } finally {
        this.isLoading = false
      }
    },

    // Helper methods
    getTaskById(taskId: string): Task | null {
      return this.tasks.find((task) => task.id === taskId) || null
    },

    getTasksByWeek(weekId: string): Task[] {
      return this.tasks.filter((task) => task.weekId === weekId)
    },

    // Convenience methods for common updates
    async updateTaskStatus(taskId: string, status: TaskStatus) {
      return this.updateTask(taskId, { status })
    },

    async updateTaskTime(taskId: string, actualMinutes: number) {
      return this.updateTask(taskId, { actualMinutes })
    },
  },
})
