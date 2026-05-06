const { getCalibrationDecks } = require('./lib/calibrationDb')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    }
  }

  const { admin_password, activeOnly = false, archetype = null } = body

  // Verify admin password
  const expectedPassword = process.env.ADMIN_PASSWORD
  if (!expectedPassword || admin_password !== expectedPassword) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid admin password' }),
    }
  }

  try {
    const decks = await getCalibrationDecks({ activeOnly, archetype })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        decks,
      }),
    }
  } catch (err) {
    console.error('Get calibration decks error:', err)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch calibration decks' }),
    }
  }
}
