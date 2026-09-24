import React, { useState, useEffect } from 'react';
import { loginApi, registerApi } from '../services/api';
import type { UserProfile } from '../services/api';
import { Notification } from '../components/common/Notification';

type AuthSubMode = 'login' | 'register';

interface LoginPageProps {
  initialMode?: 'login' | 'register';
  onLoginSuccess: (user: UserProfile) => void;
  onNavigateHome: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  initialMode = 'login',
  onLoginSuccess,
  onNavigateHome,
}) => {
  const [authSubMode, setAuthSubMode] = useState<AuthSubMode>(initialMode);

  // Form input states
  const [email, setEmail] = useState(() => localStorage.getItem('scout_auth_email') || '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Lockout countdown state
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number>(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Auto-sync email to localStorage
  useEffect(() => {
    if (email.trim()) {
      localStorage.setItem('scout_auth_email', email.trim());
    }
  }, [email]);

  // Lockout countdown ticker
  useEffect(() => {
    if (retryAfterSeconds <= 0) return;
    const timer = setInterval(() => {
      setRetryAfterSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAfterSeconds]);

  const formatSeconds = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  // 1. Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const data = await loginApi(email.trim(), password);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('scout_access_token', data.accessToken);
      localStorage.setItem('scout_refresh_token', data.refreshToken);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      if (err.retryAfterSeconds && err.retryAfterSeconds > 0) {
        setRetryAfterSeconds(err.retryAfterSeconds);
        setError(err.message || 'Your account is temporarily locked.');
      } else if (err.remainingAttempts !== undefined) {
        setRemainingAttempts(err.remainingAttempts);
        setError(err.message || 'Incorrect email or password.');
      } else {
        setError(err.message || 'Sign in failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('Password confirmation does not match! Please check again.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const data = await registerApi(email.trim(), password, fullName.trim());
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('scout_access_token', data.accessToken);
      localStorage.setItem('scout_refresh_token', data.refreshToken);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scout-auth-canvas">
      {/* Subtle Background Geometric Depth Shapes */}
      <div className="scout-auth-bg-shape-1" />
      <div className="scout-auth-bg-shape-2" />

      {/* Floating Back to Home Button (Top Left) */}
      <button
        type="button"
        onClick={onNavigateHome}
        className="scout-auth-canvas-back-btn"
      >
        <span>←</span>
        <span>Back to Home</span>
      </button>

      {/* Main Grid: Left Hero Branding + Right Floating White Card */}
      <div className="scout-auth-canvas-grid">
        
        {/* =====================================================================
            LEFT HERO: WELCOME TO SCOUTBOARD + PLATFORM OVERVIEW
            ===================================================================== */}
        <div className="scout-auth-hero-section">
          {/* WELCOME TO Line (Big Header) */}
          <div className="scout-auth-hero-welcome-line">
            WELCOME TO
          </div>

          {/* SCOUTBOARD Brand Name (Bigger Header) */}
          <div className="scout-auth-hero-brand-line">
            SCOUTBOARD
          </div>

          {/* Overview of the platform */}
          <p className="scout-auth-hero-subtitle">
            ScoutBoard is a high-performance football analytics and scouting platform designed to search, evaluate, and compare professional players across major leagues worldwide with precision per-90 metrics and squad building intelligence.
          </p>
        </div>

        {/* =====================================================================
            RIGHT: FLOATING WHITE AUTHENTICATION CARD
            ===================================================================== */}
        <div className="scout-auth-card-container">
          <div className="scout-auth-floating-card">
            
            {/* Card Header */}
            <div>
              <h2 className="scout-auth-card-title">
                {authSubMode === 'login' && 'Sign In'}
                {authSubMode === 'register' && 'Create an Account'}
              </h2>
              <p className="scout-auth-card-sub">
                {authSubMode === 'login' && 'Please sign in to continue'}
                {authSubMode === 'register' && 'Sign up to unlock advanced features.'}
              </p>
            </div>

            {/* Error & Success Feedback Alerts */}
            {error && (
              <Notification variant="error" message={error} compact />
            )}
            {success && (
              <Notification variant="success" message={success} compact />
            )}

            {/* =================================================================
                1. SIGN IN FORM
                ================================================================= */}
            {authSubMode === 'login' && (
              <form onSubmit={handleLogin}>
                <div className="scout-auth-input-group">
                  <label className="scout-auth-label">Email or Username</label>
                  <div className="scout-auth-input-wrapper">
                    <input
                      type="email"
                      className="scout-auth-input"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="scout-auth-input-group">
                  <label className="scout-auth-label">Password</label>
                  <div className="scout-auth-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="scout-auth-input"
                      style={{ paddingRight: '44px' }}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="scout-auth-show-btn"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" x2="22" y1="2" y2="22" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <div className="scout-auth-row-options">
                  <label className="scout-auth-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="scout-auth-checkbox"
                    />
                    <span>Remember me</span>
                  </label>
                </div>

                {/* Lockout Warning Banners */}
                {retryAfterSeconds > 0 && (
                  <Notification
                    variant="warning"
                    compact
                    message={<>Account temporarily locked. Try again in: <strong>{formatSeconds(retryAfterSeconds)}</strong></>}
                  />
                )}
                {remainingAttempts !== null && retryAfterSeconds === 0 && (
                  <Notification
                    variant="warning"
                    compact
                    message={<>You have <strong>{remainingAttempts}</strong> attempt(s) remaining before lockout.</>}
                  />
                )}

                {/* Primary Submit Button */}
                <button
                  type="submit"
                  disabled={loading || retryAfterSeconds > 0}
                  className="scout-auth-btn-primary"
                >
                  {retryAfterSeconds > 0
                    ? `Locked (${formatSeconds(retryAfterSeconds)})`
                    : loading
                      ? 'Signing in...'
                      : 'Sign In →'}
                </button>

                {/* Switch to Register */}
                <div className="scout-auth-switch-footer">
                  Don't have an account?
                  <span
                    onClick={() => {
                      setAuthSubMode('register');
                      setError(null);
                      setSuccess(null);
                    }}
                    className="scout-auth-link-text"
                  >
                    Sign up
                  </span>
                </div>
              </form>
            )}

            {/* =================================================================
                2. SIGN UP FORM
                ================================================================= */}
            {authSubMode === 'register' && (
              <form onSubmit={handleRegister}>
                <div className="scout-auth-input-group">
                  <label className="scout-auth-label">Full Name *</label>
                  <input
                    type="text"
                    className="scout-auth-input"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="scout-auth-input-group">
                  <label className="scout-auth-label">Email Address *</label>
                  <input
                    type="email"
                    className="scout-auth-input"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="scout-auth-input-group">
                  <label className="scout-auth-label">Password * (Min 6 characters)</label>
                  <div className="scout-auth-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="scout-auth-input"
                      style={{ paddingRight: '44px' }}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="scout-auth-show-btn"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" x2="22" y1="2" y2="22" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="scout-auth-input-group">
                  <label className="scout-auth-label">Confirm Password *</label>
                  <div className="scout-auth-input-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="scout-auth-input"
                      style={{ paddingRight: '44px' }}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="scout-auth-show-btn"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" x2="22" y1="2" y2="22" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="scout-auth-btn-primary"
                >
                  {loading ? 'Creating account...' : 'Sign Up →'}
                </button>

                <div className="scout-auth-switch-footer">
                  Already have an account?
                  <span
                    onClick={() => {
                      setAuthSubMode('login');
                      setError(null);
                      setSuccess(null);
                    }}
                    className="scout-auth-link-text"
                  >
                    Sign in
                  </span>
                </div>
              </form>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
