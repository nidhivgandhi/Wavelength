import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import EntryForm from './EntryForm.jsx'

const CONFIRM_TIMEOUT_MS = 4000

// Two-click delete: the first click asks for a second click; if none comes
// within a few seconds (or focus leaves the button), it resets to "Delete".
function DeleteButton({ onDelete }) {
  const { t } = useLanguage()
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!confirming) return
    const timer = setTimeout(() => setConfirming(false), CONFIRM_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [confirming])

  return (
    <button
      onClick={() => (confirming ? onDelete() : setConfirming(true))}
      onBlur={() => setConfirming(false)}
      style={confirming ? { color: 'white', background: 'crimson', borderColor: 'crimson' } : undefined}
    >
      {confirming ? t('confirmDelete') : t('delete')}
    </button>
  )
}

export default function EntryList({ entries, loading, onEdit, onDelete }) {
  const { t, locale } = useLanguage()
  const [visibleMonth, setVisibleMonth] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const initialized = useRef(false)
  const latestEntryId = useRef(null)

  useEffect(() => {
    if (loading) return

    const latest = entries[0]
    if (!initialized.current || (latest && latest.id !== latestEntryId.current)) {
      const date = latest ? new Date(latest.created_at) : new Date()
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
      setSelectedDate(localDateKey(date))
    }
    initialized.current = true
    latestEntryId.current = latest?.id ?? null
  }, [entries, loading])

  if (loading) return <p>{t('loadingEntries')}</p>

  const month = visibleMonth || new Date()
  const monthYear = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstWeekday = new Date(monthYear, monthIndex, 1).getDay()
  const daysInMonth = new Date(monthYear, monthIndex + 1, 0).getDate()
  const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) =>
    index < firstWeekday ? null : index - firstWeekday + 1,
  )
  const entryCounts = new Map()
  for (const entry of entries) {
    const key = localDateKey(new Date(entry.created_at))
    entryCounts.set(key, (entryCounts.get(key) || 0) + 1)
  }
  const selectedEntries = selectedDate
    ? entries.filter((entry) => localDateKey(new Date(entry.created_at)) === selectedDate)
    : []
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Date(2023, 0, 1 + index).toLocaleDateString(locale, { weekday: 'short' }),
  )

  function changeMonth(amount) {
    setVisibleMonth(new Date(monthYear, monthIndex + amount, 1))
    setSelectedDate(null)
  }

  return (
    <div className="entry-calendar">
      <div className="calendar-month-header">
        <button
          aria-label={t('previousMonth')}
          className="calendar-month-button"
          onClick={() => changeMonth(-1)}
          type="button"
        >
          ‹
        </button>
        <h3 aria-live="polite">
          {month.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </h3>
        <button
          aria-label={t('nextMonth')}
          className="calendar-month-button"
          onClick={() => changeMonth(1)}
          type="button"
        >
          ›
        </button>
      </div>

      <div className="calendar-grid" role="grid" aria-label={t('pastEntries')}>
        {weekdays.map((weekday, index) => (
          <span className="calendar-weekday" key={`${weekday}-${index}`} role="columnheader">
            {weekday}
          </span>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <span aria-hidden="true" className="calendar-empty" key={`empty-${index}`} />

          const date = new Date(monthYear, monthIndex, day)
          const key = localDateKey(date)
          const count = entryCounts.get(key) || 0
          const dateLabel = date.toLocaleDateString(locale, { dateStyle: 'full' })
          const className = [
            'calendar-day',
            count > 0 && 'has-entries',
            selectedDate === key && 'selected',
            key === localDateKey(new Date()) && 'today',
          ].filter(Boolean).join(' ')

          return (
            <button
              aria-label={count > 0 ? t('calendarDateEntries', { date: dateLabel, count }) : dateLabel}
              aria-pressed={selectedDate === key}
              className={className}
              key={key}
              onClick={() => setSelectedDate(key)}
              type="button"
            >
              <span>{day}</span>
              {count > 0 && <span aria-hidden="true" className="calendar-dot" />}
            </button>
          )
        })}
      </div>

      <section aria-live="polite" className="calendar-day-entries">
        {selectedDate ? (
          <>
            <div className="section-heading">
              <h3>{new Date(`${selectedDate}T00:00:00`).toLocaleDateString(locale, { dateStyle: 'full' })}</h3>
              <span>{t('entryCount', { count: selectedEntries.length })}</span>
            </div>
            {selectedEntries.length > 0 ? (
              <ul className="entry-list">
                {selectedEntries.map((entry) => (
                  <EntryItem key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </ul>
            ) : (
              <p className="calendar-empty-message">{t('noEntriesOnDate')}</p>
            )}
          </>
        ) : (
          <p className="calendar-empty-message">{t('selectCalendarDate')}</p>
        )}
      </section>
    </div>
  )
}

function localDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// /api/translate answers too-vague input with a "more detail needed" phrasing
// (systemPrompt.js rule 4) instead of a real one. There's no flag for it in the
// response, so this matches the wording — update if the prompt changes.
function isLowDetail(entry) {
  return /insufficient (detail|information)|more detail/i.test(entry.clinical_phrasing || '')
}

function EntryItem({ entry, onEdit, onDelete }) {
  const { t, locale, language } = useLanguage()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState(null)

  async function save(input) {
    setError(null)
    const { translateError } = await onEdit(entry, input)
    setEditing(false)
    if (translateError) setError(t('phrasingFailed', { message: translateError.message }))
  }

  const small = { fontSize: 13, color: '#666' }

  return (
    <li style={{ border: '1px solid #ddd', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', ...small }}>
        <span>{new Date(entry.created_at).toLocaleString(locale)}</span>
        <span>· {entry.input_method === 'voice' ? t('spoken') : t('typed')}</span>
        {entry.emergency && <span style={{ color: 'crimson', fontWeight: 'bold' }}>· {t('urgent')}</span>}
        {!entry.synced && <span>· {t('deviceOnly')}</span>}
        {!editing && (
          <span style={{ marginInlineStart: 'auto', display: 'flex', gap: 4 }}>
            <button onClick={() => setEditing(true)}>{t('edit')}</button>
            <DeleteButton onDelete={() => onDelete(entry.id)} />
          </span>
        )}
      </div>

      {editing ? (
        <div style={{ marginTop: '0.75rem' }}>
          <EntryForm
            initialText={entry.patient_input}
            onSubmit={save}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          <p style={{ margin: '0.5rem 0' }}>{entry.patient_input}</p>
          {entry.patient_input_en && entry.patient_input_en.trim() !== entry.patient_input.trim() && (
            <p style={{ margin: '0 0 0.5rem', fontSize: 14 }}>
              <span style={{ color: '#666' }}>{t('inEnglish')}:</span> <span lang="en">{entry.patient_input_en}</span>
            </p>
          )}

          {error && <p style={{ color: 'crimson', fontSize: 14 }}>{error}</p>}

          {entry.clinical_phrasing && (
            <p style={{ margin: 0, fontSize: 14 }}>
              <strong>{t('clinicalPhrasing')}:</strong> <span lang="en">{entry.clinical_phrasing}</span>
            </p>
          )}

          {isLowDetail(entry) && (
            <p style={{ margin: '0.5rem 0 0', fontSize: 14, color: '#b35c00' }}>
              {language === 'en' && entry.follow_up_question
                ? t('lowDetailQuestion', { question: entry.follow_up_question })
                : t('lowDetailHint')}
            </p>
          )}
        </>
      )}
    </li>
  )
}
