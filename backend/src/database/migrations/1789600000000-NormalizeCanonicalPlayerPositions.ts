import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeCanonicalPlayerPositions1789600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Normalize detailed strings in players table
    await queryRunner.query(`
      UPDATE players SET primary_position = 'GK'
      WHERE UPPER(TRIM(primary_position)) IN ('GOALKEEPER', 'GOALIE', 'KEEPER', 'G');

      UPDATE players SET primary_position = 'CB'
      WHERE UPPER(TRIM(primary_position)) IN ('CENTRE-BACK', 'CENTRE BACK', 'CENTER-BACK', 'CENTER BACK', 'CENTRAL DEFENDER', 'CENTRE DEFENDER');

      UPDATE players SET primary_position = 'LB'
      WHERE UPPER(TRIM(primary_position)) IN ('LEFT-BACK', 'LEFT BACK', 'LEFT DEFENDER');

      UPDATE players SET primary_position = 'RB'
      WHERE UPPER(TRIM(primary_position)) IN ('RIGHT-BACK', 'RIGHT BACK', 'RIGHT DEFENDER');

      UPDATE players SET primary_position = 'LWB'
      WHERE UPPER(TRIM(primary_position)) IN ('LEFT WING-BACK', 'LEFT WING BACK', 'LEFT-WING-BACK');

      UPDATE players SET primary_position = 'RWB'
      WHERE UPPER(TRIM(primary_position)) IN ('RIGHT WING-BACK', 'RIGHT WING BACK', 'RIGHT-WING-BACK');

      UPDATE players SET primary_position = 'CDM'
      WHERE UPPER(TRIM(primary_position)) IN ('DEFENSIVE MIDFIELD', 'DEFENSIVE MIDFIELDER', 'DM', 'HOLDING MIDFIELDER');

      UPDATE players SET primary_position = 'CM'
      WHERE UPPER(TRIM(primary_position)) IN ('CENTRAL MIDFIELD', 'CENTRAL MIDFIELDER');

      UPDATE players SET primary_position = 'CAM'
      WHERE UPPER(TRIM(primary_position)) IN ('ATTACKING MIDFIELD', 'ATTACKING MIDFIELDER', 'AM', 'PLAYMAKER');

      UPDATE players SET primary_position = 'LM'
      WHERE UPPER(TRIM(primary_position)) IN ('LEFT MIDFIELD', 'LEFT MIDFIELDER');

      UPDATE players SET primary_position = 'RM'
      WHERE UPPER(TRIM(primary_position)) IN ('RIGHT MIDFIELD', 'RIGHT MIDFIELDER');

      UPDATE players SET primary_position = 'LW'
      WHERE UPPER(TRIM(primary_position)) IN ('LEFT WINGER', 'LEFT WING');

      UPDATE players SET primary_position = 'RW'
      WHERE UPPER(TRIM(primary_position)) IN ('RIGHT WINGER', 'RIGHT WING');

      UPDATE players SET primary_position = 'CF'
      WHERE UPPER(TRIM(primary_position)) IN ('CENTRE-FORWARD', 'CENTRE FORWARD', 'CENTER-FORWARD', 'CENTER FORWARD', 'SECOND STRIKER');

      UPDATE players SET primary_position = 'ST'
      WHERE UPPER(TRIM(primary_position)) IN ('STRIKER');

      -- Non-canonical FWB handling (LWB if left foot, RWB default)
      UPDATE players
      SET primary_position = CASE WHEN UPPER(TRIM(preferred_foot)) = 'LEFT' THEN 'LWB' ELSE 'RWB' END
      WHERE UPPER(TRIM(primary_position)) IN ('FWB', 'FULL-WING-BACK', 'WING BACK', 'WING-BACK', 'WB');

      -- Tier 3 Semantic Fallbacks for Broad Groups
      UPDATE players SET primary_position = 'CB'
      WHERE UPPER(TRIM(primary_position)) IN ('DEF', 'DEFENCE', 'DEFENDER', 'D', 'DF');

      UPDATE players SET primary_position = 'CM'
      WHERE UPPER(TRIM(primary_position)) IN ('MID', 'MIDFIELD', 'MIDFIELDER', 'M', 'MF');

      UPDATE players SET primary_position = 'ST'
      WHERE UPPER(TRIM(primary_position)) IN ('FWD', 'OFFENCE', 'ATTACKER', 'FORWARD', 'ATT', 'F', 'FW');
    `);

    // 2. Normalize detailed strings in player_positions table
    await queryRunner.query(`
      UPDATE player_positions SET position_code = 'GK'
      WHERE UPPER(TRIM(position_code)) IN ('GOALKEEPER', 'GOALIE', 'KEEPER', 'G');

      UPDATE player_positions SET position_code = 'CB'
      WHERE UPPER(TRIM(position_code)) IN ('CENTRE-BACK', 'CENTRE BACK', 'CENTER-BACK', 'CENTER BACK', 'CENTRAL DEFENDER', 'CENTRE DEFENDER');

      UPDATE player_positions SET position_code = 'LB'
      WHERE UPPER(TRIM(position_code)) IN ('LEFT-BACK', 'LEFT BACK', 'LEFT DEFENDER');

      UPDATE player_positions SET position_code = 'RB'
      WHERE UPPER(TRIM(position_code)) IN ('RIGHT-BACK', 'RIGHT BACK', 'RIGHT DEFENDER');

      UPDATE player_positions SET position_code = 'LWB'
      WHERE UPPER(TRIM(position_code)) IN ('LEFT WING-BACK', 'LEFT WING BACK', 'LEFT-WING-BACK');

      UPDATE player_positions SET position_code = 'RWB'
      WHERE UPPER(TRIM(position_code)) IN ('RIGHT WING-BACK', 'RIGHT WING BACK', 'RIGHT-WING-BACK');

      UPDATE player_positions SET position_code = 'CDM'
      WHERE UPPER(TRIM(position_code)) IN ('DEFENSIVE MIDFIELD', 'DEFENSIVE MIDFIELDER', 'DM', 'HOLDING MIDFIELDER');

      UPDATE player_positions SET position_code = 'CM'
      WHERE UPPER(TRIM(position_code)) IN ('CENTRAL MIDFIELD', 'CENTRAL MIDFIELDER');

      UPDATE player_positions SET position_code = 'CAM'
      WHERE UPPER(TRIM(position_code)) IN ('ATTACKING MIDFIELD', 'ATTACKING MIDFIELDER', 'AM', 'PLAYMAKER');

      UPDATE player_positions SET position_code = 'LM'
      WHERE UPPER(TRIM(position_code)) IN ('LEFT MIDFIELD', 'LEFT MIDFIELDER');

      UPDATE player_positions SET position_code = 'RM'
      WHERE UPPER(TRIM(position_code)) IN ('RIGHT MIDFIELD', 'RIGHT MIDFIELDER');

      UPDATE player_positions SET position_code = 'LW'
      WHERE UPPER(TRIM(position_code)) IN ('LEFT WINGER', 'LEFT WING');

      UPDATE player_positions SET position_code = 'RW'
      WHERE UPPER(TRIM(position_code)) IN ('RIGHT WINGER', 'RIGHT WING');

      UPDATE player_positions SET position_code = 'CF'
      WHERE UPPER(TRIM(position_code)) IN ('CENTRE-FORWARD', 'CENTRE FORWARD', 'CENTER-FORWARD', 'CENTER FORWARD', 'SECOND STRIKER');

      UPDATE player_positions SET position_code = 'ST'
      WHERE UPPER(TRIM(position_code)) IN ('STRIKER');

      -- Convert FWB in player_positions
      UPDATE player_positions pp
      SET position_code = CASE WHEN UPPER(TRIM(p.preferred_foot)) = 'LEFT' THEN 'LWB' ELSE 'RWB' END
      FROM players p
      WHERE pp.player_id = p.id AND UPPER(TRIM(pp.position_code)) IN ('FWB', 'FULL-WING-BACK', 'WING BACK', 'WING-BACK', 'WB');

      -- Tier 3 Semantic Fallbacks for player_positions
      UPDATE player_positions SET position_code = 'CB'
      WHERE UPPER(TRIM(position_code)) IN ('DEF', 'DEFENCE', 'DEFENDER', 'D', 'DF')
        AND NOT EXISTS (
          SELECT 1 FROM player_positions existing
          WHERE existing.player_id = player_positions.player_id AND existing.position_code = 'CB'
        );

      UPDATE player_positions SET position_code = 'CM'
      WHERE UPPER(TRIM(position_code)) IN ('MID', 'MIDFIELD', 'MIDFIELDER', 'M', 'MF')
        AND NOT EXISTS (
          SELECT 1 FROM player_positions existing
          WHERE existing.player_id = player_positions.player_id AND existing.position_code = 'CM'
        );

      UPDATE player_positions SET position_code = 'ST'
      WHERE UPPER(TRIM(position_code)) IN ('FWD', 'OFFENCE', 'ATTACKER', 'FORWARD', 'ATT', 'F', 'FW')
        AND NOT EXISTS (
          SELECT 1 FROM player_positions existing
          WHERE existing.player_id = player_positions.player_id AND existing.position_code = 'ST'
        );

      -- Delete any remaining duplicate or non-canonical rows in player_positions
      DELETE FROM player_positions
      WHERE position_code IN ('DEF', 'MID', 'FWD', 'DEFENCE', 'MIDFIELD', 'OFFENCE', 'DEFENDER', 'MIDFIELDER', 'ATTACKER', 'FORWARD', 'FWB', 'WB', 'D', 'M', 'F', 'DF', 'MF', 'FW', 'ATT');

      -- Remove duplicate (player_id, position_code) if any
      DELETE FROM player_positions p1 USING player_positions p2
      WHERE p1.id > p2.id AND p1.player_id = p2.player_id AND p1.position_code = p2.position_code;
    `);

    // 3. Ensure full consistency between players.primary_position and player_positions
    await queryRunner.query(`
      -- First, reset is_primary to false for any position that does NOT match players.primary_position
      UPDATE player_positions pp
      SET is_primary = false
      FROM players p
      WHERE pp.player_id = p.id
        AND p.primary_position IS NOT NULL
        AND pp.position_code != p.primary_position
        AND pp.is_primary = true;

      -- Insert missing primary positions into player_positions
      INSERT INTO player_positions (id, player_id, position_code, is_primary)
      SELECT gen_random_uuid(), p.id, p.primary_position, true
      FROM players p
      WHERE p.primary_position IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM player_positions pp
          WHERE pp.player_id = p.id AND pp.position_code = p.primary_position
        );

      -- Mark matching position as is_primary = true
      UPDATE player_positions pp
      SET is_primary = true
      FROM players p
      WHERE pp.player_id = p.id
        AND pp.position_code = p.primary_position
        AND pp.is_primary = false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Non-destructive cleanup migration. Reversing to invalid non-canonical strings is undesirable.
  }
}
