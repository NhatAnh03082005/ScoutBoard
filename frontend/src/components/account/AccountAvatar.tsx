import { useEffect, useState } from 'react';
import type { UserProfile } from '../../services/api';

interface AccountAvatarProps {
  user: UserProfile;
  size?: number;
  className?: string;
}

function getInitials(user: UserProfile): string {
  const source = user.fullName?.trim() || user.email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function AccountAvatar({ user, size = 38, className = '' }: AccountAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [user.avatarUrl]);

  return (
    <span
      className={`scout-account-avatar ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {user.avatarUrl && !imageFailed ? (
        <img
          src={user.avatarUrl}
          alt=""
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{getInitials(user)}</span>
      )}
    </span>
  );
}
