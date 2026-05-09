import { useTheme } from '../context/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <label className="theme-toggle" title="Toggle color theme">
      <span className="theme-toggle-label">{isDark ? 'Dark' : 'Light'} mode</span>
      <span className="theme-toggle-track" data-on={isDark}>
        <input
          className="theme-toggle-input"
          type="checkbox"
          role="switch"
          aria-checked={isDark}
          checked={isDark}
          onChange={toggleTheme}
        />
        <span className="theme-toggle-thumb" aria-hidden />
      </span>
    </label>
  );
}
