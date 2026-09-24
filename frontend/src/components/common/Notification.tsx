import React, {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export type NotificationVariant = 'success' | 'error' | 'warning' | 'info';
export type NotificationMode = 'inline' | 'toast';

export interface NotificationProps {
  variant: NotificationVariant;
  message: ReactNode;
  mode?: NotificationMode;
  actions?: ReactNode;
  onDismiss?: () => void;
  autoDismissMs?: number;
  compact?: boolean;
  style?: CSSProperties;
}

const LABELS: Record<NotificationVariant, string> = {
  success: 'Success',
  error: 'Failed',
  warning: 'Warning',
  info: 'Information',
};

const DEFAULT_AUTO_DISMISS_MS = 4000;

const NotificationIcon: React.FC<{ variant: NotificationVariant }> = ({ variant }) => {
  if (variant === 'success') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }

  if (variant === 'warning') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 2.8 20h18.4L12 3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    );
  }

  if (variant === 'info') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <path d="M12 8h.01" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </svg>
  );
};

export const Notification: React.FC<NotificationProps> = ({
  variant,
  message,
  mode = 'toast',
  actions,
  onDismiss,
  autoDismissMs = DEFAULT_AUTO_DISMISS_MS,
  compact = false,
  style,
}) => {
  const dismissRef = useRef(onDismiss);
  const [toastRegion, setToastRegion] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    setVisible(true);
    if (!autoDismissMs || autoDismissMs <= 0) return;

    const timeoutId = window.setTimeout(() => {
      if (dismissRef.current) {
        dismissRef.current();
        return;
      }
      setVisible(false);
    }, autoDismissMs);
    return () => window.clearTimeout(timeoutId);
  }, [autoDismissMs, message, variant]);

  useEffect(() => {
    if (mode !== 'toast') {
      setToastRegion(null);
      return;
    }

    let region = document.getElementById('scout-notification-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'scout-notification-region';
      region.className = 'scout-notification-region';
      region.setAttribute('aria-label', 'Notifications');
      document.body.appendChild(region);
    }
    setToastRegion(region);
  }, [mode]);

  const urgent = variant === 'error' || variant === 'warning';

  if (!visible) return null;

  const notification = (
    <div
      className="scout-notification"
      data-variant={variant}
      data-mode={mode}
      data-compact={compact || undefined}
      role={urgent ? 'alert' : 'status'}
      aria-live={urgent ? 'assertive' : 'polite'}
      aria-atomic="true"
      style={mode === 'inline' ? style : undefined}
    >
      <span data-part="icon">
        <NotificationIcon variant={variant} />
      </span>

      <span data-part="content">
        <strong data-part="label">{LABELS[variant]}</strong>
        <span data-part="message">{message}</span>
      </span>

      {actions && <span data-part="actions">{actions}</span>}

      {onDismiss && (
        <button
          type="button"
          data-part="dismiss"
          aria-label="Dismiss notification"
          onClick={() => {
            onDismiss();
            setVisible(false);
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m7 7 10 10" />
            <path d="m17 7-10 10" />
          </svg>
        </button>
      )}
    </div>
  );

  if (mode === 'toast') {
    return toastRegion ? createPortal(notification, toastRegion) : null;
  }

  return notification;
};
