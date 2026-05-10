# 🌦️ Full-Stack Weather Dashboard

A responsive weather dashboard with AI-powered analysis and trip-plan support. This project combines real-time weather data, interactive charts, Clerk authentication, and file upload analysis to help users prepare for changing weather.

> 🎓 **Final Project — Group SixSevenGxng2026** | Computer Engineering Essentials Course

---

## 🚀 Key Features

- **Weather Dashboard:** Current weather and 5-day forecast from OpenWeatherMap.
- **Interactive Charts:** Daily temperature, cloud coverage, and precipitation visualized with Chart.js.
- **AI Weather Advice:** Gemini API generates Thai weather guidance based on forecast data.
- **Trip Plan Analysis:** Upload PDF or TXT travel plans and receive weather readiness advice.
- **Dark/Light Theme:** Theme toggle with responsive styling and polished UI.
- **File Upload Support:** Upload `.pdf` or `.txt` files containing travel, event, or work plans.

---

## 🧩 Architecture

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | React, Vite, Chart.js, Clerk, react-hot-toast   |
| Backend   | Node.js, Express, Multer, pdf-parse             |
| AI        | Google Gemini API                               |
| Weather   | OpenWeatherMap API                              |

---

## 📦 Installation

### Backend

```bash
cd server
npm install
```

Create `server/.env` with:

```env
PORT=5000
WEATHER_API_KEY=your_openweathermap_api_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

### Frontend

```bash
cd client
npm install
```

Create `client/.env` with:

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

---

## ▶️ Run Locally

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend:

```bash
cd client
npm run dev
```

Open the frontend in your browser at `http://localhost:5173`.

---

## 📡 API Endpoints

- `GET /api/health` — health check
- `GET /api/weather?q={city}` — current weather data
- `GET /api/forecast?q={city}` — raw forecast data
- `GET /api/forecast-analysis?q={city}` — forecast plus AI advice
- `POST /api/analyze-trip` — upload `tripFile` (`.pdf` or `.txt`) and `city` for AI trip preparation advice

---

## 📝 Usage Notes

- The **forecast analysis** button shows AI-generated weather advice after loading forecast data.
- The **trip plan analysis** section accepts travel or event plans in PDF/TXT format and returns practical preparation tips.
- Keep your API keys safe and do not commit them to source control.

---

## 💡 Development Notes

- The backend uses `multer` for file uploads and `pdf-parse` to extract text from PDF files.
- The current AI model is defined by `GEMINI_MODEL` in `server/.env`.
- If Gemini quota is exhausted, the app gracefully returns a fallback message instead of crashing.

---

## 👥 Group SixSevenGxng2026

Final project for the Computer Engineering Essentials course.
