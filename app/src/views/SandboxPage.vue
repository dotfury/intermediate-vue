<template>
  <h1>Sandbox</h1>
  <p>First Name: {{ firstName }}</p>
  <p>Last Name: {{ lastName }}</p>
  <BaseTextInput
    id="test-input"
    placeholder="Test Input"
    label="hello"
    v-model:first-name="firstName"
    v-model:last-name="lastName"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseTextInput from '@/components/BaseTextInput.vue'

const firstName = ref('')
const lastName = ref('')
</script>

<style scoped></style>
