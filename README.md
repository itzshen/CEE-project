# 🌦️ Full-Stack Weather Dashboard

A professional, responsive weather forecasting application built with the MERN stack. This project features real-time data visualization, secure third-party authentication, and dynamic theme switching.

> 🎓 **Final Project — Group SixSevenGxng2026** | Computer Engineering Essentials Course

---

## 🚀 Key Features

- **Third-Party Authentication:** Secure login and signup via Clerk (Google, GitHub, and Email support).
- **Dynamic Data Visualization:** Interactive weather trends rendered via Chart.js that automatically adapt to light/dark themes.
- **Real-Time Notifications:** Smart rain alerts using `react-hot-toast` to notify users of upcoming precipitation.
- **Theme Engine:** A robust dark/light mode toggle with persistent state across the dashboard.
- **Responsive Design:** A premium UI built with modern CSS variables for a seamless experience on any device.

---

## 🛠️ Tech Stack

| Tier       | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React.js, Vite, Chart.js, Clerk Auth    |
| Backend    | Node.js, Express                        |
| Styling    | Modern CSS (Variables & Flexbox/Grid)   |
| API        | OpenWeatherMap 5-Day / 3-Hour Forecast  |

---

## 📦 Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/itzshen/CEE_FinalProject_SixSevenGxng2026
cd CEE_FinalProject_SixSevenGxng2026
```

### 2. Backend Setup

Navigate to the server directory and install dependencies:

```bash
cd server
npm install
```

Create a `.env` file in the `server` folder:

```env
PORT=5000
WEATHER_API_KEY=your_openweathermap_api_key
```

### 3. Frontend Setup

Navigate to the client directory and install dependencies:

```bash
cd client
npm install
```

Create a `.env` file in the `client` folder:

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

### 4. Run the Application

Start the backend (from the `server` folder):

```bash
npm run dev
```

Start the frontend (from the `client` folder):

```bash
npm start
```

---

## 👥 Group SixSevenGxng2026

This project was developed as a final project for the **Computer Engineering Essentials** course.
# CEE-project
