import { Shortlist } from './shortlist';
import {
  InvalidShortlistNameError,
  InvalidShortlistOwnerError,
} from '../errors/shortlist.errors';
import * as fs from 'fs';
import * as path from 'path';

describe('Shortlist Domain Entity (Unit)', () => {
  const validId = '11111111-1111-1111-1111-111111111111';
  const validOwnerId = '22222222-2222-2222-2222-222222222222';
  const validName = 'Top U23 Winger Targets';
  const validDescription = 'High potential wingers for next summer window';
  const createdAt = new Date();
  const updatedAt = new Date();

  it('should successfully create a valid Shortlist domain entity with full parameters', () => {
    const shortlist = new Shortlist(
      validId,
      validOwnerId,
      validName,
      validDescription,
      'PRIVATE',
      createdAt,
      updatedAt,
    );

    expect(shortlist).toBeInstanceOf(Shortlist);
    expect(shortlist.id).toBe(validId);
    expect(shortlist.getOwnerId()).toBe(validOwnerId);
    expect(shortlist.getName()).toBe(validName);
    expect(shortlist.getDescription()).toBe(validDescription);
    expect(shortlist.getVisibility()).toBe('PRIVATE');
    expect(shortlist.createdAt).toBe(createdAt);
    expect(shortlist.updatedAt).toBe(updatedAt);
  });

  it('should reject missing, empty, or whitespace-only ownerId', () => {
    expect(() => {
      new Shortlist(validId, '', validName);
    }).toThrow(InvalidShortlistOwnerError);

    expect(() => {
      new Shortlist(validId, '   ', validName);
    }).toThrow(InvalidShortlistOwnerError);

    expect(() => {
      new Shortlist(validId, null as any, validName);
    }).toThrow(InvalidShortlistOwnerError);
  });

  it('should reject missing, empty, or whitespace-only name', () => {
    expect(() => {
      new Shortlist(validId, validOwnerId, '');
    }).toThrow(InvalidShortlistNameError);

    expect(() => {
      new Shortlist(validId, validOwnerId, '   ');
    }).toThrow(InvalidShortlistNameError);

    expect(() => {
      new Shortlist(validId, validOwnerId, null as any);
    }).toThrow(InvalidShortlistNameError);
  });

  it('should default visibility to PRIVATE when omitted, and accept PUBLIC', () => {
    const defaultVisibilityShortlist = new Shortlist(
      validId,
      validOwnerId,
      'Default Visibility Shortlist',
    );
    expect(defaultVisibilityShortlist.getVisibility()).toBe('PRIVATE');

    const publicShortlist = new Shortlist(
      validId,
      validOwnerId,
      'Public Shortlist',
      null,
      'PUBLIC',
    );
    expect(publicShortlist.getVisibility()).toBe('PUBLIC');
  });

  it('should verify Domain Independence (Zero TypeORM or Infrastructure imports)', () => {
    const entityFilePath = path.resolve(__dirname, './shortlist.ts');
    const entityCode = fs.readFileSync(entityFilePath, 'utf8');

    expect(entityCode).not.toContain('typeorm');
    expect(entityCode).not.toContain('@nestjs');
    expect(entityCode).not.toContain('Entity(');
    expect(entityCode).not.toContain('Column(');
    expect(entityCode).not.toContain('PrimaryGeneratedColumn');
    expect(entityCode).not.toContain('ManyToOne');

    const repoFilePath = path.resolve(
      __dirname,
      '../repositories/shortlist.repository.ts',
    );
    const repoCode = fs.readFileSync(repoFilePath, 'utf8');

    expect(repoCode).not.toContain('typeorm');
    expect(repoCode).not.toContain('@nestjs');
  });

  it('should support updating name, description, and visibility', () => {
    const shortlist = new Shortlist(
      validId,
      validOwnerId,
      validName,
      validDescription,
      'PRIVATE',
    );

    shortlist.updateName('New Shortlist Name');
    expect(shortlist.getName()).toBe('New Shortlist Name');

    expect(() => shortlist.updateName('  ')).toThrow(InvalidShortlistNameError);

    shortlist.updateDescription('Updated description');
    expect(shortlist.getDescription()).toBe('Updated description');

    shortlist.updateDescription(null);
    expect(shortlist.getDescription()).toBeNull();

    shortlist.updateVisibility('PUBLIC');
    expect(shortlist.getVisibility()).toBe('PUBLIC');
  });

  it('should serialize cleanly to JSON', () => {
    const shortlist = new Shortlist(
      validId,
      validOwnerId,
      validName,
      validDescription,
      'PRIVATE',
      createdAt,
      updatedAt,
    );

    const json = shortlist.toJSON();

    expect(json).toEqual({
      id: validId,
      ownerId: validOwnerId,
      name: validName,
      description: validDescription,
      visibility: 'PRIVATE',
      createdAt,
      updatedAt,
    });
  });
});
