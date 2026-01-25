// ChunkManager.ts
// Deterministic chunk-based procedural generation with lazy loading and caching
// Each chunk is generated from (globalSeed + chunkCoord) using a seeded PRNG

import { createNoise2D } from 'simplex-noise';
import alea from 'alea';

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
    // Use the global seed to seed the simplex noise generator (official API)
    this.noise2D = createNoise2D(alea(globalSeed));
  }

  private chunkKey(coord: ChunkCoord): string {
    return `${coord.x},${coord.y}`;
  }

  // Deterministically generate chunk data from globalSeed and chunk coordinates using Simplex noise
  private generateChunk(coord: ChunkCoord): ChunkData {
    const data = [];
    const baseX = coord.x * this.chunkSize;
    const baseY = coord.y * this.chunkSize;
    for (let i = 0; i < this.chunkSize; i++) {
      const row = [];
      for (let j = 0; j < this.chunkSize; j++) {
        // Use simplex noise, normalized to [0,1]
        const noise = this.noise2D(baseX + i, baseY + j);
        row.push((noise + 1) / 2);
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
