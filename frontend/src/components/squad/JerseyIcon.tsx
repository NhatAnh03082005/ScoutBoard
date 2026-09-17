import React from 'react';

export const JerseyIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ opacity: 0.85 }}
  >
    <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.5a2 2 0 0 0 1.62 1.65L7 11.5V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8.5l2.52-.66a2 2 0 0 0 1.62-1.65l.58-3.5a2 2 0 0 0-1.34-2.23z" />
  </svg>
);
