import React from 'react';
import type { PlayerItem } from '../../types/player.types';

interface PlayerTableProps {
  players: PlayerItem[];
}

export const PlayerTable: React.FC<PlayerTableProps> = ({ players }) => {
  const calculateAge = (dateOfBirth?: string | null): string => {
    if (!dateOfBirth) return 'N/A';
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) return 'N/A';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} yrs`;
  };

  return (
    <div className="player-table-container" style={{ marginTop: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
          🏃 Players List ({players.length})
        </h3>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Club</th>
              <th>Position</th>
              <th>Age</th>
              <th>Nationality</th>
              <th>Height</th>
              <th>Preferred Foot</th>
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No players found.
                </td>
              </tr>
            ) : (
              players.map((player) => (
                <tr key={player.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                        }}
                      >
                        ⚽
                      </div>
                      <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                        {player.fullName}
                      </span>
                    </div>
                  </td>
                  <td>
                    {player.currentTeam ? (
                      <span className="role-pill" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd' }}>
                        {player.currentTeam.shortName || player.currentTeam.name}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Free Agent</span>
                    )}
                  </td>
                  <td>
                    <span className="status-badge status-active">
                      {player.primaryPosition || 'N/A'}
                    </span>
                  </td>
                  <td>{calculateAge(player.dateOfBirth)}</td>
                  <td>{player.nationality || 'N/A'}</td>
                  <td>{player.heightCm ? `${player.heightCm} cm` : 'N/A'}</td>
                  <td>
                    {player.preferredFoot ? (
                      <span
                        className="role-pill"
                        style={{
                          background:
                            player.preferredFoot === 'LEFT'
                              ? 'rgba(168, 85, 247, 0.2)'
                              : player.preferredFoot === 'RIGHT'
                              ? 'rgba(34, 197, 94, 0.2)'
                              : 'rgba(245, 158, 11, 0.2)',
                          color:
                            player.preferredFoot === 'LEFT'
                              ? '#c084fc'
                              : player.preferredFoot === 'RIGHT'
                              ? '#4ade80'
                              : '#fde047',
                        }}
                      >
                        {player.preferredFoot}
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
