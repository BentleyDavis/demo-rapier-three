import './index.css';
import { Engine, EngineConfig } from './Engine';
import { AnyObjectData } from './items/objects';
import { ChunkConfig } from './types/chunkTypes';
import { generateChunk } from './terrain/chunkGenerator';
import { printChunk } from "./terrain/printChunk";

const chunkConfig: ChunkConfig = {
  worldConfig: {
    seed: 123,
    height: 10,
    width: 10,
    tileTypes: [
      {
        type: "land",
        N: "open",
        S: "open",
        E: "open",
        W: "open"
      },
      {
        type: "corridor",
        N: "open",
        S: "open",
        E: "closed",
        W: "closed"
      },
      {
        type: "oneWall",
        N: "closed",
        S: "open",
        E: "open",
        W: "open"
      },
      {
        type: "corner",
        N: "closed",
        S: "open",
        E: "closed",
        W: "open"
      }
    ]
  },
  x: 0,
  y: 0
};

export function createApp() {
  let objects: AnyObjectData[] = [];
  const idArray = generateChunk(chunkConfig);

  // idArray is 2D: [row][col] = "type_rotation" or null
  for (let y = 0; y < idArray.length; y++) {
    for (let x = 0; x < idArray[y].length; x++) {
      const id = idArray[y][x];
      if (!id) continue;
      // id format: "type_rotation" (e.g., "corridor_90")
      const [type, rotStr] = id.split('_');
      const rotation = rotStr ? parseInt(rotStr, 10) : 0;
      // Default color per type (optional)
      let color: number | undefined = undefined;
      if (type === 'land') color = 0x228B22;
      if (type === 'corridor') color = 0x888888;
      if (type === 'oneWall') color = 0x8B4513;
      if (type === 'corner') color = 0x444444;
      // Place at (x * 2, 0, y * 2) so tiles butt up against each other
      objects.push({
        type,
        position: { x: x * 2, y: 0, z: y * 2 },
        // position: { x: x, y: 0, z: y },
        rotation,
        color
      } as AnyObjectData);
    }
  }

  // objects = objects.filter(obj => obj.type === 'land');
  // console.log(objects[0]);
  //  objects[0] = {
  //     type: 'oneWall',
  //     position: { x: 0, y: 0, z: 0 },
  //     rotation: 0,
  //     color: 0x8B4513
  //  };
  // printChunk(idArray);

  // Add a cue ball after object placement
  const cueBall: AnyObjectData & { velocity?: { x: number; y: number; z: number } } = {
    type: 'ball',
    color: 0xffffff,
    position: { x: 1, y: 0.5, z: 0 },
    velocity: { x: 4, y: 0, z: 0 }
  };
  objects.push(cueBall);

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
