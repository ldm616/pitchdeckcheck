const { upsertCalibrationDeck } = require('./lib/calibrationDb')

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

  const { admin_password, deck } = body

  // Verify admin password
  const expectedPassword = process.env.ADMIN_PASSWORD
  if (!expectedPassword || admin_password !== expectedPassword) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid admin password' }),
    }
  }

  // Validate deck data
  if (!deck || !deck.company || !deck.archetype || !deck.stage) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing required fields: company, archetype, stage' }),
    }
  }

  try {
    // Prepare deck record with timestamp
    const record = {
      id: deck.id,
      company: deck.company,
      archetype: deck.archetype,
      era: deck.era || null,
      stage: deck.stage,
      year: deck.year || null,
      deck_file: deck.deck_file || null,
      expected_grade_range: deck.expected_grade_range || null,
      strengths: deck.strengths || [],
      known_weaknesses: deck.known_weaknesses || [],
      must_not_happen: deck.must_not_happen || [],
      notes: deck.notes || null,
      active: deck.active !== false,
      updated_at: new Date().toISOString(),
    }

    const result = await upsertCalibrationDeck(record)

    if (!result) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to save calibration deck' }),
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        deck: result,
      }),
    }
  } catch (err) {
    console.error('Upsert calibration deck error:', err)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to save calibration deck' }),
    }
  }
}
