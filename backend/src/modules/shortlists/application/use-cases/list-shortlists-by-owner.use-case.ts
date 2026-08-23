import { Injectable, Inject } from '@nestjs/common';
import {
  SHORTLIST_REPOSITORY,
  ShortlistRepository,
} from '../../domain/repositories/shortlist.repository';
import { Shortlist } from '../../domain/entities/shortlist';

@Injectable()
export class ListShortlistsByOwnerUseCase {
  constructor(
    @Inject(SHORTLIST_REPOSITORY)
    private readonly shortlistRepository: ShortlistRepository,
  ) {}

  async execute(ownerId: string): Promise<Shortlist[]> {
    return this.shortlistRepository.findByOwner(ownerId);
  }
}
