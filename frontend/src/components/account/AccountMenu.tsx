import { useEffect, useRef, useState } from 'react';
import type { UserProfile } from '../../services/api';
import { AccountAvatar } from './AccountAvatar';

interface AccountMenuProps {
  user: UserProfile;
  loading?: boolean;
  onProfile: () => void;
  onLogout: () => void;
}

export function AccountMenu({ user, loading, onProfile, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className="scout-account-menu" ref={containerRef}>
      <button
        type="button"
        className="scout-account-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        title="Account"
        onClick={() => setOpen((current) => !current)}
      >
        <AccountAvatar user={user} />
      </button>

      {open && (
        <div className="scout-account-dropdown" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onProfile();
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
            </svg>
            Profile
          </button>
          <button
            type="button"
            role="menuitem"
            className="scout-account-logout"
            disabled={loading}
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 5H5v14h5" />
              <path d="m14 8 4 4-4 4" />
              <path d="M18 12H9" />
            </svg>
            {loading ? 'Signing out...' : 'Log out'}
          </button>
        </div>
      )}
    </div>
  );
}
