const { Resend } = require('resend')

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

  const { name, email, message } = body

  // Validate required fields
  if (!name || !email || !message) {
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

  // Check if Resend is configured
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured')
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Email service not configured' }),
    }
  }

  // Send email via Resend
  const resend = new Resend(resendApiKey)

  try {
    const fromEmail = process.env.FROM_EMAIL || 'noreply@pitchdeckcheck.com'

    await resend.emails.send({
      from: `Pitch Deck Check <${fromEmail}>`,
      to: 'hello@pitchdeckcheck.com',
      replyTo: email,
      subject: `Contact form: ${name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 20px; font-weight: 600; color: #111; margin: 0 0 24px 0;">
            New Contact Form Submission
          </h1>

          <p style="font-size: 14px; color: #666; margin: 0 0 4px 0;"><strong>From:</strong></p>
          <p style="font-size: 15px; color: #111; margin: 0 0 16px 0;">${name}</p>

          <p style="font-size: 14px; color: #666; margin: 0 0 4px 0;"><strong>Email:</strong></p>
          <p style="font-size: 15px; color: #111; margin: 0 0 16px 0;">
            <a href="mailto:${email}" style="color: #2563eb;">${email}</a>
          </p>

          <p style="font-size: 14px; color: #666; margin: 0 0 4px 0;"><strong>Message:</strong></p>
          <div style="font-size: 15px; color: #111; line-height: 1.6; padding: 16px; background: #f9fafb; border-radius: 8px; white-space: pre-wrap;">${message}</div>

          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />

          <p style="font-size: 12px; color: #999; margin: 0;">
            Pitch Deck Check Contact Form
          </p>
        </div>
      `,
      text: `New Contact Form Submission\n\nFrom: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    }
  } catch (error) {
    console.error('Failed to send contact email:', error)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to send message' }),
    }
  }
}
