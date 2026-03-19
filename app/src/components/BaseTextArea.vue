<template>
  <div class="form-control">
    <label class="label" :for="id">
      <span class="label-text font-medium">{{ label }}</span>
    </label>
    <textarea
      :id="id"
      class="textarea textarea-bordered w-full"
      rows="3"
      v-bind="$attrs"
      v-model="modelValue"
    ></textarea>
  </div>
</template>

<script setup lang="ts">
defineProps({
  id: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
})
defineOptions({
  inheritAttrs: false,
})
const modelValue = defineModel<string>()
</script>

<style scoped></style>
