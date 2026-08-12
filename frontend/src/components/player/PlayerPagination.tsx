import React from 'react';
import type { PaginationMetadata } from '../../types/player.types';

interface PlayerPaginationProps {
  pagination?: PaginationMetadata | null;
  onPageChange?: (page: number) => void;
}

export const PlayerPagination: React.FC<PlayerPaginationProps> = ({
  pagination,
  onPageChange,
}) => {
  if (!pagination || pagination.total === 0) return null;

  const { limit, offset, total } = pagination;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="player-pagination">
      <button
        type="button"
        className="scout-btn scout-btn-secondary scout-btn-sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange && onPageChange(currentPage - 1)}
      >
        &lt; Previous
      </button>

      <div className="page-numbers">
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            className={`page-num-btn ${currentPage === page ? 'active' : ''}`}
            onClick={() => onPageChange && onPageChange(page)}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="scout-btn scout-btn-secondary scout-btn-sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange && onPageChange(currentPage + 1)}
      >
        Next &gt;
      </button>
    </div>
  );
};
