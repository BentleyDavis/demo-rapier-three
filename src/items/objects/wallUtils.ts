import { Mesh, MeshStandardMaterial, BoxGeometry } from 'three';
import { floorThickness } from '../floorConstants';


// Standard wall parameters
export const tileWidth = 2;
export const wallHeight = 1;
export const wallThickness = 0.3;
export const wallColor = "#808080"; // grey, no alpha


// Export a single wall material instance for reuse
export const wallMaterial = new MeshStandardMaterial({ color: wallColor, transparent: true, opacity: 1 });

/**
 * Creates a wall mesh with standard dimensions and color.
 * @param orientation 'horizontal' (length along x) or 'vertical' (length along z)
 * @returns THREE.Mesh
 */
export function createWall(orientation: 'horizontal' | 'vertical' = 'horizontal') {
  let geometry;
  let mesh;
  if (orientation === 'horizontal') {
    // Extend length by wallThickness (half on each end)
    geometry = new BoxGeometry(tileWidth + wallThickness, wallHeight, wallThickness);
    mesh = new Mesh(geometry, wallMaterial);
    // Shift so center aligns with tile, extension is symmetric
    mesh.position.x = 0;
    mesh.position.z = 0;
  } else {
    geometry = new BoxGeometry(wallThickness, wallHeight, tileWidth + wallThickness);
    mesh = new Mesh(geometry, wallMaterial);
    mesh.position.x = 0;
    mesh.position.z = 0;
  }
  // Position the wall so its base sits on top of the floor
  mesh.position.y = wallHeight / 2 + floorThickness;
  return mesh;
}