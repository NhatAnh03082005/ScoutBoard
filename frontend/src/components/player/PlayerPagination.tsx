import React from 'react';
import type { PaginationMetadata } from '../../types/player.types';
import { Pagination } from '../common/Pagination';

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

  return (
    <Pagination
      currentPage={currentPage}
      totalItems={total}
      pageSize={limit}
      onPageChange={(page) => onPageChange && onPageChange(page)}
      itemLabel="players"
    />
  );
};
