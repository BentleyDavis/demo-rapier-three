import type { TileType, Tile } from '../types/chunkTypes';

// Utility to expand tile types into all rotations (0, 90, 180, 270)

export function expandTileTypes(tileTypes: TileType[]): Tile[] {
    const rotations = [0, 90, 180, 270];
    const tiles: Tile[] = [];
    const seenConfigs = new Set<string>();
    for (const tileType of tileTypes) {
        for (const rot of rotations) {
            // Rotate edges accordingly
            let N = tileType.N, E = tileType.E, S = tileType.S, W = tileType.W;
            if (rot === 90) {
                N = tileType.W; E = tileType.N; S = tileType.E; W = tileType.S;
            } else if (rot === 180) {
                N = tileType.S; E = tileType.W; S = tileType.N; W = tileType.E;
            } else if (rot === 270) {
                N = tileType.E; E = tileType.S; S = tileType.W; W = tileType.N;
            }
            // Create a unique key for the edge configuration
            const configKey = `${tileType.type}|${N}|${E}|${S}|${W}`;
            if (!seenConfigs.has(configKey)) {
                seenConfigs.add(configKey);
                tiles.push({
                    id: `${tileType.type}_${rot}`,
                    type: tileType.type,
                    rotation: rot,
                    N, S, E, W
                });
            }
        }
    }
    return tiles;
}
