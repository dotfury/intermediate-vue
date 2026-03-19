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
  <BaseTextArea
    id="test-textarea"
    label="Description"
    placeholder="Enter description"
    v-model:description="desc"
  />
  <p>Description: {{ desc }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseTextInput from '@/components/BaseTextInput.vue'
import BaseTextArea from '@/components/BaseTextArea.vue'

const firstName = ref('')
const lastName = ref('')
const desc = ref('')
</script>

<style scoped></style>
