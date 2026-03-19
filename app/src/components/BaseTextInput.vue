<template>
  <div class="form-control">
    <label class="label" :for="id">
      <span class="label-text font-medium">{{ label }}</span>
    </label>
    <input
      :id="id"
      class="input input-bordered w-full"
      type="text"
      placeholder="Enter task title..."
      v-model="firstName"
    />
    <input
      :id="id"
      class="input input-bordered w-full"
      type="text"
      placeholder="Enter task title..."
      v-model="lastName"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
})
const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
})
const firstName = defineModel<string>('firstName')
const lastName = defineModel<string>('lastName')
</script>

<style scoped></style>
