import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { WeatherDashboard } from './components/WeatherDashboard';
import { ThemeToggle } from './components/ThemeToggle';
import { Notification } from './components/Notification';

export default function App() {
  return (
    <>
      <header className="app-header">
        <div className="app-brand">
          <h1 className="app-title">Weather</h1>
          <p className="app-tagline">Final project dashboard</p>
        </div>
        
        {/* We group these so the theme toggle and profile picture sit next to each other */}
        <div className="header-actions">
          <ThemeToggle />
          
          <SignedIn>
            {/* Shows the user's Google/GitHub avatar when logged in */}
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      <div className="app">
        <main className="app-main">
          
          {/* Everything inside <SignedOut> ONLY shows to guests */}
          <SignedOut>
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <p className="gate-hint" style={{ marginBottom: '1rem' }}>
                Sign in to view the forecast and chart.
              </p>
              {/* Clerk's pre-built login modal trigger */}
              <SignInButton mode="modal">
                <button className="btn btn-primary">Sign In to Continue</button>
              </SignInButton>
            </div>
          </SignedOut>

          {/* Everything inside <SignedIn> ONLY shows to authenticated users */}
          <SignedIn>
            <WeatherDashboard />
          </SignedIn>

        </main>

        <Notification />
      </div>
    </>
  );
}