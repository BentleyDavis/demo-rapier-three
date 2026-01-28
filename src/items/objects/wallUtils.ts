import { Mesh, MeshStandardMaterial, BoxGeometry } from 'three';
import { floorThickness } from '../floorConstants';


// Standard wall parameters
export const tileWidth = 2;
export const wallHeight = 1;
export const wallThickness = 0.3;
export const wallColor = "grey";

/**
 * Creates a wall mesh with standard dimensions and color.
 * @param orientation 'horizontal' (length along x) or 'vertical' (length along z)
 * @returns THREE.Mesh
 */
export function createWallMesh(orientation: 'horizontal' | 'vertical' = 'horizontal') {
  let geometry;
  if (orientation === 'horizontal') {
    geometry = new BoxGeometry(tileWidth, wallHeight, wallThickness);
  } else {
    geometry = new BoxGeometry(wallThickness, wallHeight, tileWidth);
  }
  const material = new MeshStandardMaterial({ color: wallColor });
  const mesh = new Mesh(geometry, material);
  // Position the wall so its base sits on top of the floor
  mesh.position.y = wallHeight / 2 + floorThickness;
  return mesh;
}