import type { ExportFormat, ExportOptions, ObjectiveDraft, KeyResultDraft, QualityScores } from '../types'

interface ExportData {
  objective: ObjectiveDraft
  keyResults: KeyResultDraft[]
  qualityScores: QualityScores
  options: ExportOptions
}

export function generateExportContent(format: ExportFormat, data: ExportData): string {
  switch (format) {
    case 'json':
      return generateJSON(data)
    case 'markdown':
      return generateMarkdown(data)
    case 'pdf':
      return generatePDFContent(data)
    case 'text':
      return generateText(data)
    default:
      return ''
  }
}

function generateJSON(data: ExportData): string {
  const exportObj = {
    objective: {
      text: data.objective.text,
      qualityScore: data.objective.qualityScore,
      ...(data.options.includeFeedback && { feedback: data.objective.feedback }),
      ...(data.options.includeHistory && { versions: data.objective.versions }),
    },
    keyResults: data.keyResults.map(kr => ({
      text: kr.text,
      qualityScore: kr.qualityScore,
      isQuantified: kr.isQuantified,
      ...(kr.baseline && { baseline: kr.baseline }),
      ...(kr.target && { target: kr.target }),
      ...(kr.metric && { metric: kr.metric }),
      ...(data.options.includeFeedback && { feedback: kr.feedback }),
    })),
    ...(data.options.includeScores && {
      qualityAssessment: {
        overall: data.qualityScores.overall,
        dimensions: data.qualityScores.dimensions,
        confidence: data.qualityScores.confidence,
        ...(data.options.includeFeedback && { feedback: data.qualityScores.feedback }),
      },
    }),
    exportedAt: new Date().toISOString(),
    exportOptions: data.options,
  }

  return JSON.stringify(exportObj, null, 2)
}

function generateMarkdown(data: ExportData): string {
  let content = ''

  // Header
  content += '# OKRs\n\n'
  content += `Generated on ${new Date().toLocaleDateString()}\n\n`

  // Objective
  content += '## Objective\n\n'
  content += `**${data.objective.text}**\n\n`

  if (data.options.includeScores) {
    content += `*Quality Score: ${data.objective.qualityScore}/100*\n\n`
  }

  if (data.options.includeFeedback && data.objective.feedback.length > 0) {
    content += '### Feedback\n\n'
    data.objective.feedback.forEach(feedback => {
      content += `- ${feedback}\n`
    })
    content += '\n'
  }

  // Key Results
  content += '## Key Results\n\n'
  data.keyResults.forEach((kr, index) => {
    content += `### KR${index + 1}: ${kr.text}\n\n`

    if (kr.isQuantified && (kr.baseline || kr.target || kr.metric)) {
      content += '**Metrics:**\n\n'
      if (kr.baseline) content += `- **Baseline:** ${kr.baseline}\n`
      if (kr.target) content += `- **Target:** ${kr.target}\n`
      if (kr.metric) content += `- **Measurement:** ${kr.metric}\n`
      content += '\n'
    }

    if (data.options.includeScores) {
      content += `*Quality Score: ${kr.qualityScore}/100*\n\n`
    }

    if (data.options.includeFeedback && kr.feedback.length > 0) {
      content += '**Suggestions:**\n\n'
      kr.feedback.forEach(feedback => {
        content += `- ${feedback}\n`
      })
      content += '\n'
    }
  })

  // Overall Assessment
  if (data.options.includeScores) {
    content += '## Quality Assessment\n\n'
    content += `**Overall Score:** ${data.qualityScores.overall}/100\n\n`

    content += '### Dimensional Breakdown\n\n'
    Object.entries(data.qualityScores.dimensions).forEach(([dimension, score]) => {
      const label = dimension.charAt(0).toUpperCase() + dimension.slice(1)
      content += `- **${label}:** ${score}/100\n`
    })
    content += '\n'

    if (data.options.includeFeedback && data.qualityScores.feedback.length > 0) {
      content += '### Overall Feedback\n\n'
      data.qualityScores.feedback.forEach(feedback => {
        content += `- ${feedback}\n`
      })
      content += '\n'
    }
  }

  return content
}

function generatePDFContent(data: ExportData): string {
  // For now, return formatted text that could be converted to PDF
  // In a real implementation, this would use a PDF generation library
  let content = ''

  content += 'OKRs - Professional Document\n'
  content += '=' .repeat(50) + '\n\n'
  content += `Generated: ${new Date().toLocaleDateString()}\n\n`

  content += 'OBJECTIVE\n'
  content += '-' .repeat(20) + '\n'
  content += `${data.objective.text}\n`

  if (data.options.includeScores) {
    content += `Quality Score: ${data.objective.qualityScore}/100\n`
  }
  content += '\n'

  content += 'KEY RESULTS\n'
  content += '-' .repeat(20) + '\n'
  data.keyResults.forEach((kr, index) => {
    content += `${index + 1}. ${kr.text}\n`

    if (kr.isQuantified) {
      if (kr.baseline) content += `   Baseline: ${kr.baseline}\n`
      if (kr.target) content += `   Target: ${kr.target}\n`
      if (kr.metric) content += `   Metric: ${kr.metric}\n`
    }

    if (data.options.includeScores) {
      content += `   Quality Score: ${kr.qualityScore}/100\n`
    }
    content += '\n'
  })

  if (data.options.includeScores) {
    content += 'QUALITY ASSESSMENT\n'
    content += '-' .repeat(20) + '\n'
    content += `Overall Score: ${data.qualityScores.overall}/100\n\n`

    content += 'Dimensional Scores:\n'
    Object.entries(data.qualityScores.dimensions).forEach(([dimension, score]) => {
      const label = dimension.charAt(0).toUpperCase() + dimension.slice(1)
      content += `- ${label}: ${score}/100\n`
    })
  }

  return content
}

function generateText(data: ExportData): string {
  let content = ''

  content += `OBJECTIVE: ${data.objective.text}\n\n`

  content += 'KEY RESULTS:\n'
  data.keyResults.forEach((kr, index) => {
    content += `${index + 1}. ${kr.text}\n`
  })

  if (data.options.includeScores) {
    content += `\nOVERALL QUALITY SCORE: ${data.qualityScores.overall}/100\n`
  }

  return content
}

export async function downloadExport(content: string, filename: string, format: ExportFormat) {
  const mimeTypes = {
    json: 'application/json',
    markdown: 'text/markdown',
    pdf: 'text/plain', // Would be 'application/pdf' with actual PDF generation
    text: 'text/plain',
  }

  const blob = new Blob([content], { type: mimeTypes[format] })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}