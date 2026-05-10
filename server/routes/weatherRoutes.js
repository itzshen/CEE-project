const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

console.log('Environment check:', {
  WEATHER_API_KEY: !!WEATHER_API_KEY,
  GEMINI_API_KEY: !!GEMINI_API_KEY,
  GEMINI_MODEL
});

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files are allowed'));
    }
  }
});

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

async function readFileContent(filePath, mimetype) {
  const buffer = fs.readFileSync(filePath);

  if (mimetype === 'text/plain') {
    return buffer.toString('utf-8');
  } else if (mimetype === 'application/pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  } else {
    throw new Error('Unsupported file type. Only PDF and TXT files are supported.');
  }
}

async function analyzeTripPlan(tripContent, city) {
  if (!GEMINI_API_KEY) {
    return 'AI ยังไม่พร้อมใช้งาน';
  }

  const prompt = `คุณคือผู้เชี่ยวชาญด้านการเตรียมตัวสำหรับการเดินทางและสภาพอากาศ วิเคราะห์แผนการเดินทางต่อไปนี้และให้คำแนะนำการเตรียมตัวรับมือกับสภาพอากาศ:

แผนการเดินทาง:
${tripContent}

เมืองปลายทาง: ${city}

กรุณาวิเคราะห์:
1. กิจกรรมหลักในแผนการเดินทาง
2. ช่วงเวลาที่จะเดินทาง
3. สิ่งที่ควรเตรียมตัวสำหรับสภาพอากาศในเมืองนี้
4. คำแนะนำเฉพาะสำหรับกิจกรรมที่วางแผนไว้

ให้คำแนะนำเป็นภาษาไทยแบบสั้นๆและมีประโยชน์ ไม่ต้องมีสัญลักษณ์ Markdown (ดอกจัน)`;

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
    console.error('--- AI TRIP ANALYSIS ERROR ---');
    console.error('Full Error:', error);
    console.error('Message:', error.message);
    if (error.stack) console.error('Stack:', error.stack);

    if (isGeminiQuotaError(error.message)) {
      return 'ขออภัย ระบบวิเคราะห์ AI ขัดข้อง (โควต้า AI หมด)';
    }
    return 'ขออภัย ระบบวิเคราะห์ AI ขัดข้อง';
  }
}

async function generateWeatherAdvice(forecastData, city) {
  if (!GEMINI_API_KEY) {
    return 'AI ยังไม่พร้อมใช้งาน';
  }

  const summary = summarizeForecast(forecastData.list || []);
  const lines = summary.map((dayData) => {
    return `${dayData.day}: ${dayData.tempMax}°C, clouds ${dayData.cloudsMax}%, rain ${dayData.precipitation}mm`;
  });

  const prompt = `คุณคือผู้เชี่ยวชาญด้านสภาพอากาศ วิเคราะห์ข้อมูลเมือง ${city} ต่อไปนี้:\n${lines.join('\n')}\nช่วยแนะนำการแต่งกายและกิจกรรมเป็นภาษาไทยแบบสั้นๆ ไม่ต้องมีสัญลักษณ์ Markdown (ดอกจัน)`;

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

router.post('/analyze-trip', upload.single('tripFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const city = req.body.city || 'Bangkok';
    const filePath = req.file.path;

    // Read file content
    const fileContent = await readFileContent(filePath, req.file.mimetype);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    if (!fileContent || fileContent.trim().length === 0) {
      return res.status(400).json({ error: 'File is empty or could not be read' });
    }

    // Analyze trip plan
    const analysis = await analyzeTripPlan(fileContent, city);

    res.json({
      city,
      fileName: req.file.originalname,
      analysis
    });

  } catch (err) {
    console.error('Trip analysis error:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze trip plan' });
  }
});

module.exports = router;
