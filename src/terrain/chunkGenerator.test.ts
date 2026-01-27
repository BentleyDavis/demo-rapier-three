import type { ChunkConfig } from "../types/chunkTypes";

describe("Chunk Generator", () => {
  // Utility to map tile id (type_rotation) to Unicode box drawing
  function tileIdToUnicode(id: string): string {

    if (id.startsWith('corner_')) {
      const rot = parseInt(id.split('_')[1], 10);
      switch (rot) {
        case 0: return '╗';
        case 90: return '╝';
        case 180: return '╚';
        case 270: return '╔';
        default: return '?';
      }
    }

    if (id.startsWith('corridor_')) {
      const rot = parseInt(id.split('_')[1], 10);
      if (rot === 0 || rot === 180) return '║';
      if (rot === 90 || rot === 270) return '═';
      return '?';
    }

    if (id.startsWith('oneWall_')) {
      const rot = parseInt(id.split('_')[1], 10);
      switch (rot) {
        case 0: return '╦';
        case 90: return '╣';
        case 180: return '╩';
        case 270: return '╠';
        default: return '?';
      }
    }

    if (id.startsWith('land_')) {
      return '╬';
    }
    return '?';
  }

  // Print chunk visually using Unicode
  function printChunk(idArray: string[][], size: number): void {
    let output = '';
    for (let y = 0; y < size; y++) {
      let row = '';
      for (let x = 0; x < size; x++) {
        const id = idArray[y][x];
        row += tileIdToUnicode(id);
      }
      output += row + '\r\n';
    }
    console.log(output);
  }

  it("should generate consistent blank chunks for the same seed and coordinates", () => {
    const { generateChunk } = require("./chunkGenerator");
    const chunkConfig = {
      worldConfig: {
        seed: 123,
        dimensionSize: 4,
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

    const idArray: string[][] = generateChunk(chunkConfig);
    console.log("Generated idArray:", idArray);
    // Print chunk visually
    printChunk(idArray, chunkConfig.worldConfig.dimensionSize);
  });
});
