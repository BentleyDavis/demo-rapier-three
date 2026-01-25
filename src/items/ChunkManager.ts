// ChunkManager.ts
// Deterministic chunk-based procedural generation with lazy loading and caching
// Each chunk is generated from (globalSeed + chunkCoord) using a seeded PRNG

import { createNoise2D } from 'simplex-noise';
import alea from 'alea';



export type PositioningType = 'noise' | 'random';
export interface ChunkObjectPlacementOptions {
  type: PositioningType;
  seed?: string;
  frequency?: number; // Used for noise threshold or random probability
}

export type ChunkCoord = { x: number; y: number };
export type ChunkData = any; // Replace with your actual chunk data type

export class ChunkManager {
  private globalSeed: string;
  private chunkSize: number;
  private cache: Map<string, ChunkData>;
  private noise2D: (x: number, y: number) => number;

  constructor(globalSeed: string, chunkSize: number = 32) {
    this.globalSeed = globalSeed;
    this.chunkSize = chunkSize;
    this.cache = new Map();
    // Default noise2D for legacy/simple use
    this.noise2D = createNoise2D(alea(globalSeed));
  }

  private chunkKey(coord: ChunkCoord): string {
    return `${coord.x},${coord.y}`;
  }

  /**
   * Deterministically generate chunk data from globalSeed and chunk coordinates.
   * Supports different positioning strategies for object placement.
   *
   * @param coord Chunk coordinates
   * @param placementOptions Object placement options (type, seed, frequency)
   * @returns ChunkData (2D array of placement booleans or values)
   */
  generateChunk(
    coord: ChunkCoord,
    placementOptions: ChunkObjectPlacementOptions = { type: 'noise', frequency: 0.1 }
  ): ChunkData {
    const data = [];
    const baseX = coord.x * this.chunkSize;
    const baseY = coord.y * this.chunkSize;
    const { type, seed, frequency = 0.1 } = placementOptions;

    // Prepare PRNGs
    let noise2D: ((x: number, y: number) => number) | undefined;
    let rand: (() => number) | undefined;
    if (type === 'noise') {
      // Use a unique seed for noise if provided, else globalSeed
      noise2D = createNoise2D(alea((seed ?? this.globalSeed) + '-noise'));
    } else if (type === 'random') {
      // Use a unique seed for random if provided, else globalSeed
      rand = alea((seed ?? this.globalSeed) + '-random');
    }

    const totalCells = this.chunkSize * this.chunkSize;
    const numObjects = Math.round(frequency * totalCells);
    if (type === 'noise' && noise2D) {
      // Compute noise for all cells
      const cells: {i: number, j: number, value: number}[] = [];
      for (let i = 0; i < this.chunkSize; i++) {
        for (let j = 0; j < this.chunkSize; j++) {
          const value = (noise2D(baseX + i, baseY + j) + 1) / 2;
          cells.push({i, j, value});
        }
      }
      // Sort by noise value
      cells.sort((a, b) => a.value - b.value);
      // Select lowest N cells
      const selected = new Set(cells.slice(0, numObjects).map(cell => cell.i + ',' + cell.j));
      for (let i = 0; i < this.chunkSize; i++) {
        const row = [];
        for (let j = 0; j < this.chunkSize; j++) {
          row.push(selected.has(i + ',' + j));
        }
        data.push(row);
      }
    } else if (type === 'random' && rand) {
      // Compute random value for all cells
      const cells: {i: number, j: number, value: number}[] = [];
      for (let i = 0; i < this.chunkSize; i++) {
        for (let j = 0; j < this.chunkSize; j++) {
          const value = rand();
          cells.push({i, j, value});
        }
      }
      // Sort by random value
      cells.sort((a, b) => a.value - b.value);
      // Select lowest N cells
      const selected = new Set(cells.slice(0, numObjects).map(cell => cell.i + ',' + cell.j));
      for (let i = 0; i < this.chunkSize; i++) {
        const row = [];
        for (let j = 0; j < this.chunkSize; j++) {
          row.push(selected.has(i + ',' + j));
        }
        data.push(row);
      }
    } else {
      for (let i = 0; i < this.chunkSize; i++) {
        const row = [];
        for (let j = 0; j < this.chunkSize; j++) {
          row.push(false);
        }
        data.push(row);
      }
    }
    return data;
  }

  /**
   * Get chunk, generating and caching if needed.
   * Accepts optional placementOptions for object positioning.
   */
  getChunk(coord: ChunkCoord, placementOptions?: ChunkObjectPlacementOptions): ChunkData {
    // Include placementOptions in cache key for different strategies
    const key = placementOptions
      ? this.chunkKey(coord) + ':' + JSON.stringify(placementOptions)
      : this.chunkKey(coord);
    if (!this.cache.has(key)) {
      const chunk = this.generateChunk(coord, placementOptions);
      this.cache.set(key, chunk);
    }
    return this.cache.get(key)!;
  }

  // Optionally, expose a method to clear cache or unload chunks
  unloadChunk(coord: ChunkCoord) {
    this.cache.delete(this.chunkKey(coord));
  }

  // Utility: get chunk coordinate from world position
  worldToChunk(x: number, y: number): ChunkCoord {
    return {
      x: Math.floor(x / this.chunkSize),
      y: Math.floor(y / this.chunkSize),
    };
  }
}
