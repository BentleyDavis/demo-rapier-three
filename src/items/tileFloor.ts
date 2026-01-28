import { Mesh, MeshStandardMaterial, BoxGeometry, Group } from 'three';
import { floorThickness } from './floorConstants';
import type { Rapier } from '../physics/rapier';
import type { World, Collider } from '@dimforge/rapier3d';
import type { Scene } from 'three';

/**
 * Creates a floor mesh and collider for a tile at the given position.
 * Returns { meshes, colliders } arrays for uniform use in tile objects.
 */
export function createTileFloor(
  { scene, world, rapier, options, body }: {
    scene: Group | Scene;
    world: World;
    rapier: Rapier;
    options?: { color?: number; size?: number; };
    body?: import('@dimforge/rapier3d').RigidBody;
  }): { meshes: Mesh[]; colliders: Collider[] } {
  const size = options?.size ?? 2;
  const color = options?.color ?? 0xdddddd;
  const geometry = new BoxGeometry(size, floorThickness, size);
  const material = new MeshStandardMaterial({ color, opacity: 0.5, transparent: true });
  const mesh = new Mesh(geometry, material);
  // Calculate y so the bottom of the floor is at y=0
  const y = floorThickness / 2;
  mesh.position.set(0, y, 0);
  // scene.add(mesh);
  let floorBody = body;
  if (!floorBody) {
    const rbDesc = rapier.RigidBodyDesc.fixed();
    rbDesc.setTranslation(0, y, 0);
    floorBody = world.createRigidBody(rbDesc);
  }
  const clDesc = rapier.ColliderDesc.cuboid(size / 2, floorThickness / 2, size / 2);
  clDesc.setActiveEvents(1);
  const collider = world.createCollider(clDesc, floorBody);
  return { meshes: [mesh], colliders: [collider] };
}
