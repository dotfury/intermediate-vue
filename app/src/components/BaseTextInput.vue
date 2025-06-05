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

<template>
  <div class="form-control">
    <label class="label" :for="id">
      <span class="label-text font-medium">{{ label }}</span>
    </label>
    <input :id="id" v-model="firstName" class="input input-bordered w-full" type="text" />
    <input :id="id" v-model="lastName" class="input input-bordered w-full" type="text" />
  </div>
</template>

<style scoped></style>
