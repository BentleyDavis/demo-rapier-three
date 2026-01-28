import { Mesh, MeshStandardMaterial, BoxGeometry, Group } from 'three';
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
  const geometry = new BoxGeometry(size, 0.1, size);
  const material = new MeshStandardMaterial({ color });
  const mesh = new Mesh(geometry, material);
  mesh.position.set(0, -0.25, 0);
  scene.add(mesh);
  let floorBody = body;
  if (!floorBody) {
    const rbDesc = rapier.RigidBodyDesc.fixed();
    rbDesc.setTranslation(0, -0.25, 0);
    floorBody = world.createRigidBody(rbDesc);
  }
  const clDesc = rapier.ColliderDesc.cuboid(size / 2, 0.05, size / 2);
  clDesc.setActiveEvents(1);
  const collider = world.createCollider(clDesc, floorBody);
  return { meshes: [mesh], colliders: [collider] };
}
