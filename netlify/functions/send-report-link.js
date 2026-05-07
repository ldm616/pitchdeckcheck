const { Resend } = require('resend')
const { getSupabaseClient } = require('./lib/supabase')

// Common disposable email domains to block
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com',
  'throwaway.email',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'trashmail.com',
  'fakeinbox.com',
  'tempail.com',
  'dispostable.com',
  'yopmail.com',
])

function isDisposableEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain && DISPOSABLE_DOMAINS.has(domain)
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  // Parse request body
  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid request body' }),
    }
  }

  const { deck_id, access_token, email } = body

  // Validate required fields
  if (!deck_id || !access_token || !email) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing required fields' }),
    }
  }

  // Validate email format
  if (!validateEmail(email)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid email format' }),
    }
  }

  // Block disposable emails
  if (isDisposableEmail(email)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Please use a non-disposable email address' }),
    }
  }

  // Verify deck access
  const supabase = getSupabaseClient()
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id, access_token, email')
    .eq('id', deck_id)
    .single()

  if (deckError || !deck) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Report not found' }),
    }
  }

  if (deck.access_token !== access_token) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid access' }),
    }
  }

  // Build the private report link
  const baseUrl = process.env.URL || 'https://pitchdeckcheck.com'
  const reportLink = `${baseUrl}/report/${deck_id}?token=${access_token}`

  // Check if Resend is configured
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured')
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Email service not configured',
        fallback_url: reportLink,
      }),
    }
  }

  // Send email via Resend
  const resend = new Resend(resendApiKey)

  try {
    const fromEmail = process.env.FROM_EMAIL || 'reports@pitchdeckcheck.com'

    await resend.emails.send({
      from: `Pitch Deck Check <${fromEmail}>`,
      to: email,
      subject: 'Your Pitch Deck Report',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 20px; font-weight: 600; color: #111; margin: 0 0 24px 0;">
            Your Pitch Deck Report
          </h1>

          <p style="font-size: 15px; color: #444; line-height: 1.6; margin: 0 0 24px 0;">
            Here's your private link to access your pitch deck report. Bookmark it or save this email to return later.
          </p>

          <a href="${reportLink}" style="display: inline-block; background: #111; color: #fff; padding: 14px 28px; font-size: 15px; font-weight: 500; text-decoration: none; border-radius: 8px;">
            View my report
          </a>

          <p style="font-size: 13px; color: #888; line-height: 1.5; margin: 32px 0 0 0;">
            This link is private. Only people with this link can view your report.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />

          <p style="font-size: 12px; color: #999; margin: 0;">
            Pitch Deck Check
          </p>
        </div>
      `,
      text: `Your Pitch Deck Report\n\nHere's your private link to access your pitch deck report:\n\n${reportLink}\n\nThis link is private. Only people with this link can view your report.\n\n—\nPitch Deck Check`,
    })

    // Always update the deck with the email so admin can see it
    await supabase
      .from('decks')
      .update({ email })
      .eq('id', deck_id)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    }
  } catch (error) {
    console.error('Failed to send email:', error)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to send email',
        fallback_url: reportLink,
      }),
    }
  }
}
