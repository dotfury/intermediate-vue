<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
})

defineProps({
  id: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  placeholder: {
    type: String,
    required: true,
  },
})

const modelValue = defineModel<string>()
</script>

<template>
  <div class="form-control">
    <label class="label" :for="id">
      <span class="label-text font-medium">{{ label }}</span>
    </label>
    <textarea
      :id="id"
      v-model="modelValue"
      class="textarea textarea-bordered w-full"
      rows="3"
      :placeholder="placeholder"
      v-bind="$attrs"
    ></textarea>
  </div>
</template>

<style lang="scss" scoped></style>
