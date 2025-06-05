import { toValue, type MaybeRefOrGetter } from 'vue'

const API_BASE_URL = 'http://localhost:3000'

export async function useFetch(url: MaybeRefOrGetter<string>) {
  const urlValue = toValue(url)

  const response = await fetch(API_BASE_URL + urlValue)

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}
