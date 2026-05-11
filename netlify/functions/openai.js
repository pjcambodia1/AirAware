exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "POST only" })
    };
  }

  try {
    const payload = JSON.parse(event.body || "{}");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: `You are AirAware Wellness Interpreter.
Use ONLY the provided AirAware data.
Do NOT invent values.
Do NOT diagnose disease.
Give calm, practical, personalized wellness guidance.
Keep it concise and specific.
Return JSON only with: headline, summary, bpNote, bodyNote, suggestions, confidence, disclaimer.`
          },
          {
            role: "user",
            content: JSON.stringify(payload)
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ error: err })
      };
    }

    const data = await response.json();
    const report = JSON.parse(data.output_text);

    return {
      statusCode: 200,
      body: JSON.stringify({
        ...report,
        meta: {
          generatedAt: new Date().toISOString(),
          location: payload.locationName ?? null,
          elevationM: payload.actualElevationM ?? null,
          densityAltitudeM: payload.densityAltitudeM ?? null,
          daBurdenM: payload.daBurdenM ?? null,
          shift24hM: payload.shift24hM ?? null,
          shift30mM: payload.shift30mM ?? null
        },
        userContext: {
          bpProfile: payload.bpProfile ?? "unknown",
          pulseBpm: payload.pulseBpm ?? null,
          sensitivity: payload.sensitivity ?? null,
          ageGroup: payload.ageGroup ?? "unknown",
          adaptiveScore: payload.adaptiveScore ?? 0
        },
        diagnostics: {
          version: "1.0",
          source: "airaware-netlify",
          model: "gpt-4.1-mini"
        }
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Wellness report failed." })
    };
  }
};
