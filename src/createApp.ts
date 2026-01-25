import './index.css';
import { Engine, EngineConfig } from './Engine';

import { AnyObjectData } from './items/objects';
import { ChunkManager, ChunkCoord } from './items/ChunkManager';



export function createApp() {
    let totalCells = 0;
    let placedObjects = 0;
  // Example: use ChunkManager to generate objects for a region
  const globalSeed = 'demo-seed';
  const chunkSize = 10;
  const chunkManager = new ChunkManager(globalSeed, chunkSize);

  // Choose a region of chunks to load, centered at (centerChunkX, centerChunkY)
  const regionRadius = 2; // 1 = 3x3 region
  const centerChunkX = 0; // Set this to your desired center chunk X
  const centerChunkY = 0; // Set this to your desired center chunk Y
  const objects: AnyObjectData[] = [];
  // Define object types and their spawn frequencies (probabilities)
  // Frequency is the probability (e.g., 0.1 = 10%)
  const objectTypes = [
    {
      type: 'ball',
      color: 0x00aaff,
      frequency: 0.02, 
    },
    {
      type: 'bumper',
      color: 0xffaa00,
      frequency: 0.02, 
      bumpStrength: 10,
    },
    {
      type: 'attractor',
      color: 0xaa00ff,
      frequency: 0.02, 
      attraction: 0.1,
    },
  ];

  // Calculate explicit start and end for each object type (for clarity)
  let cumulative = 0;
  const objectRanges = objectTypes.map(obj => {
    const start = cumulative;
    const end = cumulative + obj.frequency;
    cumulative = end;
    return { ...obj, start, end };
  });
  // Log the ranges for clarity
  console.log('Object spawn ranges:', objectRanges.map(o => ({ type: o.type, start: o.start, end: o.end })));

  for (let cx = centerChunkX - regionRadius; cx <= centerChunkX + regionRadius; cx++) {
    for (let cy = centerChunkY - regionRadius; cy <= centerChunkY + regionRadius; cy++) {
      const chunkCoord: ChunkCoord = { x: cx, y: cy };
      const chunkData = chunkManager.getChunk(chunkCoord);
      for (let i = 0; i < chunkSize; i++) {
        for (let j = 0; j < chunkSize; j++) {
          totalCells++;
          const value = chunkData[i][j]; // value in [0,1)
          const pos = { x: cx * chunkSize + i, y: 0, z: cy * chunkSize + j };
          for (const objDef of objectRanges) {
            if (value >= objDef.start && value < objDef.end) {
              const obj: any = {
                type: objDef.type,
                position: pos,
                color: objDef.color,
              };
              if (objDef.type === 'bumper' && objDef.bumpStrength !== undefined) {
                obj.bumpStrength = objDef.bumpStrength;
              }
              if (objDef.type === 'attractor' && objDef.attraction !== undefined) {
                obj.attraction = objDef.attraction;
              }
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
