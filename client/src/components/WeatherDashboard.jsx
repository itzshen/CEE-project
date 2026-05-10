import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTheme } from '../context/useTheme'; // <-- NEW: Import your theme hook

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const WET_WEATHER = new Set(['Rain', 'Drizzle', 'Thunderstorm']);

function formatDayLabel(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Aggregate daily data including temperature, clouds, and precipitation from 3-hour forecast steps. */
function aggregateDailyData(list) {
  const byDay = new Map();
  for (const item of list) {
    const day = item.dt_txt.slice(0, 10);
    const temp = item.main?.temp;
    const clouds = item.clouds?.all;
    const rain = item.rain?.['3h'] || 0;
    const snow = item.snow?.['3h'] || 0;
    const precipitation = rain + snow;

    if (typeof temp !== 'number' || typeof clouds !== 'number') continue;

    const prev = byDay.get(day);
    if (!prev) {
      byDay.set(day, {
        temp: temp,
        clouds: clouds,
        precipitation: precipitation,
        count: 1
      });
    } else {
      // Keep highest temperature and clouds, accumulate precipitation
      prev.temp = Math.max(prev.temp, temp);
      prev.clouds = Math.max(prev.clouds, clouds);
      prev.precipitation += precipitation;
      prev.count += 1;
    }
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, data]) => ({
      day,
      temp: data.temp,
      clouds: data.clouds,
      precipitation: data.precipitation
    }));
}

function forecastHasRain(list) {
  return list.some((item) => WET_WEATHER.has(item.weather?.[0]?.main));
}

