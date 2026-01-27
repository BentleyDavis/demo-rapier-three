import type { CellNode } from '../types/chunkTypes';

/**
 * Updates the availableTiles of a cell based on up to 4 directional neighbors.
 * Only keeps tiles that are compatible with all provided neighbors.
 * @param mainCell The cell whose availableTiles will be updated
 * @param neighbors An object with optional N, S, E, W properties (neighbor CellNodes)
 */
export function updateAvailableTilesForNeighbors(
  mainCell: CellNode,
  neighbors: Partial<{ N: CellNode; S: CellNode; E: CellNode; W: CellNode }>
) {
  mainCell.availableTiles = mainCell.availableTiles.filter(tile => {
    if (neighbors.N && neighbors.N.tile && neighbors.N.tile.S !== tile.N) return false;
    if (neighbors.S && neighbors.S.tile && neighbors.S.tile.N !== tile.S) return false;
    if (neighbors.E && neighbors.E.tile && neighbors.E.tile.W !== tile.E) return false;
    if (neighbors.W && neighbors.W.tile && neighbors.W.tile.E !== tile.W) return false;
    return true;
  });
}