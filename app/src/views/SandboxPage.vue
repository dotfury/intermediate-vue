<script setup lang="ts">
import BaseTextInput from '@/components/BaseTextInput.vue'
import { ref } from 'vue'

const firstName = ref('')
const lastName = ref('')
</script>

<template>
  <main>
    <h1>Sandbox Page</h1>
    <p>{{ firstName }} - {{ lastName }}</p>
    <BaseTextInput
      id="first-name"
      placeholder="My test placeholder"
      v-model:first-name="firstName"
      v-model:last-name="lastName"
      label="First name"
    />
  </main>
</template>

<style scoped></style>
