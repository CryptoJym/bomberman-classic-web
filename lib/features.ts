/**
 * Feature flags for Bomberman Online
 * Toggle features on/off via environment variables
 */

export const features = {
  TOURNAMENTS: process.env.NEXT_PUBLIC_FF_TOURNAMENTS === 'true',
  REPLAYS: process.env.NEXT_PUBLIC_FF_REPLAYS === 'true',
  MAP_EDITOR: process.env.NEXT_PUBLIC_FF_MAP_EDITOR === 'true',
  SPECTATOR: process.env.NEXT_PUBLIC_FF_SPECTATOR === 'true',
} as const;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof features): boolean {
  return features[feature];
}
