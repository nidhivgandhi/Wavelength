import { wordsInEntry } from './analysis.js'

function getDayStart(date) {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  return day
}

// Weeks begin on Sunday.
function getWeekStart(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = d.getDate() - day
  d.setDate(diff)
  return d
}

// Get the start of the month for a given date
function getMonthStart(date) {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function getYearStart(date) {
  const d = new Date(date)
  return new Date(d.getFullYear(), 0, 1)
}

// Format a date for display based on time unit
function formatPeriod(date, timeUnit) {
  if (timeUnit === 'day') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  if (timeUnit === 'month') {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
  if (timeUnit === 'year') return String(date.getFullYear())
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Generate chart data from entries
export function generateChartData(entries, recurringTerms, timeUnit = 'week') {
  if (entries.length === 0 || recurringTerms.length === 0) {
    return { data: [], timeUnit, symptoms: [] }
  }

  const periodStart = {
    day: getDayStart,
    week: getWeekStart,
    month: getMonthStart,
    year: getYearStart,
  }[timeUnit] || getWeekStart
  
  // Map each entry to its time period and extract symptoms
  const periodMap = new Map() // period key -> { date, symptomCounts: Map(symptom -> count) }
  
  entries.forEach(entry => {
    const entryDate = new Date(entry.created_at)
    const period = periodStart(entryDate)
    const periodKey = period.getTime() // Use timestamp as key for proper sorting
    
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
  
  // If we only have one period, add a baseline period before it (all symptoms at 0)
  if (sortedPeriods.length === 1) {
    const onlyPeriod = sortedPeriods[0]
    const baselineDate = new Date(onlyPeriod.date)
    
    if (timeUnit === 'day') baselineDate.setDate(baselineDate.getDate() - 1)
    else if (timeUnit === 'week') baselineDate.setDate(baselineDate.getDate() - 7)
    else if (timeUnit === 'month') baselineDate.setMonth(baselineDate.getMonth() - 1)
    else baselineDate.setFullYear(baselineDate.getFullYear() - 1)
    
    const baselinePeriod = {
      date: baselineDate,
      symptomCounts: new Map() // Empty - all symptoms at 0
    }
    
    sortedPeriods.unshift(baselinePeriod)
  }
  
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
