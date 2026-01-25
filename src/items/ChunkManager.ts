// ChunkManager.ts
// Deterministic chunk-based procedural generation with lazy loading and caching
// Each chunk is generated from (globalSeed + chunkCoord) using a seeded PRNG

import seedrandom from 'seedrandom';

export type ChunkCoord = { x: number; y: number };
export type ChunkData = any; // Replace with your actual chunk data type

export class ChunkManager {
  private globalSeed: string;
  private chunkSize: number;
  private cache: Map<string, ChunkData>;

  constructor(globalSeed: string, chunkSize: number = 32) {
    this.globalSeed = globalSeed;
    this.chunkSize = chunkSize;
    this.cache = new Map();
  }

  private chunkKey(coord: ChunkCoord): string {
    return `${coord.x},${coord.y}`;
  }

  // Deterministically generate chunk data from globalSeed and chunk coordinates
  private generateChunk(coord: ChunkCoord): ChunkData {
    const seed = `${this.globalSeed}:${coord.x},${coord.y}`;
    const rng = seedrandom(seed);
    // Example: generate 2D array of random values
    const data = [];
    for (let i = 0; i < this.chunkSize; i++) {
      const row = [];
      for (let j = 0; j < this.chunkSize; j++) {
        row.push(rng());
      }
      data.push(row);
    }
    return data;
  }

  // Get chunk, generating and caching if needed
  getChunk(coord: ChunkCoord): ChunkData {
    const key = this.chunkKey(coord);
    if (!this.cache.has(key)) {
      const chunk = this.generateChunk(coord);
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
