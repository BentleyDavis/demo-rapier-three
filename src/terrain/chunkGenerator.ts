import seedrandom from 'seedrandom';
import type { Tile, ChunkConfig, CellNode } from "../types/chunkTypes";
import { expandTileTypes } from './expandTileTypes';

// Helper: collapse a cell by picking a random available tile
function collapseCell(cell: CellNode, prng: seedrandom.PRNG) {
    if (cell.availableTiles.length === 0) return;
    // Filter availableTiles to only those compatible with all currently-collapsed neighbors
    const compatibleTiles = cell.availableTiles.filter(tile => {
        // Check each neighbor direction
        if (cell.N && cell.N.tile && cell.N.tile.S !== tile.N) return false;
        if (cell.S && cell.S.tile && cell.S.tile.N !== tile.S) return false;
        if (cell.E && cell.E.tile && cell.E.tile.W !== tile.E) return false;
        if (cell.W && cell.W.tile && cell.W.tile.E !== tile.W) return false;
        return true;
    });
    if (compatibleTiles.length === 0) return;
    const idx = Math.floor(prng() * compatibleTiles.length);
    cell.tile = compatibleTiles[idx];
    cell.availableTiles = [];
}

// Helper: find the next minOptions value with a non-empty set
function findNextMinOptions(groupedByOptions: Record<number, Set<CellNode>>, currentMin: number, max: number): number | undefined {
    for (let i = currentMin + 1; i <= max; i++) {
        if (groupedByOptions[i] && groupedByOptions[i].size > 0) {
            return i;
        }
    }
    return undefined;
}

import { updateAvailableTilesForNeighbors } from './updateAvailableTiles';
import { directions } from './directions';

export function generateChunk(chunkConfig: ChunkConfig) {
    const seed = chunkConfig.worldConfig.seed + ':' + chunkConfig.x + ':' + chunkConfig.y;
    const prng = seedrandom(seed);

    // Expand tile types to all rotated tiles
    const allTiles = expandTileTypes(chunkConfig.worldConfig.tileTypes);
    const height = chunkConfig.worldConfig.height;
    const width = chunkConfig.worldConfig.width;
    const chunkArray: CellNode[][] = [];
    for (let y = 0; y < height; y++) {
        const row: CellNode[] = [];
        for (let x = 0; x < width; x++) {
            row.push({
                x,
                y,
                tile: null,
                availableTiles: [...allTiles]
            });
        }
        chunkArray.push(row);
    }

    // Set neighbor references
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cell = chunkArray[y][x];
            if (y > 0) cell.N = chunkArray[y - 1][x];
            if (y < height - 1) cell.S = chunkArray[y + 1][x];
            if (x < width - 1) cell.E = chunkArray[y][x + 1];
            if (x > 0) cell.W = chunkArray[y][x - 1];
        }
    }

    // Create a dictionary of tiles by id for efficient lookup (shared for future use)
    const tileDict: Record<string, Tile> = {};
    for (const tile of allTiles) {
        tileDict[tile.id] = tile;
    }

    // Place collapsedCells into the chunkArray
    if (chunkConfig.collapsedCells) {
        for (const cell of chunkConfig.collapsedCells) {
            const tile = tileDict[cell.tileId] || null;
            const node = chunkArray[cell.y][cell.x];
            node.tile = tile;
            node.availableTiles = [];
        }
    }


    // Group cells by the number of available tiles
    const groupedByOptions: Record<number, Set<CellNode>> = {};
    let minOptions = Infinity;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cell = chunkArray[y][x];
            if (cell.tile === null && cell.availableTiles.length > 0) {
                const optionsCount = cell.availableTiles.length;
                if (!groupedByOptions[optionsCount]) groupedByOptions[optionsCount] = new Set();
                groupedByOptions[optionsCount].add(cell);
                if (optionsCount < minOptions) minOptions = optionsCount;
            }
        }
    }



    // Main collapse loop using groupedByOptions
    while (minOptions !== Infinity) {
        const minSet = groupedByOptions[minOptions];
        if (!minSet || minSet.size === 0) {
            const nextMin = findNextMinOptions(groupedByOptions, minOptions, height * width);
            if (nextMin === undefined) break; // No more uncollapsed cells
            minOptions = nextMin;
            continue;
        }

        // Pick a random cell from the minSet
        const minCells = Array.from(minSet);
        const chosen = minCells[Math.floor(prng() * minCells.length)];
        minSet.delete(chosen);
        collapseCell(chosen, prng);

        // After collapsing, remove from all groups (should only be in one)
        for (const set of Object.values(groupedByOptions)) {
            set.delete(chosen);
        }
        // Constraint propagation: update availableTiles and regroup affected neighbors
        // For each neighbor, if its availableTiles changed, regroup it
        for (const { dir } of directions) {
            const neighbor = chosen[dir] as CellNode | undefined;
            if (!neighbor || neighbor.tile) continue;
            const prevOptions = neighbor.availableTiles.length;
            // Update neighbor's availableTiles based on all collapsed neighbors
            updateAvailableTilesForNeighbors(neighbor, {
                N: neighbor.N && neighbor.N.tile ? neighbor.N : undefined,
                S: neighbor.S && neighbor.S.tile ? neighbor.S : undefined,
                E: neighbor.E && neighbor.E.tile ? neighbor.E : undefined,
                W: neighbor.W && neighbor.W.tile ? neighbor.W : undefined,
            });
            const newOptions = neighbor.availableTiles.length;
            if (newOptions !== prevOptions) {
                // Remove from old group
                if (groupedByOptions[prevOptions]) groupedByOptions[prevOptions].delete(neighbor);
                // Add to new group if still available
                if (newOptions > 0) {
                    if (!groupedByOptions[newOptions]) groupedByOptions[newOptions] = new Set();
                    groupedByOptions[newOptions].add(neighbor);
                    if (newOptions < minOptions) minOptions = newOptions;
                }
            }
        }
        // Update minOptions if needed
        if (!groupedByOptions[minOptions] || groupedByOptions[minOptions].size === 0) {
            const nextMin = findNextMinOptions(groupedByOptions, minOptions, height * width);
            if (nextMin === undefined) break;
            minOptions = nextMin;
        }
    }

    // Return a 2D array of tile ids (or null)
    const idArray = chunkArray.map(row => row.map(cell => cell.tile ? cell.tile.id : null));
    return idArray;
}
