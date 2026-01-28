import type { ChunkConfig } from "../types/chunkTypes";
import { printChunk } from "./printChunk";


describe("Chunk Generator", () => {


  it("should generate consistent blank chunks for the same seed and coordinates", () => {
    const { generateChunk } = require("./chunkGenerator");
    const chunkConfig: ChunkConfig = {
      worldConfig: {
        seed: 123,
        height: 100,
        width: 120,
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
    // console.log("Generated idArray:", idArray);
    // Print chunk visually
    printChunk(idArray);
  });
});
