import { TransformedPlayer } from './transformed-player.model';

export interface TransformedTeam {
  externalProvider: string;
  externalId: string;
  name: string;
  shortName: string | null;
  tla: string | null;
  country: string | null;
  foundedYear: number | null;
  venueName: string | null;
  logoUrl: string | null;
  status: string;
  dataUpdatedAt: Date | null;
  squad: TransformedPlayer[];
}