export function WeatherDashboard() {
  const { theme } = useTheme(); // <-- NEW: Grab the current theme state
  const [query, setQuery] = useState('Bangkok');
  const [loading, setLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [tripAnalysisLoading, setTripAnalysisLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [tripAnalysisError, setTripAnalysisError] = useState(null);
  const [daily, setDaily] = useState([]);
  const [meta, setMeta] = useState(null);
  const [advice, setAdvice] = useState('');
  const [tripAnalysis, setTripAnalysis] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fetchForecastRef = useRef(async () => {});

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAdvice('');
    setAnalysisError(null);

    try {
      const res = await fetch(`/api/forecast?q=${encodeURIComponent(query.trim() || 'London')}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || `Request failed (${res.status})`);
      }

      const list = data.list || [];
      setDaily(aggregateDailyData(list));
      setMeta({ city: data.city?.name || query, country: data.city?.country });

      if (forecastHasRain(list)) {
        toast("Don't forget your umbrella! Rain expected.", { id: 'rain-reminder', icon: '🌧️', style: { minWidth: '375px' } });
      } else {
        toast.dismiss('rain-reminder');
      }
    } catch (e) {
      setDaily([]);
      setMeta(null);
      setAdvice('');
      setError(e.message || 'Could not load forecast');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const fetchAnalysis = useCallback(async () => {
    if (!query.trim()) {
      setAnalysisError('กรุณาใส่ชื่อเมืองก่อนวิเคราะห์');
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);
    setAdvice('');

    try {
      const res = await fetch(`/api/forecast-analysis?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || `Request failed (${res.status})`);
      }

      const list = data.list || [];
      setDaily(aggregateDailyData(list));
      setMeta({ city: data.city?.name || query, country: data.city?.country });
      setAdvice(data.advice || 'ไม่สามารถวิเคราะห์ข้อมูลได้ในขณะนี้');

      if (forecastHasRain(list)) {
        toast("Don't forget your umbrella! Rain expected.", { id: 'rain-reminder', icon: '🌧️', style: { minWidth: '375px' } });
      } else {
        toast.dismiss('rain-reminder');
      }
    } catch (e) {
      setAdvice('');
      setAnalysisError(e.message || 'Could not load AI advice');
    } finally {
      setAnalysisLoading(false);
    }
  }, [query]);

  const handleFileUpload = useCallback(async () => {
    if (!selectedFile) {
      setTripAnalysisError('กรุณาเลือกไฟล์ก่อนอัปโหลด');
      return;
    }

    setTripAnalysisLoading(true);
    setTripAnalysisError(null);
    setTripAnalysis('');

    try {
      const formData = new FormData();
      formData.append('tripFile', selectedFile);
      formData.append('city', query.trim() || 'Bangkok');

      const res = await fetch('/api/analyze-trip', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || `Request failed (${res.status})`);
      }

      setTripAnalysis(data.analysis || 'ไม่สามารถวิเคราะห์แผนการเดินทางได้ในขณะนี้');
      toast.success('วิเคราะห์แผนการเดินทางสำเร็จ!', { icon: '📋' });
    } catch (e) {
      setTripAnalysis('');
      setTripAnalysisError(e.message || 'Could not analyze trip plan');
      toast.error('เกิดข้อผิดพลาดในการวิเคราะห์แผนการเดินทาง');
    } finally {
      setTripAnalysisLoading(false);
    }
  }, [selectedFile, query]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB
        setTripAnalysisError('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)');
        return;
      }
      if (!['application/pdf', 'text/plain'].includes(file.type)) {
        setTripAnalysisError('รองรับเฉพาะไฟล์ PDF และ TXT เท่านั้น');
        return;
      }
      setSelectedFile(file);
      setTripAnalysisError(null);
    }
  }, []);

  useEffect(() => {
    fetchForecastRef.current = fetchForecast;
  }, [fetchForecast]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) fetchForecastRef.current();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = useMemo(() => {
    const labels = daily.map(({ day }) => formatDayLabel(day));
    const temps = daily.map(({ temp }) => Math.round(temp * 10) / 10);
    const clouds = daily.map(({ clouds }) => clouds);
    const precipitations = daily.map(({ precipitation }) => Math.round(precipitation * 10) / 10);
    
    const isDark = theme === 'dark';
    const tempLineColor = isDark ? '#60a5fa' : '#2563eb';
    const tempFillColor = isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(37, 99, 235, 0.12)';
    const cloudLineColor = isDark ? '#f59e0b' : '#d97706';
    const cloudFillColor = isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(217, 119, 6, 0.12)';
    const precipLineColor = isDark ? '#10b981' : '#059669';
    const precipFillColor = isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.12)';

    return {
      labels,
      datasets: [
        {
          label: 'Temperature (°C)',
          data: temps,
          borderColor: tempLineColor,
          backgroundColor: tempFillColor,
          tension: 0.25,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'temperature',
        },
        {
          label: 'Cloud Coverage (%)',
          data: clouds,
          borderColor: cloudLineColor,
          backgroundColor: cloudFillColor,
          tension: 0.25,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'percentage',
        },
        {
          label: 'Precipitation (mm)',
          data: precipitations,
          borderColor: precipLineColor,
          backgroundColor: precipFillColor,
          tension: 0.25,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'precipitation',
        },
      ],
    };
  }, [daily, theme]);

  const chartOptions = useMemo(() => {
    const isDark = theme === 'dark';
    const textH = isDark ? '#f1f5f9' : '#121826';
    const textMuted = isDark ? '#94a3b8' : '#5c6678';
    const chartGrid = isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(15, 23, 42, 0.08)';

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: textH } },
        title: {
          display: true,
          text: 'Weather Forecast: Temperature, Clouds & Precipitation',
          color: textH,
          font: { size: 16, weight: '500' },
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              if (ctx.dataset.yAxisID === 'temperature') {
                return `${ctx.dataset.label}: ${ctx.parsed.y}°C`;
              } else if (ctx.dataset.yAxisID === 'percentage') {
                return `${ctx.dataset.label}: ${ctx.parsed.y}%`;
              } else if (ctx.dataset.yAxisID === 'precipitation') {
                return `${ctx.dataset.label}: ${ctx.parsed.y}mm`;
              }
              return `${ctx.dataset.label}: ${ctx.parsed.y}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: textMuted },
          grid: { color: chartGrid },
        },
        temperature: {
          type: 'linear',
          display: true,
          position: 'left',
          ticks: { color: textMuted },
          grid: { color: chartGrid },
          title: { display: true, text: 'Temperature (°C)', color: textMuted },
        },
        percentage: {
          type: 'linear',
          display: true,
          position: 'right',
          ticks: { color: textMuted },
          grid: { display: false },
          title: { display: true, text: 'Clouds (%)', color: textMuted },
          min: 0,
          max: 100,
        },
        precipitation: {
          type: 'linear',
          display: true,
          position: 'right',
          ticks: { color: textMuted },
          grid: { display: false },
          title: { display: true, text: 'Precipitation (mm)', color: textMuted },
          min: 0,
        },
      },
    }
  }, [theme]);

  return (
    <section className="dashboard" aria-label="Weather forecast">
      <div className="dashboard-header">
        <h2 className="section-title">Forecast</h2>
        <form
          className="city-form"
          onSubmit={(e) => {
            e.preventDefault();
            fetchForecast();
          }}
        >
          <label className="field city-field">
            <span className="visually-hidden">City</span>
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="City name"
              aria-label="City name"
            />
          </label>
          <div className="button-group">
            <button type="submit" className="btn btn-primary" disabled={loading || analysisLoading}>
              {loading ? 'Loading…' : 'Load'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchAnalysis}
              disabled={analysisLoading || loading || !query.trim()}
            >
              {analysisLoading ? 'Analyzing…' : 'AI Analysis'}
            </button>
          </div>
        </form>
      </div>

      {meta && (
        <>
          <p className="dashboard-meta">
            Showing forecast for <strong>{meta.city}</strong>
            {meta.country ? `, ${meta.country}` : ''}. Chart shows daily high temperatures, maximum cloud coverage, and total precipitation from the 5-day / 3-hour API.
          </p>
          {analysisError && <p className="error-banner" role="alert">{analysisError}</p>}
          {advice && (
            <div className="analysis-box">
              <h3>AI วิเคราะห์สภาพอากาศ</h3>
              <p>{advice}</p>
            </div>
          )}

          {/* Trip Plan Analysis Section */}
          <div className="trip-analysis-section">
            <h3>AI วิเคราะห์แผนการเดินทาง</h3>
            <p className="trip-description">
              อัปโหลดไฟล์ PDF หรือ TXT ที่มีแผนการเดินทาง/เที่ยว/งาน แล้ว AI จะวิเคราะห์และให้คำแนะนำการเตรียมตัวรับมือกับสภาพอากาศ
            </p>

            <div className="file-upload-area">
              <label className="file-input-label">
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileChange}
                  className="file-input"
                />
                <span className="file-input-text">
                  {selectedFile ? `📄 ${selectedFile.name}` : 'เลือกไฟล์ PDF หรือ TXT'}
                </span>
              </label>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleFileUpload}
                disabled={tripAnalysisLoading || !selectedFile}
              >
                {tripAnalysisLoading ? 'กำลังวิเคราะห์…' : 'วิเคราะห์แผนการเดินทาง'}
              </button>
            </div>

            {tripAnalysisError && <p className="error-banner" role="alert">{tripAnalysisError}</p>}
            {tripAnalysis && (
              <div className="analysis-box trip-result">
                <h4>ผลการวิเคราะห์แผนการเดินทาง</h4>
                <p>{tripAnalysis}</p>
              </div>
            )}
          </div>
        </>
      )}

      {error && <p className="error-banner" role="alert">{error}</p>}

      <div className="chart-wrap">
        {daily.length > 0 ? (
          <Line key={theme} data={chartData} options={chartOptions} /> 
        ) : (
          !loading && <p className="empty-chart">No chart data yet. Try loading a city.</p>
        )}
      </div>
    </section>
  );
}