// Represents a cell in the grid with neighbor references and available tile count
export interface CellNode {
    tile: Tile | null;
    x: number;
    y: number;
    N?: CellNode;
    S?: CellNode;
    E?: CellNode;
    W?: CellNode;
    availableTiles: Tile[];
}
// Shared types for chunk generation and terrain

export interface WorldConfig {
    seed: number;
    /**
     * The number of rows (height) in the chunk.
     */
    height: number;
    /**
     * The number of columns (width) in the chunk.
     */
    width: number;
    perimeterSize?: number;
    tileTypes: TileType[]; // Only base tile types, no id/rotation
}

export interface Cell {
    x: number;
    y: number;
    tileId: string;
}

// Base tile type, no id or rotation
export interface TileType {
    type: string; // e.g. "tileA"
    N: EdgeTypes;
    S: EdgeTypes;
    E: EdgeTypes;
    W: EdgeTypes;
}

// Expanded tile with unique id and rotation
export interface Tile {
    id: string; // e.g. "tileA_90"
    type: string; // e.g. "tileA"
    rotation: number; // 0, 90, 180, 270
    N: EdgeTypes;
    S: EdgeTypes;
    E: EdgeTypes;
    W: EdgeTypes;
}

export type EdgeTypes = "open" | "closed";

export interface ChunkConfig {
    worldConfig: WorldConfig;
    x: number;
    y: number;
    collapsedCells?: Cell[];
}