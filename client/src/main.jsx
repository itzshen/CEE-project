import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { ClerkProvider } from '@clerk/clerk-react';

// Import your ThemeProvider (Double check this file path matches your setup!)
import { ThemeProvider } from './context/ThemeContext.jsx'; 

// Import your Publishable Key from the .env file
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key. Did you add it to your client/.env file?");
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* ClerkProvider handles the login state globally */}
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      {/* ThemeProvider handles the dark mode state globally */}
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ClerkProvider>
  </StrictMode>
);