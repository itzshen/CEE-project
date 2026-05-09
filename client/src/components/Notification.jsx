import { Toaster } from 'react-hot-toast';
import { useTheme } from '../context/useTheme';

export function Notification() {
  const { theme } = useTheme();

  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 5000,
        style: {
          background: 'var(--toast-bg)',
          color: 'var(--toast-fg)',
          border: '1px solid var(--toast-border)',
          boxShadow: 'var(--shadow)',
        },
        className: theme === 'dark' ? 'toast-dark' : 'toast-light',
      }}
    />
  );
}
