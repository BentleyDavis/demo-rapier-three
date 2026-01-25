import './index.css';
import { Engine, EngineConfig } from './Engine';

import { AnyObjectData } from './items/objects';

type WithoutPosition<T> = T extends any ? Omit<T, 'position'> : never;
type ObjectDefaults = WithoutPosition<AnyObjectData>;



import { ChunkManager, ChunkCoord, PositioningType } from './items/ChunkManager';



export function createApp() {
    let totalCells = 0;
    let placedObjects = 0;
  // Example: use ChunkManager to generate objects for a region
  const globalSeed = 'demo-seed';
  const chunkSize = 20;
  const chunkManager = new ChunkManager(globalSeed, chunkSize);

  // Choose a region of chunks to load, centered at (centerChunkX, centerChunkY)
  const regionRadius = 1; // 1 = 3x3 region
  const centerChunkX = 0; // Set this to your desired center chunk X
  const centerChunkY = 0; // Set this to your desired center chunk Y
  const objects: AnyObjectData[] = [];

  // Define object types and their spawn frequencies (probabilities)
  // Frequency is the probability (e.g., 0.1 = 10%)

  const objectTypes: Array<{
    frequency: number;
    defaults: ObjectDefaults;
    positioningType: PositioningType;
  }> = [
    {
      frequency: 0.005,
      positioningType: 'random',
      defaults: {
        type: 'ball',
        color: 0x00aaff,
      },
    },
    {
      frequency: 0.005,
      positioningType: 'noise',
      defaults: {
        type: 'bumper',
        bumpStrength: 10,
      },
    },
    {
      frequency: 0.00125,
      positioningType: 'noise',
      defaults: {
        type: 'attractor',
        attraction: 0.1,
      },
    },
  ];





  for (let cx = centerChunkX - regionRadius; cx <= centerChunkX + regionRadius; cx++) {
    for (let cy = centerChunkY - regionRadius; cy <= centerChunkY + regionRadius; cy++) {
      const chunkCoord: ChunkCoord = { x: cx, y: cy };
      for (let i = 0; i < chunkSize; i++) {
        for (let j = 0; j < chunkSize; j++) {
          totalCells++;
          const pos = { x: cx * chunkSize + i, y: 0, z: cy * chunkSize + j };
          for (const objDef of objectTypes) {
            // Use ChunkManager's getChunk with per-type positioningType
            const chunk = chunkManager.getChunk(
              chunkCoord,
              {
                type: objDef.positioningType,
                seed: globalSeed + '-' + objDef.defaults.type,
                frequency: objDef.frequency,
              }
            );
            // Check if this cell should have this object type
            if (chunk[i][j]) {
              const obj: AnyObjectData = {
                ...objDef.defaults,
                position: pos,
              };
              objects.push(obj);
              placedObjects++;
              break; // Only place one object per cell
            }
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
