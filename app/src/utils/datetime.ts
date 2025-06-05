export const formatDateRange = (startDate: string, endDate: string) => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
}
