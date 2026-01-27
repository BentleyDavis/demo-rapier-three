
import type { CellNode, Tile } from '../types/chunkTypes';
import { updateAvailableTilesForNeighbors } from './updateAvailableTiles';
import { directions } from './directions';

/**
 * Determines which tiles can be placed at a cell based on its neighbors (using CellNode references).
 * @param cell The CellNode to check
 * @param tiles Array of all possible tiles
 * @returns Array of compatible tiles
 */

export function getCompatibleTiles(cell: CellNode, tiles: Tile[]): Tile[] {

    // Create a dummy cell to use updateAvailableTilesForNeighbors without mutating the original cell
    const dummyCell: CellNode = {
        ...cell,
        availableTiles: [...tiles],
        tile: null // ensure not collapsed
    };
    // Build neighbors object
    const neighbors: Partial<{ N: CellNode; S: CellNode; E: CellNode; W: CellNode }> = {};
    for (const { dir } of directions) {
        if ((cell as any)[dir]) neighbors[dir] = (cell as any)[dir];
    }
    updateAvailableTilesForNeighbors(dummyCell, neighbors);
    return dummyCell.availableTiles;
}
