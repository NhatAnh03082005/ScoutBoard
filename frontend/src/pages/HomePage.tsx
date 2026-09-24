import React from 'react';

interface HomePageProps {
  onNavigateToSearch: () => void;
  onNavigateToShortlists: () => void;
  onNavigateToSquads: () => void;
  onNavigateToLogin: () => void;
  isAuthenticated: boolean;
}

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </svg>
);

const ChartIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 20V10" />
    <path d="M12 20V4" />
    <path d="M19 20v-7" />
  </svg>
);

const ListIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 6h11" />
    <path d="M9 12h11" />
    <path d="M9 18h11" />
    <path d="M4 6h.01" />
    <path d="M4 12h.01" />
    <path d="M4 18h.01" />
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 20v-2a5.5 5.5 0 0 1 11 0v2" />
    <path d="M16 5.5a3 3 0 0 1 0 5.8" />
    <path d="M18 14a5 5 0 0 1 2.5 4.3V20" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3 5 6v5c0 4.8 2.8 8.1 7 10 4.2-1.9 7-5.2 7-10V6l-7-3Z" />
  </svg>
);

const TrophyIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
    <path d="M8 6H4v2a4 4 0 0 0 4 4" />
    <path d="M16 6h4v2a4 4 0 0 1-4 4" />
    <path d="M12 12v5" />
    <path d="M8 21h8" />
    <path d="M9 17h6v4H9z" />
  </svg>
);

const PitchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="1" />
    <path d="M12 5v14" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M3 9h3v6H3" />
    <path d="M21 9h-3v6h3" />
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m14 7 5 5-5 5" />
  </svg>
);

const StarIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
  </svg>
);

const RadarChart = () => (
  <svg className="scout-home-radar" viewBox="0 0 190 160" role="img" aria-label="Player performance radar chart">
    <g className="scout-home-radar-grid">
      <polygon points="95,22 145,51 145,109 95,138 45,109 45,51" />
      <polygon points="95,40 129,60 129,100 95,120 61,100 61,60" />
      <polygon points="95,58 113,69 113,91 95,102 77,91 77,69" />
      <path d="M95 22v116M45 51l100 58M145 51 45 109" />
    </g>
    <polygon className="scout-home-radar-area" points="95,43 132,62 137,104 95,126 56,102 62,63" />
    <g className="scout-home-radar-points">
      <circle cx="95" cy="43" r="3" />
      <circle cx="132" cy="62" r="3" />
      <circle cx="137" cy="104" r="3" />
      <circle cx="95" cy="126" r="3" />
      <circle cx="56" cy="102" r="3" />
      <circle cx="62" cy="63" r="3" />
    </g>
    <g className="scout-home-radar-labels">
      <text x="95" y="13" textAnchor="middle">Pace</text>
      <text x="163" y="49">Shooting</text>
      <text x="155" y="121">Passing</text>
      <text x="95" y="155" textAnchor="middle">Dribbling</text>
      <text x="0" y="121">Defending</text>
      <text x="3" y="49">Physical</text>
    </g>
  </svg>
);

export const HomePage: React.FC<HomePageProps> = ({
  onNavigateToSearch,
  onNavigateToShortlists,
  onNavigateToSquads,
  onNavigateToLogin,
  isAuthenticated,
}) => {
  const handleShortlistAction = () => {
    if (isAuthenticated) onNavigateToShortlists();
    else onNavigateToLogin();
  };

  return (
    <main className="scout-home-container">
      <section className="scout-home-hero" aria-labelledby="scout-home-title">
        <div className="scout-home-hero-inner">
          <div className="scout-home-copy">
            <p className="scout-home-eyebrow">Football scouting &amp; analytics</p>
            <h1 id="scout-home-title" className="scout-home-hero-title">
              Find the right player.<br />{' '}
              Build a better team.
            </h1>
            <p className="scout-home-hero-subtitle">
              Search, compare and organize player data in one focused scouting workspace.
            </p>
            <div className="scout-home-hero-actions">
              <button type="button" onClick={onNavigateToSearch} className="scout-home-btn-primary">
                <span>Explore players</span>
                <ArrowIcon />
              </button>
              <button type="button" onClick={isAuthenticated ? onNavigateToSquads : onNavigateToLogin} className="scout-home-btn-secondary">
                Build a squad
              </button>
            </div>
          </div>

          <div className="scout-home-player-showcase" aria-label="Featured player Nhật Anh">
            <img
              className="scout-home-player-image"
              src="/images/home-player.png"
              alt="Nhật Anh wearing a blue football shirt with number 11"
            />

            <article className="scout-home-player-card">
              <header className="scout-home-player-card-header">
                <div>
                  <h2>Nhật Anh</h2>
                  <p>Age 21 <span aria-hidden="true">|</span> 175 cm <span aria-hidden="true">|</span> Right foot</p>
                </div>
                <span className="scout-home-position-badge">LW</span>
              </header>

              <div className="scout-home-player-card-body">
                <RadarChart />
                <div className="scout-home-rating-list" aria-label="Featured player ratings">
                  <div><strong>82</strong><span>PAC</span></div>
                  <div><strong>76</strong><span>PAS</span></div>
                  <div><strong>84</strong><span>DRI</span></div>
                </div>
              </div>

              <button type="button" className="scout-home-shortlist-button" onClick={handleShortlistAction}>
                <StarIcon />
                <span>Add to shortlist</span>
              </button>
            </article>
          </div>
        </div>
      </section>

      <section className="scout-home-summary" aria-label="ScoutBoard platform summary">
        <div className="scout-home-stat-strip">
          <div className="scout-home-stat-item">
            <span className="scout-home-stat-icon"><UsersIcon /></span>
            <span><strong>3,000+</strong><small>Players</small></span>
          </div>
          <div className="scout-home-stat-item">
            <span className="scout-home-stat-icon"><ShieldIcon /></span>
            <span><strong>100+</strong><small>Clubs</small></span>
          </div>
          <div className="scout-home-stat-item">
            <span className="scout-home-stat-icon"><TrophyIcon /></span>
            <span><strong>20+</strong><small>Competitions</small></span>
          </div>
          <div className="scout-home-stat-item scout-home-stat-item-wide">
            <span className="scout-home-stat-icon"><PitchIcon /></span>
            <span><strong>One scouting workspace</strong></span>
          </div>
        </div>

        <div className="scout-home-cards-grid">
          <button type="button" className="scout-home-feature-card" onClick={onNavigateToSearch}>
            <span className="scout-home-feature-icon-wrapper"><SearchIcon /></span>
            <span className="scout-home-feature-content">
              <strong className="scout-home-feature-title">Discover players</strong>
              <small className="scout-home-feature-desc">Powerful search and filters to find the right talent, faster.</small>
            </span>
          </button>

          <button type="button" className="scout-home-feature-card" onClick={onNavigateToSearch}>
            <span className="scout-home-feature-icon-wrapper"><ChartIcon /></span>
            <span className="scout-home-feature-content">
              <strong className="scout-home-feature-title">Compare performance</strong>
              <small className="scout-home-feature-desc">Visualize key stats and identify strengths at a glance.</small>
            </span>
          </button>

          <button type="button" className="scout-home-feature-card" onClick={handleShortlistAction}>
            <span className="scout-home-feature-icon-wrapper"><ListIcon /></span>
            <span className="scout-home-feature-content">
              <strong className="scout-home-feature-title">Build shortlists</strong>
              <small className="scout-home-feature-desc">Save, organize and track players across your scouting process.</small>
            </span>
          </button>
        </div>
      </section>
    </main>
  );
};
