/**
 * Shared directions array for tile-based neighbor logic.
 */
export const directions = [
    { dir: 'N', opp: 'S' },
    { dir: 'S', opp: 'N' },
    { dir: 'E', opp: 'W' },
    { dir: 'W', opp: 'E' }
] as const;