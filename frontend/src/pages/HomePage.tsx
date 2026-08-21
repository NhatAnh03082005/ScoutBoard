import React from 'react';

interface HomePageProps {
  onNavigateToSearch: () => void;
  onNavigateToLogin: () => void;
  isAuthenticated: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigateToSearch,
  onNavigateToLogin,
  isAuthenticated,
}) => {
  return (
    <div className="scout-home-container">
      {/* 1. Hero Section */}
      <section className="scout-home-hero">
        <div className="scout-home-hero-badge">
          ⚽ FOOTBALL ANALYTICS PLATFORM
        </div>
        <h1 className="scout-home-hero-title">
          ScoutBoard
        </h1>
        <p className="scout-home-hero-subtitle">
          Search, evaluate, and compare professional football players through data-driven scouting intelligence.
        </p>

        <div className="scout-home-hero-actions">
          <button
            type="button"
            onClick={onNavigateToSearch}
            className="scout-home-btn-primary"
          >
            <span>🔍</span>
            <span>Find Players</span>
          </button>
          {!isAuthenticated && (
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="scout-home-btn-secondary"
            >
              <span>🔑</span>
              <span>Login</span>
            </button>
          )}
        </div>
      </section>

      {/* 2. Core Capabilities Section */}
      <section className="scout-home-capabilities">
        <div className="scout-home-section-header">
          <h2 className="scout-home-section-title">Platform Capabilities</h2>
          <p className="scout-home-section-subtitle">
            Professional analytics and data-driven scouting tools for modern football
          </p>
        </div>

        <div className="scout-home-cards-grid">
          {/* Card 1: Player Search */}
          <div className="scout-home-feature-card" onClick={onNavigateToSearch}>
            <div className="scout-home-feature-icon-wrapper">
              <span>🔎</span>
            </div>
            <h3 className="scout-home-feature-title">Player Search</h3>
            <p className="scout-home-feature-desc">
              Multi-dimensional filtering across leagues, clubs, positions, age brackets, height, and preferred foot with instant results.
            </p>
            <div className="scout-home-feature-link">
              <span>Explore player roster →</span>
            </div>
          </div>

          {/* Card 2: Player Analysis */}
          <div className="scout-home-feature-card" onClick={onNavigateToSearch}>
            <div className="scout-home-feature-icon-wrapper">
              <span>📊</span>
            </div>
            <h3 className="scout-home-feature-title">Profiles & Statistics</h3>
            <p className="scout-home-feature-desc">
              In-depth player biographies, career match histories, and comprehensive Per-90 performance metrics across competitive seasons.
            </p>
            <div className="scout-home-feature-link">
              <span>View player records →</span>
            </div>
          </div>

          {/* Card 3: Player Comparison */}
          <div className="scout-home-feature-card" onClick={onNavigateToSearch}>
            <div className="scout-home-feature-icon-wrapper">
              <span>⚔️</span>
            </div>
            <h3 className="scout-home-feature-title">Visual Comparison</h3>
            <p className="scout-home-feature-desc">
              Head-to-head tactical comparison between two candidates by position and competition scope with interactive Per-90 radar charts.
            </p>
            <div className="scout-home-feature-link">
              <span>Launch comparison →</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
