import { wordsInEntry } from './analysis.js'

// Determine if we should use weeks or months based on the time span
function getTimeUnit(entries) {
  if (entries.length === 0) return 'week'
  
  const dates = entries.map(e => new Date(e.created_at)).sort((a, b) => a - b)
  const firstDate = dates[0]
  const lastDate = dates[dates.length - 1]
  const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24)
  
  // Use months if we have 60+ days (roughly 2 months) of data
  return daysDiff >= 60 ? 'month' : 'week'
}

// Get the start of the week for a given date (Sunday)
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}

// Get the start of the month for a given date
function getMonthStart(date) {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

// Format a date for display based on time unit
function formatPeriod(date, timeUnit) {
  if (timeUnit === 'month') {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
  // For weeks, show the start date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Generate chart data from entries
export function generateChartData(entries, recurringTerms) {
  if (entries.length === 0 || recurringTerms.length === 0) {
    return { data: [], timeUnit: 'week', symptoms: [] }
  }

  const timeUnit = getTimeUnit(entries)
  const periodStart = timeUnit === 'month' ? getMonthStart : getWeekStart
  
  // Map each entry to its time period and extract symptoms
  const periodMap = new Map() // period key -> { date, symptomCounts: Map(symptom -> count) }
  
  entries.forEach(entry => {
    const entryDate = new Date(entry.created_at)
    const period = periodStart(entryDate)
    const periodKey = period.toISOString()
    
    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, {
        date: period,
        symptomCounts: new Map()
      })
    }
    
    const periodData = periodMap.get(periodKey)
    const symptoms = wordsInEntry(entry)
    
    // Only count symptoms that are in the recurring terms
    const recurringWords = new Set(recurringTerms.map(t => t.word))
    symptoms.forEach(symptom => {
      if (recurringWords.has(symptom)) {
        periodData.symptomCounts.set(
          symptom,
          (periodData.symptomCounts.get(symptom) || 0) + 1
        )
      }
    })
  })

  // Sort periods chronologically
  const sortedPeriods = Array.from(periodMap.values()).sort((a, b) => a.date - b.date)
  
  // Get all unique symptoms across all periods
  const allSymptoms = new Set()
  sortedPeriods.forEach(period => {
    period.symptomCounts.forEach((_, symptom) => allSymptoms.add(symptom))
  })
  
  // Generate data series for each symptom
  const symptomSeries = Array.from(allSymptoms).map(symptom => ({
    symptom,
    data: sortedPeriods.map(period => ({
      period: formatPeriod(period.date, timeUnit),
      periodDate: period.date,
      frequency: period.symptomCounts.get(symptom) || 0
    }))
  }))

  return {
    data: symptomSeries,
    timeUnit,
    symptoms: Array.from(allSymptoms)
  }
}

// Generate a consistent color palette for symptoms
export function getSymptomColor(index) {
  const colors = [
    '#2563eb', // blue
    '#dc2626', // red
    '#16a34a', // green
    '#9333ea', // purple
    '#ea580c', // orange
    '#0891b2', // cyan
    '#c026d3', // fuchsia
    '#65a30d', // lime
    '#e11d48', // rose
    '#0284c7', // sky
    '#7c3aed', // violet
    '#059669', // emerald
  ]
  return colors[index % colors.length]
}
