import type { Task, TaskFilters } from '@/types'
import type { MaybeRefOrGetter } from 'vue'
import { ref, toValue } from 'vue'

export function filterTasks(
  taskList: MaybeRefOrGetter<Task[]>,
  filters: MaybeRefOrGetter<TaskFilters>,
): Task[] {
  // Always forces an unwrapped value
  const tasks = toValue(taskList)

  // Always forces a reactive value
  const reactiveTasks = ref(taskList)

  return taskList.filter((task) => {
    // Week filter
    if (filters.weekId && filters.weekId !== 'all' && task.weekId !== filters.weekId) {
      return false
    }

    // Status filter
    if (filters.status && filters.status !== 'all' && task.status !== filters.status) {
      return false
    }

    // Area filter
    if (filters.area && filters.area !== 'all' && !task.areas.includes(filters.area)) {
      return false
    }

    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      const matchesTitle = task.title.toLowerCase().includes(searchLower)
      const matchesDescription = task.description?.toLowerCase().includes(searchLower)
      if (!matchesTitle && !matchesDescription) {
        return false
      }
    }

    return true
  })
}

// Format status label
export const formatTaskStatusLabel = (status: string) => {
  return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

// Default export example
// export default function () {
//   function filterTasks(taskList: Task[], filters: TaskFilters): Task[] {
//     return taskList.filter((task) => {
//       // Week filter
//       if (filters.weekId && filters.weekId !== 'all' && task.weekId !== filters.weekId) {
//         return false
//       }

//       // Status filter
//       if (filters.status && filters.status !== 'all' && task.status !== filters.status) {
//         return false
//       }

//       // Area filter
//       if (filters.area && filters.area !== 'all' && !task.areas.includes(filters.area)) {
//         return false
//       }

//       // Search term filter
//       if (filters.searchTerm) {
//         const searchLower = filters.searchTerm.toLowerCase()
//         const matchesTitle = task.title.toLowerCase().includes(searchLower)
//         const matchesDescription = task.description?.toLowerCase().includes(searchLower)
//         if (!matchesTitle && !matchesDescription) {
//           return false
//         }
//       }

//       return true
//     })
//   }

//   // Format status label
//   const formatTaskStatusLabel = (status: string) => {
//     return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
//   }

//   return {
//     filterTasks,
//     formatTaskStatusLabel,
//   }
// }
