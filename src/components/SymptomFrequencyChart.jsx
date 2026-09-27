import { VictoryChart, VictoryLine, VictoryAxis, VictoryLegend, VictoryTheme, VictoryTooltip, VictoryVoronoiContainer } from 'victory'
import { generateChartData, getSymptomColor } from '../lib/symptomChartData.js'
import { useLanguage } from '../i18n/LanguageContext.jsx'

export default function SymptomFrequencyChart({ entries, recurringTerms }) {
  const { t } = useLanguage()
  
  const { data: chartData, timeUnit, symptoms } = generateChartData(entries, recurringTerms)

  if (chartData.length === 0) {
    return (
      <div className="chart-empty-state">
        <p>{t('noChartData')}</p>
      </div>
    )
  }

  // Prepare legend data
  const legendData = symptoms.map((symptom, index) => ({
    name: symptom,
    symbol: { fill: getSymptomColor(index) }
  }))

  // Find max frequency for y-axis
  const maxFrequency = Math.max(
    ...chartData.flatMap(series => series.data.map(d => d.frequency)),
    5 // minimum of 5 for better scale
  )

  return (
    <div className="symptom-chart-container">
      <div className="chart-header">
        <h3>{t('symptomFrequencyChart')}</h3>
        <span className="chart-time-unit">
          {t('timeUnit')}: {timeUnit === 'week' ? t('weeks') : t('months')}
        </span>
      </div>
      
      <VictoryChart
        theme={VictoryTheme.material}
        height={300}
        padding={{ top: 20, bottom: 60, left: 50, right: 20 }}
        containerComponent={
          <VictoryVoronoiContainer
            labels={({ datum }) => `${datum.frequency} ${datum.frequency === 1 ? t('entry') : t('entries')}`}
          />
        }
      >
        <VictoryAxis
          label={timeUnit === 'week' ? t('timeAxisWeeks') : t('timeAxisMonths')}
          style={{
            axisLabel: { padding: 40, fontSize: 12, fill: '#647066' },
            tickLabels: { fontSize: 10, padding: 5, angle: -45, textAnchor: 'end', fill: '#647066' }
          }}
        />
        
        <VictoryAxis
          dependentAxis
          label={t('frequencyAxis')}
          style={{
            axisLabel: { padding: 40, fontSize: 12, fill: '#647066' },
            tickLabels: { fontSize: 10, padding: 5, fill: '#647066' }
          }}
          tickFormat={(tick) => Math.round(tick)}
          domain={[0, maxFrequency]}
        />

        {chartData.map((series, index) => (
          <VictoryLine
            key={series.symptom}
            data={series.data}
            x="period"
            y="frequency"
            style={{
              data: { 
                stroke: getSymptomColor(index),
                strokeWidth: 2.5
              }
            }}
            interpolation="monotoneX"
          />
        ))}

        <VictoryLegend
          x={50}
          y={10}
          orientation="horizontal"
          gutter={20}
          style={{
            labels: { fontSize: 10, fill: '#1a1f1d' }
          }}
          data={legendData}
          itemsPerRow={4}
        />
      </VictoryChart>

      <p className="chart-description">
        {t('chartDescription', { 
          count: entries.length,
          timeUnit: timeUnit === 'week' ? t('weeks') : t('months')
        })}
      </p>
    </div>
  )
}
