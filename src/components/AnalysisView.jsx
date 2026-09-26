import { useState } from 'react'
import { findRecurringEntries, generateEntrySummary } from '../lib/analysis.js'
import { useLanguage } from '../i18n/LanguageContext.jsx'

export default function AnalysisView({ entries, loading }) {
  const { language, locale, t } = useLanguage()
  const [selectedTerm, setSelectedTerm] = useState(null)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)
  const [generating, setGenerating] = useState(false)
  const { terms, matchingEntries, entryWords } = findRecurringEntries(entries)
  const visibleEntries = selectedTerm
    ? matchingEntries.filter((entry) => entryWords.get(entry.id)?.has(selectedTerm))
    : matchingEntries

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    setSummary(null)
    try {
      setSummary(await generateEntrySummary(matchingEntries, language))
    } catch (cause) {
      setError(cause.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="analysis-view">
      <section className="entry-panel">
        <div>
          <h2>{t('recurringWords')}</h2>
          <p className="analysis-intro">{t('analysisIntro')}</p>
        </div>
        {loading ? (
          <p>{t('loadingEntries')}</p>
        ) : terms.length === 0 ? (
          <p>{t('noRecurringWords')}</p>
        ) : (
          <div className="recurring-terms" aria-label={t('recurringWords')}>
            {terms.map(({ word, count }) => (
              <button
                aria-pressed={selectedTerm === word}
                className={selectedTerm === word ? 'recurring-term active' : 'recurring-term'}
                key={word}
                onClick={() => setSelectedTerm((current) => (current === word ? null : word))}
                type="button"
              >
                <span>{word}</span>
                <span className="recurring-count">{t('foundInEntries', { count })}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {matchingEntries.length > 0 && (
        <section className="entry-panel">
          <div className="section-heading">
            <h2>{t('matchingEntries')}</h2>
            <span>{t('entryCount', { count: visibleEntries.length })}</span>
          </div>
          {selectedTerm && (
            <button className="text-action analysis-reset" onClick={() => setSelectedTerm(null)} type="button">
              {t('showAllMatchingEntries')}
            </button>
          )}
          <ol className="analysis-entry-list">
            {visibleEntries.map((entry) => (
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
          <p className="analysis-intro">{t('summaryDisclaimer')}</p>
        </div>
        <button
          className="primary-action analysis-generate"
          disabled={loading || generating || matchingEntries.length === 0}
          onClick={handleGenerate}
          type="button"
        >
          {generating ? t('generatingSummary') : t('generateSummary')}
        </button>
        {error && <p className="error-text" role="alert">{t('summaryError', { message: error })}</p>}
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