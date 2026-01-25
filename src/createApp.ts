import './index.css';
import { Engine, EngineConfig } from './Engine';

import { AnyObjectData } from './items/objects';
import { ChunkManager, ChunkCoord } from './items/ChunkManager';



export function createApp() {
  // Example: use ChunkManager to generate objects for a region
  const globalSeed = 'demo-seed';
  const chunkSize = 20;
  const chunkManager = new ChunkManager(globalSeed, chunkSize);

  // Choose a region of chunks to load, centered at (centerChunkX, centerChunkY)
  const regionRadius = 1; // 1 = 3x3 region
  const centerChunkX = 0; // Set this to your desired center chunk X
  const centerChunkY = 0; // Set this to your desired center chunk Y
  const objects: AnyObjectData[] = [];
  for (let cx = centerChunkX - regionRadius; cx <= centerChunkX + regionRadius; cx++) {
    for (let cy = centerChunkY - regionRadius; cy <= centerChunkY + regionRadius; cy++) {
      const chunkCoord: ChunkCoord = { x: cx, y: cy };
      const chunkData = chunkManager.getChunk(chunkCoord);
      // For each cell in chunk, create objects based on value thresholds
      for (let i = 0; i < chunkSize; i++) {
        for (let j = 0; j < chunkSize; j++) {
          const value = chunkData[i][j];
          const pos = { x: cx * chunkSize + i, y: 0, z: cy * chunkSize + j };
          if (value > 0.995) {
            // Ball
            objects.push({
              type: 'ball',
              position: pos,
              color: 0x00aaff,
            });
          } else if (value > 0.990) {
            // Bumper
            objects.push({
              type: 'bumper',
              position: pos,
              color: 0xffaa00,
              bumpStrength: 10, // Default strength, adjust as needed
            });
          } else if (value > 0.985) {
            // Attractor
            objects.push({
              type: 'attractor',
              position: pos,
              color: 0xaa00ff,
              attraction: .1, // Default attraction, adjust as needed
            });
          }
        }
      }
    }
  }

  const config: EngineConfig = {
    world: {
      camera: {
        position: { x: 30, y: 30, z: 30 },
        lookAt: { x: 0, y: 0, z: 0 }
      }
    },
    objects
  };
  const engine = new Engine(config);
  const renderElt = document.getElementById('root')!;
  engine.attach(renderElt);
  // No orbit controls for strict top-down 2D feel
  return engine;
}
