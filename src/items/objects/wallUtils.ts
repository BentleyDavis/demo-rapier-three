import { Mesh, MeshStandardMaterial, BoxGeometry } from 'three';

// Standard wall parameters
export const WALL_LENGTH = 2;
export const WALL_HEIGHT = 0.5;
export const WALL_THICKNESS = 0.3;
export const WALL_COLOR = "grey";

/**
 * Creates a wall mesh with standard dimensions and color.
 * @param orientation 'horizontal' (length along x) or 'vertical' (length along z)
 * @returns THREE.Mesh
 */
export function createWallMesh(orientation: 'horizontal' | 'vertical' = 'horizontal') {
  let geometry;
  if (orientation === 'horizontal') {
    geometry = new BoxGeometry(WALL_LENGTH, WALL_HEIGHT, WALL_THICKNESS);
  } else {
    geometry = new BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, WALL_LENGTH);
  }
  const material = new MeshStandardMaterial({ color: WALL_COLOR });
  return new Mesh(geometry, material);
}