import { jsPDF } from 'jspdf'
import 'svg2pdf.js'

const PAGE_MARGIN = 42

export async function createAnalysisPdf({ title, generatedOn, labels, terms, summary, patterns, chartSvg }) {
  const pdf = new jsPDF({ format: 'a4', unit: 'pt' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const contentWidth = pageWidth - PAGE_MARGIN * 2
  let cursorY = PAGE_MARGIN

  pdf.setProperties({ title })

  function ensureSpace(height) {
    if (cursorY + height > pageHeight - PAGE_MARGIN) {
      pdf.addPage()
      cursorY = PAGE_MARGIN
    }
  }

  function addHeading(text) {
    ensureSpace(36)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    pdf.text(text, PAGE_MARGIN, cursorY)
    cursorY += 22
  }

  function addParagraph(text, fontSize = 10) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(fontSize)
    const lines = pdf.splitTextToSize(text, contentWidth)
    const lineHeight = fontSize * 1.45
    for (const line of lines) {
      ensureSpace(lineHeight)
      pdf.text(line, PAGE_MARGIN, cursorY)
      cursorY += lineHeight
    }
    cursorY += 8
  }

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(22)
  pdf.text(title, PAGE_MARGIN, cursorY)
  cursorY += 30
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(`${labels.generatedOn}: ${generatedOn}`, PAGE_MARGIN, cursorY)
  cursorY += 24

  addHeading(labels.recurringWords)
  addParagraph(terms.map(({ word, count }) => `${word} (${count})`).join(', ') || 'None')

  addHeading(labels.summary)
  addParagraph(labels.disclaimer, 9)
  addParagraph(summary)

  if (patterns.length > 0) {
    addHeading(labels.recurringDetails)
    for (const pattern of patterns) addParagraph(`• ${pattern}`)
  }

  if (chartSvg) {
    const chartHeight = contentWidth / 2
    ensureSpace(chartHeight + 36)
    addHeading(labels.chart)
    await pdf.svg(chartSvg, {
      x: PAGE_MARGIN,
      y: cursorY,
      width: contentWidth,
      height: chartHeight,
    })
    cursorY += chartHeight + 18
  }

  return pdf
}

export async function downloadAnalysisPdf(report) {
  const pdf = await createAnalysisPdf(report)
  const dateStamp = new Date().toISOString().slice(0, 10)
  pdf.save(`wavelength-analysis-${dateStamp}.pdf`)
}