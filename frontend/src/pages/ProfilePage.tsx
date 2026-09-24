import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AccountAvatar } from '../components/account/AccountAvatar';
import { Notification, type NotificationVariant } from '../components/common/Notification';
import type { UserProfile } from '../services/api';
import {
  changeMyPasswordApi,
  removeMyAvatarApi,
  updateMyAvatarApi,
  updateMyProfileApi,
} from '../services/profile.service';

interface ProfilePageProps {
  user: UserProfile;
  accessToken: string;
  onUserUpdated: (user: UserProfile) => void;
  onPasswordChanged: (message: string) => void;
}

interface ProfileNotice {
  variant: NotificationVariant;
  message: string;
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

async function prepareAvatar(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Supported avatar formats are JPG, PNG, and WebP.');
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('Avatar must be smaller than 2 MB.');
  }

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Your browser could not prepare this image.');
  }

  const sourceSize = Math.min(bitmap.width, bitmap.height);
  const sourceX = (bitmap.width - sourceSize) / 2;
  const sourceY = (bitmap.height - sourceSize) / 2;
  context.drawImage(
    bitmap,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    512,
    512,
  );
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.86),
  );
  if (!blob) throw new Error('Your browser could not prepare this image.');
  if (blob.size > MAX_AVATAR_BYTES) {
    throw new Error('The processed avatar is still larger than 2 MB.');
  }

  return new File([blob], 'avatar.webp', { type: 'image/webp' });
}

