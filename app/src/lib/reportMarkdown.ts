import type { ReportContent } from './types'

// Render a report_v2 dashboard as clean Markdown for the admin "Copy report"
// action. Falls back to a minimal grade/summary block for legacy reports.

// Universal assessment labels — same everywhere (dashboard + export).
const GRADE_LABEL: Record<string, string> = {
  A: 'Excellent',
  B: 'Good',
  C: 'Needs Work',
  D: 'Weak',
  F: 'Missing',
}
function gradeLabel(grade?: string): string {
  const g = (grade || '').trim().toUpperCase()[0] || ''
  return GRADE_LABEL[g] || ''
}
function gradeSuffix(grade?: string): string {
  const label = gradeLabel(grade)
  return label ? ` · ${label}` : ''
}

function mdList(items?: string[]): string {
  const list = (items || []).filter((s) => s && s.trim())
  return list.map((s) => `- ${s.trim()}`).join('\n')
}

export function reportToMarkdown(content: ReportContent): string {
  const df = content?.report_v2?.dashboard_feedback
  if (!df) {
    const grade = content?.overall_grade || 'N/A'
    return `# Pitch Deck Check\n\n**Grade:** ${grade}\n\n${content?.summary || ''}`.trim()
  }

  const ds = df.deck_score
  const company = ds?.title && ds.title !== 'Deck Score' ? ds.title : ''
  const out: string[] = []

  out.push(company ? `# ${company} — Pitch Deck Check` : '# Pitch Deck Check')

  // Overall
  out.push(`\n## Overall — ${ds?.grade || ''}`.trimEnd())
  if (ds?.summary) out.push(`\n${ds.summary}`)
  if (ds?.highest_leverage_revision_focus)
    out.push(`\n**Highest-leverage revision focus:** ${ds.highest_leverage_revision_focus}`)
  if ((ds?.investors_will_like || []).length)
    out.push(`\n**Investors will likely like**\n${mdList(ds.investors_will_like)}`)
  if ((ds?.investors_will_question || []).length)
    out.push(`\n**Investors will likely question**\n${mdList(ds.investors_will_question)}`)
  if ((ds?.what_could_make_investors_pass || []).length)
    out.push(`\n**What could make investors pass**\n${mdList(ds.what_could_make_investors_pass)}`)

  // Deck Feedback
  const fb = df.deck_feedback
  if (fb) {
    out.push(`\n## Deck Feedback`)
    for (const key of ['completeness', 'clarity', 'brevity', 'flow'] as const) {
      const d = fb[key]
      if (!d) continue
      const name = key.charAt(0).toUpperCase() + key.slice(1)
      out.push(`\n### ${name} — ${d.grade || ''}${gradeSuffix(d.grade)}`)
      if (d.what_needs_help) out.push(d.what_needs_help)
      if ((d.recommended_changes || []).length) out.push(mdList(d.recommended_changes))
    }
  }

  // Investor Topics
  const topics = df.slide_feedback || []
  if (topics.length) {
    out.push(`\n## Investor Topics`)
    for (const t of topics) {
      out.push(`\n### ${t.title || 'Topic'} — ${t.grade || ''}${gradeSuffix(t.grade)}`)
      if (t.source_label) {
        const found =
          t.evidence_found_in && t.evidence_found_in.length
            ? ` · Evidence in: ${t.evidence_found_in.join(', ')}`
            : ''
        out.push(`**Source:** ${t.source_label}${found}`)
      }
      if (t.investor_decision) out.push(`\n**What's the investor thinking?** ${t.investor_decision}`)
      if (t.what_works) out.push(`\n**What does the deck answer?** ${t.what_works}`)
      if ((t.what_needs_help && t.what_needs_help.trim()) || (t.recommended_changes || []).length) {
        out.push(`\n**What's missing?**${t.what_needs_help ? ` ${t.what_needs_help}` : ''}`)
        if ((t.recommended_changes || []).length) out.push(mdList(t.recommended_changes))
      }
    }
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

// --- printable HTML (for a nicely-formatted PDF via the browser) -------------

function esc(s?: string): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function htmlList(items?: string[]): string {
  const list = (items || []).filter((s) => s && s.trim())
  return list.length ? `<ul>${list.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''
}

export function reportToPrintableHtml(content: ReportContent): string {
  const df = content?.report_v2?.dashboard_feedback
  const ds = df?.deck_score
  const company = ds?.title && ds.title !== 'Deck Score' ? ds.title : ''
  const title = company ? `${esc(company)} — Pitch Deck Check` : 'Pitch Deck Check'
  const body: string[] = []

  if (ds) {
    body.push(`<section><h2>Overall — <span class="grade">${esc(ds.grade)}</span></h2>`)
    if (ds.summary) body.push(`<p>${esc(ds.summary)}</p>`)
    if (ds.highest_leverage_revision_focus)
      body.push(`<p><strong>Highest-leverage revision focus:</strong> ${esc(ds.highest_leverage_revision_focus)}</p>`)
    if ((ds.investors_will_like || []).length)
      body.push(`<h3>Investors will likely like</h3>${htmlList(ds.investors_will_like)}`)
    if ((ds.investors_will_question || []).length)
      body.push(`<h3>Investors will likely question</h3>${htmlList(ds.investors_will_question)}`)
    if ((ds.what_could_make_investors_pass || []).length)
      body.push(`<h3>What could make investors pass</h3>${htmlList(ds.what_could_make_investors_pass)}`)
    body.push(`</section>`)
  }

  const fb = df?.deck_feedback
  if (fb) {
    body.push(`<section><h2>Deck Feedback</h2>`)
    for (const key of ['completeness', 'clarity', 'brevity', 'flow'] as const) {
      const d = fb[key]
      if (!d) continue
      const name = key.charAt(0).toUpperCase() + key.slice(1)
      body.push(`<h3>${name} — <span class="grade">${esc(d.grade)}</span>${esc(gradeSuffix(d.grade))}</h3>`)
      if (d.what_needs_help) body.push(`<p>${esc(d.what_needs_help)}</p>`)
      body.push(htmlList(d.recommended_changes))
    }
    body.push(`</section>`)
  }

  const topics = df?.slide_feedback || []
  if (topics.length) {
    body.push(`<section><h2>Investor Topics</h2>`)
    for (const t of topics) {
      body.push(`<div class="topic"><h3>${esc(t.title)} — <span class="grade">${esc(t.grade)}</span>${esc(gradeSuffix(t.grade))}</h3>`)
      if (t.source_label) {
        const found = t.evidence_found_in && t.evidence_found_in.length ? ` · Evidence in: ${esc(t.evidence_found_in.join(', '))}` : ''
        body.push(`<p class="src"><strong>Source:</strong> ${esc(t.source_label)}${found}</p>`)
      }
      if (t.investor_decision) body.push(`<p><strong>What's the investor thinking?</strong> ${esc(t.investor_decision)}</p>`)
      if (t.what_works) body.push(`<p><strong>What does the deck answer?</strong> ${esc(t.what_works)}</p>`)
      if ((t.what_needs_help && t.what_needs_help.trim()) || (t.recommended_changes || []).length) {
        body.push(`<p><strong>What's missing?</strong> ${esc(t.what_needs_help || '')}</p>`)
        body.push(htmlList(t.recommended_changes))
      }
      body.push(`</div>`)
    }
    body.push(`</section>`)
  }

  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
    @page { margin: 18mm; }
    * { box-sizing: border-box; }
    body { font-family: Inter, -apple-system, system-ui, sans-serif; color: #171717; line-height: 1.5; max-width: 760px; margin: 0 auto; padding: 24px; }
    header { border-bottom: 1px solid #e6e2de; padding-bottom: 12px; margin-bottom: 18px; }
    header .brand { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
    header .byline { font-size: 11px; color: #525252; margin-top: 2px; }
    h1 { font-size: 22px; margin: 8px 0 0; }
    h2 { font-size: 17px; margin: 22px 0 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    h3 { font-size: 14px; margin: 14px 0 4px; }
    p { margin: 4px 0; font-size: 13px; }
    ul { margin: 4px 0 8px 18px; padding: 0; }
    li { font-size: 13px; margin: 2px 0; }
    .grade { font-weight: 700; }
    .src { color: #525252; font-size: 12px; }
    section, .topic { break-inside: avoid; }
    .topic { margin-bottom: 8px; }
  </style></head><body>
    <header><div class="brand">Pitch Deck Check</div><div class="byline">By Malcolm Lewis · Creator of the Sequoia pitch deck template</div></header>
    <h1>${title}</h1>
    ${body.join('\n')}
  </body></html>`
}
