const express = require('express');
const router = express.Router();

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

function summarizeForecast(list) {
  const byDay = new Map();

  for (const item of list) {
    const day = item.dt_txt?.slice(0, 10);
    if (!day) continue;

    const temp = item.main?.temp;
    const clouds = item.clouds?.all;
    const precipitation = (item.rain?.['3h'] || 0) + (item.snow?.['3h'] || 0);
    const description = item.weather?.[0]?.description || '';

    if (typeof temp !== 'number' || typeof clouds !== 'number') continue;

    const existing = byDay.get(day) || {
      tempMax: temp,
      cloudsMax: clouds,
      precipitation: 0,
      descriptions: new Set(),
    };

    existing.tempMax = Math.max(existing.tempMax, temp);
    existing.cloudsMax = Math.max(existing.cloudsMax, clouds);
    existing.precipitation += precipitation;
    if (description) existing.descriptions.add(description);

    byDay.set(day, existing);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, data]) => ({
      day,
      tempMax: Math.round(data.tempMax * 10) / 10,
      cloudsMax: data.cloudsMax,
      precipitation: Math.round(data.precipitation * 10) / 10,
      description: [...data.descriptions].join(', '),
    }));
}

// 1. นำเข้า Library ที่ด้านบนสุดของไฟล์
function isGeminiQuotaError(errorBody) {
  if (!errorBody) return false;
  const body = typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody);
  return /RESOURCE_EXHAUSTED|quota|quota exceeded|generate_content_free_tier_requests|generate_content_free_tier_input_token_count/i.test(body);
}

async function generateWeatherAdvice(forecastData, city) {
  if (!GEMINI_API_KEY) {
    return 'AI ยังไม่พร้อมใช้งาน';
  }

  const summary = summarizeForecast(forecastData.list || []);
  const lines = summary.map((dayData) => {
    return `${dayData.day}: ${dayData.tempMax}°C, clouds ${dayData.cloudsMax}%, rain ${dayData.precipitation}mm`;
  });

  const prompt = `คุณคือผู้เชี่ยวชาญด้านสภาพอากาศ วิเคราะห์ข้อมูลเมือง ${city} ต่อไปนี้:\n${lines.join('\n')}\nช่วยแนะนำการแต่งกายและกิจกรรมเป็นภาษาไทยแบบสั้นๆ`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      }),
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Gemini response parse error: ${parseError.message} \n${responseText}`);
    }

    if (!response.ok) {
      if (isGeminiQuotaError(data)) {
        return 'ขออภัย ระบบวิเคราะห์ AI ขัดข้อง (โควต้า AI หมด)';
      }
      throw new Error(`Gemini API error: ${response.status} ${responseText}`);
    }

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text.trim();
    }

    return 'ไม่สามารถวิเคราะห์ข้อมูลได้ในขณะนี้';
  } catch (error) {
    console.error('--- AI DEBUG ERROR ---');
    console.error('Full Error:', error);
    console.error('Message:', error.message);
    if (error.stack) console.error('Stack:', error.stack);

    if (isGeminiQuotaError(error.message)) {
      return 'ขออภัย ระบบวิเคราะห์ AI ขัดข้อง (โควต้า AI หมด)';
    }
    return 'ขออภัย ระบบวิเคราะห์ AI ขัดข้อง';
  }
}

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

router.get('/weather', async (req, res) => {
  try {
    if (!WEATHER_API_KEY) {
      return res.status(500).json({ error: 'Missing WEATHER_API_KEY in server/.env' });
    }
    const q = req.query.q || 'London';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      q
    )}&appid=${WEATHER_API_KEY}&units=metric`;

    const r = await fetch(url);
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: 'OpenWeatherMap error', details: text });
    }
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/forecast', async (req, res) => {
  try {
    if (!WEATHER_API_KEY) {
      return res.status(500).json({ error: 'Missing WEATHER_API_KEY in server/.env' });
    }
    const q = req.query.q || 'London';
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
      q
    )}&appid=${WEATHER_API_KEY}&units=metric`;

    const r = await fetch(url);
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: 'OpenWeatherMap error', details: text });
    }
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/forecast-analysis', async (req, res) => {
  try {
    if (!WEATHER_API_KEY) {
      return res.status(500).json({ error: 'Missing WEATHER_API_KEY in server/.env' });
    }

    const q = req.query.q || 'London';
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
      q
    )}&appid=${WEATHER_API_KEY}&units=metric`;

    const r = await fetch(url);
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: 'OpenWeatherMap error', details: text });
    }

    const data = await r.json();
    const advice = await generateWeatherAdvice(data, q);
    res.json({ ...data, advice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

module.exports = router;
