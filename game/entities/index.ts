/**
 * Game Entities Export Index
 * Central export point for all game entity classes
 */

// Base entity
export { Entity } from './Entity';
export type { EntityConfig, EntityState } from './Entity';

// Player entity
export { PlayerEntity } from './PlayerEntity';
export type { PlayerEntityConfig } from './PlayerEntity';

// Bomb entity
export { BombEntity } from './BombEntity';
export type { BombEntityConfig } from './BombEntity';

// Powerup entity
export { PowerupEntity } from './PowerupEntity';
export type { PowerupEntityConfig } from './PowerupEntity';

// Tile entity
export { TileEntity } from './TileEntity';
export type { TileEntityConfig } from './TileEntity';

// Explosion entity
export { ExplosionEntity } from './ExplosionEntity';
export type { ExplosionEntityConfig } from './ExplosionEntity';
