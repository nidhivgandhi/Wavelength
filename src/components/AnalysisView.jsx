import { useEffect, useRef, useState } from 'react'
import { findRecurringEntries, generateEntrySummary } from '../lib/analysis.js'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import SymptomFrequencyChart from './SymptomFrequencyChart.jsx'

export default function AnalysisView({ entries, loading, aiProcessingEnabled = true }) {
  const { language, locale, t } = useLanguage()
  const [selectedTerms, setSelectedTerms] = useState(null)
  const [chartTimeUnit, setChartTimeUnit] = useState('week')
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)
  const [pdfError, setPdfError] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const chartRef = useRef(null)
  const { terms, matchingEntries, entryWords } = findRecurringEntries(entries)
  const selectedTermWords = terms
    .filter(({ word }) => selectedTerms === null || selectedTerms.includes(word))
    .map(({ word }) => word)
  const selectedEntries = matchingEntries.filter((entry) =>
    selectedTermWords.some((word) => entryWords.get(entry.id)?.has(word)),
  )

  function toggleTerm(word) {
    setSelectedTerms((current) => {
      const next = new Set(current ?? terms.map((term) => term.word))
      if (next.has(word)) next.delete(word)
      else next.add(word)
      return [...next]
    })
    setSummary(null)
    setError(null)
  }

  useEffect(() => {
    if (!aiProcessingEnabled) {
      setSummary(null)
      setError(null)
    }
  }, [aiProcessingEnabled])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    setPdfError(false)
    setSummary(null)
    try {
      setSummary(await generateEntrySummary(selectedEntries, language, selectedTermWords))
    } catch (cause) {
      setError(cause.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleDownloadPdf() {
    setExporting(true)
    setError(null)
    setPdfError(false)
    try {
      const reportSummary = summary || await generateEntrySummary(selectedEntries, language, selectedTermWords)
      if (!summary) setSummary(reportSummary)

      const { downloadAnalysisPdf } = await import('../lib/pdfReport.js')
      await downloadAnalysisPdf({
        title: t('analysisTitle'),
        generatedOn: new Date().toLocaleDateString(locale, { dateStyle: 'long' }),
        labels: {
          generatedOn: t('pdfGeneratedOn'),
          recurringWords: t('recurringWords'),
          summary: t('generatedSummary'),
          disclaimer: t('summaryDisclaimer'),
          recurringDetails: t('recurringDetails'),
          chart: t('symptomFrequencyChart'),
        },
        terms: terms.filter(({ word }) => selectedTermWords.includes(word)),
        summary: reportSummary.summary,
        patterns: reportSummary.patterns || [],
        chartSvg: chartRef.current?.querySelector('svg') || null,
      })
    } catch (cause) {
      setError(t('pdfExportError', { message: cause.message }))
      setPdfError(true)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="analysis-view">
      <section className="entry-panel">
        <div>
          <h2>{t('recurringWords')}</h2>
          <p className="analysis-intro">{t('analysisIntro')}</p>
        </div>
        {loading && <p>{t('loadingEntries')}</p>}
        {!loading && terms.length === 0 && <p>{t('noRecurringWords')}</p>}
      </section>

      {!loading && terms.length > 0 && (
        <section className="entry-panel analysis-chart-panel" ref={chartRef}>
          {selectedTermWords.length > 0 && selectedEntries.length > 0 ? (
            <SymptomFrequencyChart
              entries={selectedEntries}
              recurringTerms={terms.filter(({ word }) => selectedTermWords.includes(word))}
              timeUnit={chartTimeUnit}
              onTimeUnitChange={setChartTimeUnit}
            />
          ) : (
            <p className="chart-empty-state">{t('selectTermsForSummary')}</p>
          )}
          <div className="analysis-term-picker">
            <h2>{t('chooseSymptomsForGraph')}</h2>
            <p className="analysis-intro">{t('selectTermsForSummary')}</p>
            <div className="recurring-terms" aria-label={t('recurringWords')} role="group">
              {terms.map(({ word, count }) => (
                <label
                  className={`recurring-term ${selectedTermWords.includes(word) ? 'active' : ''}`}
                  key={word}
                >
                  <input
                    checked={selectedTermWords.includes(word)}
                    disabled={generating || exporting}
                    onChange={() => toggleTerm(word)}
                    type="checkbox"
                  />
                  <span className="recurring-word">{word}</span>
                  <span className="recurring-count">{t('foundInEntries', { count })}</span>
                </label>
              ))}
            </div>
          </div>
        </section>
      )}

      {selectedEntries.length > 0 && (
        <section className="entry-panel">
          <div className="section-heading">
            <h2>{t('matchingEntries')}</h2>
            <span>{t('entryCount', { count: selectedEntries.length })}</span>
          </div>
          <ol className="analysis-entry-list">
            {selectedEntries.map((entry) => (
              <li className="analysis-entry" key={entry.id}>
                <time dateTime={entry.created_at}>
                  {new Date(entry.created_at).toLocaleDateString(locale, { dateStyle: 'medium' })}
                </time>
                <p lang={entry.patient_input_en ? 'en' : undefined}>
                  {entry.patient_input_en || entry.patient_input}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="entry-panel analysis-summary-panel">
        <div>
          <h2>{t('generatedSummary')}</h2>
          <p className="analysis-intro">{aiProcessingEnabled ? t('summaryDisclaimer') : 'AI processing is off. Turn it on from the profile menu to generate a summary.'}</p>
        </div>
        <div className="analysis-summary-actions">
          <button
            className="primary-action analysis-generate"
            disabled={!aiProcessingEnabled || loading || generating || exporting || selectedEntries.length === 0}
            onClick={handleGenerate}
            type="button"
          >
            {generating ? t('generatingSummary') : t('generateSummary')}
          </button>
          <button
            className="secondary-action"
            disabled={!aiProcessingEnabled || loading || generating || exporting || selectedEntries.length === 0}
            onClick={handleDownloadPdf}
            type="button"
          >
            {exporting ? t('creatingPdf') : t('downloadAnalysisPdf')}
          </button>
        </div>
        {error && <p className="error-text" role="alert">{pdfError ? error : t('summaryError', { message: error })}</p>}
        {summary && (
          <div className="generated-summary" aria-live="polite">
            <p>{summary.summary}</p>
            {summary.patterns?.length > 0 && (
              <div>
                <h3>{t('recurringDetails')}</h3>
                <ul>
                  {summary.patterns.map((pattern) => <li key={pattern}>{pattern}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
