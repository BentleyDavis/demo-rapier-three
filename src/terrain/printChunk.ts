import { tileIdToUnicode } from "./tileIdToUnicode";

// Print chunk visually using Unicode


export function printChunk(idArray: (string | null)[][]): void {
  let output = '';
  const height = idArray.length;
  const width = height > 0 ? idArray[0].length : 0;
  for (let y = 0; y < height; y++) {
    let row = '';
    for (let x = 0; x < width; x++) {
      const id = idArray[y][x];
      row += tileIdToUnicode(id);
    }
    output += row + '\r\n';
  }
  console.log(output);

}
