# Symptom Frequency Chart Implementation

## Overview
Implemented a Victory.js line chart that visualizes symptom frequency over time, integrated with the existing recurring symptom analysis feature.

## What Was Implemented

### 1. New Files Created

#### `src/lib/symptomChartData.js`
- **Purpose**: Data processing and aggregation logic for the chart
- **Key Functions**:
  - `getTimeUnit(entries)`: Automatically switches between weeks and months based on data span
    - Uses **weeks** for < 60 days of data
    - Switches to **months** for ≥ 60 days of data
  - `getWeekStart(date)`: Gets the start of the week (Sunday) for grouping
  - `getMonthStart(date)`: Gets the start of the month for grouping
  - `formatPeriod(date, timeUnit)`: Formats dates for display on x-axis
  - `generateChartData(entries, recurringTerms)`: Main aggregation function
    - Groups entries by time period (week or month)
    - Counts symptom frequency per period
    - Returns structured data for Victory charts
  - `getSymptomColor(index)`: Assigns consistent colors to each symptom (12-color palette)

#### `src/components/SymptomFrequencyChart.jsx`
- **Purpose**: React component that renders the Victory line chart
- **Features**:
  - Multi-line chart with one line per recurring symptom
  - Interactive tooltips showing frequency on hover
  - Color-coded legend
  - Responsive design
  - Empty state handling
  - Displays current time unit (weeks/months)
- **Victory Components Used**:
  - `VictoryChart`: Main chart container
  - `VictoryLine`: One per symptom, creates the frequency lines
  - `VictoryAxis`: X-axis (time) and Y-axis (frequency)
  - `VictoryLegend`: Shows which color represents which symptom
  - `VictoryVoronoiContainer`: Enables interactive tooltips

### 2. Updated Files

#### `src/components/AnalysisView.jsx`
- Added import for `SymptomFrequencyChart`
- Integrated chart between recurring words section and matching entries list
- Chart only displays when there are recurring symptoms

#### `src/i18n/locales/en.json`
- Added 11 new translation keys for the chart:
  - `noChartData`: "Add more entries to see the frequency chart."
  - `symptomFrequencyChart`: "Symptom frequency over time"
  - `timeUnit`: "Time unit"
  - `weeks`: "Weeks"
  - `months`: "Months"
  - `timeAxisWeeks`: "Week"
  - `timeAxisMonths`: "Month"
  - `frequencyAxis`: "Frequency (entries)"
  - `entry`: "entry" (singular)
  - `entries`: "entries" (plural)
  - `chartDescription`: "Tracking {count} entries over time, grouped by {timeUnit}."

#### `src/index.css`
- Added comprehensive styling for chart container
- Chart header with time unit badge
- Empty state styling
- Description text styling
- Victory SVG container styling

#### `package.json` (via npm install)
- Added `victory` package and its dependencies

## How It Works

### Data Flow
1. **Analysis View** passes `entries` and `recurringTerms` to the chart
2. **Chart Component** calls `generateChartData()` to process the data:
   - Determines time unit (weeks vs months)
   - Groups entries by time period
   - Extracts symptoms from each entry using `wordsInEntry()`
   - Counts frequency of each recurring symptom per period
   - Creates a data series for each symptom
3. **Victory Chart** renders multiple `VictoryLine` components:
   - One line per symptom
   - Each with unique color from palette
   - X-axis shows time periods
   - Y-axis shows frequency count

### Automatic Time Unit Switching
```javascript
// Example timeline behavior:

Week 1-8 (0-59 days):
X-axis: "Sep 1", "Sep 8", "Sep 15", "Sep 22", "Sep 29", "Oct 6", "Oct 13", "Oct 20"
Time unit: "Weeks"

Month 3+ (60+ days):
X-axis: "Sep 2026", "Oct 2026", "Nov 2026", "Dec 2026"
Time unit: "Months"
```

### Color Palette
12 distinct colors for up to 12 different symptoms:
- Blue (#2563eb)
- Red (#dc2626)
- Green (#16a34a)
- Purple (#9333ea)
- Orange (#ea580c)
- Cyan (#0891b2)
- Fuchsia (#c026d3)
- Lime (#65a30d)
- Rose (#e11d48)
- Sky (#0284c7)
- Violet (#7c3aed)
- Emerald (#059669)

Colors cycle if there are more than 12 symptoms.

## User Experience

### View Structure (Analysis Tab)
1. **Recurring Words Section** (existing)
   - Clickable symptom tags with counts
   
2. **📊 NEW: Symptom Frequency Chart**
   - Multi-line chart showing trends
   - Interactive tooltips
   - Legend identifying each symptom
   - Time unit badge
   
3. **Matching Entries Section** (existing)
   - List of entries with recurring words
   
4. **Generated Summary Section** (existing)
   - AI-powered summary and patterns

### Chart Features
- **Responsive**: Adapts to container width
- **Interactive**: Hover to see exact frequency counts
- **Accessible**: Proper labels and ARIA attributes
- **Internationalized**: All text uses i18n system
- **Performance**: Only renders when data is available

## Testing Checklist

To test the implementation:

1. **Start the dev server**:
   ```bash
   npm run dev
   ```

2. **Create test data**:
   - Add at least 3-4 entries with common symptoms
   - Use words like "headache", "nausea", "pain", "fatigue"
   - Space them out over different dates

3. **Navigate to Analysis tab**:
   - Should see recurring words as buttons
   - Chart should appear below the recurring words

4. **Verify weekly view**:
   - With < 60 days of data, should show "Weeks"
   - X-axis labels show dates

5. **Test monthly view** (optional):
   - Create entries spanning 60+ days
   - Chart should automatically switch to "Months"
   - X-axis labels show month/year

6. **Test interactions**:
   - Hover over lines to see tooltips
   - Check legend matches line colors
   - Verify multiple symptoms show as different colored lines

## Future Enhancements

Possible additions:
- Date range filter (last 7 days, last month, last 3 months, all time)
- Click legend to toggle symptom visibility
- Export chart as image
- Severity tracking (if added to data model)
- Comparison view (this month vs last month)
- Bar chart alternative view
- Annotation markers for important events

## Dependencies

- **victory**: ^36.x (React charting library)
- Integrates with existing:
  - React 18.3.1
  - Existing analysis logic
  - i18n system
  - Tailwind CSS styling

## Files Summary

**Created**:
- `src/lib/symptomChartData.js` (117 lines)
- `src/components/SymptomFrequencyChart.jsx` (85 lines)

**Modified**:
- `src/components/AnalysisView.jsx` (added import + chart section)
- `src/i18n/locales/en.json` (added 11 translation keys)
- `src/index.css` (added ~60 lines of chart styles)
- `package.json` (added victory dependency)

**Total**: ~300 lines of new code
