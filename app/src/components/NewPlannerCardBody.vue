<script setup lang="ts">
import type { Task } from '@/types'
import type { PropType } from 'vue'
import { useSlots } from 'vue'
import { onMounted } from 'vue'
import { ref } from 'vue'

const props = defineProps({
  taskList: {
    type: Array as PropType<Task[]>,
    required: true,
  },
  isExpanded: {
    type: Boolean,
    default: false,
  },
})

const isVisible = ref(false)

function toggleExpanded() {
  isVisible.value = !isVisible.value
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

const slots = useSlots()

onMounted(() => {
  isVisible.value = props.isExpanded
})
</script>

<template>
  <div class="border-t border-base-300 pt-4">
    <h1>HELLOOOOO</h1>
    <div v-if="slots.taskList" class="space-y-2">
      <slot name="taskList" :taskList="taskList">
        <div
          v-for="(task, index) in taskList"
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
      </slot>

      <button
        v-if="taskList.length > 3"
        @click="toggleExpanded"
        class="btn btn-ghost btn-sm w-full gap-2 mt-2"
      >
        <span v-if="!isExpanded"> +{{ taskList.length - 3 }} more tasks </span>
        <span v-else>Show less</span>
        <Icon
          :icon="isExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'"
          width="14"
          height="14"
        />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