export function ProfilePage({
  user,
  accessToken,
  onUserUpdated,
  onPasswordChanged,
}: ProfilePageProps) {
  const [fullName, setFullName] = useState(user.fullName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [notice, setNotice] = useState<ProfileNotice | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setFullName(user.fullName || ''), [user.fullName]);

  const roles =
    user.roles ||
    user.userRoles?.map((userRole) => userRole.role?.code).filter(Boolean) ||
    [];

  const submitProfile = async (event: FormEvent) => {
    event.preventDefault();
    const nextName = fullName.trim();
    if (nextName.length < 2) {
      setNotice({ variant: 'warning', message: 'Display name must contain at least 2 characters.' });
      return;
    }

    setProfileSaving(true);
    setNotice(null);
    try {
      const updated = await updateMyProfileApi(accessToken, nextName);
      onUserUpdated(updated);
      setNotice({ variant: 'success', message: 'Profile updated successfully.' });
    } catch (error) {
      setNotice({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Unable to update your profile.',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      setNotice({ variant: 'warning', message: 'New password must contain at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotice({ variant: 'warning', message: 'New password and confirmation do not match.' });
      return;
    }

    setPasswordSaving(true);
    setNotice(null);
    try {
      const result = await changeMyPasswordApi(accessToken, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onPasswordChanged(result.message);
    } catch (error) {
      setNotice({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Unable to change your password.',
      });
      setPasswordSaving(false);
    }
  };

  const selectAvatar = async (file?: File) => {
    if (!file) return;
    setAvatarSaving(true);
    setNotice(null);
    try {
      const prepared = await prepareAvatar(file);
      const updated = await updateMyAvatarApi(accessToken, prepared);
      onUserUpdated(updated);
      setNotice({ variant: 'success', message: 'Avatar updated successfully.' });
    } catch (error) {
      setNotice({
        variant: error instanceof Error && error.message.includes('Supported') ? 'warning' : 'error',
        message: error instanceof Error ? error.message : 'Unable to update your avatar.',
      });
    } finally {
      setAvatarSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAvatar = async () => {
    setAvatarSaving(true);
    setNotice(null);
    try {
      const updated = await removeMyAvatarApi(accessToken);
      onUserUpdated(updated);
      setNotice({ variant: 'success', message: 'Avatar removed successfully.' });
    } catch (error) {
      setNotice({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Unable to remove your avatar.',
      });
    } finally {
      setAvatarSaving(false);
    }
  };

  return (
    <main className="scout-profile-page">
      <div className="scout-profile-shell">
        <header className="scout-profile-heading">
          <span className="scout-page-eyebrow">Account workspace</span>
          <h1>Your profile</h1>
          <p>Manage your ScoutBoard identity and account security.</p>
        </header>

        {notice && (
          <Notification
            variant={notice.variant}
            message={notice.message}
            onDismiss={() => setNotice(null)}
          />
        )}

        <section className="scout-profile-hero-card">
          <div className="scout-profile-avatar-wrap">
            <AccountAvatar user={user} size={112} />
            <button
              type="button"
              className="scout-profile-avatar-edit"
              aria-label="Choose a new avatar"
              disabled={avatarSaving}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 8.5h3l1.5-2h7l1.5 2h3v10H4z" />
                <circle cx="12" cy="13" r="3.25" />
              </svg>
            </button>
          </div>

          <div className="scout-profile-identity">
            <span className="scout-profile-kicker">SCOUTBOARD ACCOUNT</span>
            <h2>{user.fullName || 'ScoutBoard user'}</h2>
            <p>{user.email}</p>
            <div className="scout-profile-role-list">
              {roles.map((role) => <span key={role}>{role}</span>)}
              <span className="is-status">{user.status}</span>
            </div>
          </div>

          <div className="scout-profile-avatar-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => void selectAvatar(event.target.files?.[0])}
            />
            <button
              type="button"
              className="scout-profile-primary-action"
              disabled={avatarSaving}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarSaving ? 'Processing...' : user.avatarUrl ? 'Change photo' : 'Upload photo'}
            </button>
            {user.avatarUrl && (
              <button
                type="button"
                className="scout-profile-text-action"
                disabled={avatarSaving}
                onClick={() => void removeAvatar()}
              >
                Remove photo
              </button>
            )}
            <small>JPG, PNG or WebP · Maximum 2 MB</small>
          </div>
        </section>

        <div className="scout-profile-grid">
          <form className="scout-profile-panel" onSubmit={submitProfile}>
            <div className="scout-profile-panel-heading">
              <span className="scout-profile-panel-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
                </svg>
              </span>
              <div>
                <h3>Personal information</h3>
                <p>Update the name shown across ScoutBoard.</p>
              </div>
            </div>

            <label className="scout-profile-field">
              <span>Display name</span>
              <input
                value={fullName}
                minLength={2}
                maxLength={150}
                autoComplete="name"
                onChange={(event) => setFullName(event.target.value)}
              />
            </label>

            <label className="scout-profile-field">
              <span>Email address</span>
              <input value={user.email} readOnly aria-readonly="true" />
              <small>Your email is used to sign in and cannot be changed here.</small>
            </label>

            <div className="scout-profile-panel-footer">
              <button
                type="submit"
                className="scout-profile-primary-action"
                disabled={profileSaving || fullName.trim() === user.fullName}
              >
                {profileSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>

          <form className="scout-profile-panel" onSubmit={submitPassword}>
            <div className="scout-profile-panel-heading">
              <span className="scout-profile-panel-icon is-security">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5" y="10" width="14" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
              </span>
              <div>
                <h3>Account security</h3>
                <p>Changing your password signs out every session.</p>
              </div>
            </div>

            <label className="scout-profile-field">
              <span>Current password</span>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                autoComplete="current-password"
                required
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </label>

            <label className="scout-profile-field">
              <span>New password</span>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <small>Use at least 8 characters.</small>
            </label>

            <label className="scout-profile-field">
              <span>Confirm new password</span>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>

            <label className="scout-profile-password-toggle">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(event) => setShowPasswords(event.target.checked)}
              />
              Show passwords
            </label>

            <div className="scout-profile-panel-footer">
              <button
                type="submit"
                className="scout-profile-primary-action"
                disabled={passwordSaving}
              >
                {passwordSaving ? 'Changing password...' : 'Change password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
