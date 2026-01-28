import type { World } from '@dimforge/rapier3d';
import type { Rapier } from '../../physics/rapier';
import { Mesh, MeshStandardMaterial, BoxGeometry, Scene, Group } from 'three';
import { createTileFloor } from '../tileFloor';
import { BaseObject, BaseObjectData, configureBaseObjectPhysics } from './BaseObject';

export interface LandObjectData extends BaseObjectData {
  type: 'land';
  rotation?: number; // degrees
}

export interface LandObject extends BaseObject {
  data: LandObjectData;
}

function create(data: LandObjectData, scene: Scene, world: World, rapier: Rapier): LandObject {
  // Only floor meshes, no main tile mesh
  // Create a fixed rigid body for the tile at the correct position
  const rbDesc = rapier.RigidBodyDesc.fixed();
  rbDesc.setTranslation(data.position.x, data.position.y, data.position.z);
  const body = world.createRigidBody(rbDesc);
  // Use createTileFloor, passing the body so the collider attaches to it
  const group = new Group();
  const { meshes: floorMeshes, colliders: floorColliders } = createTileFloor(
    {  scene: group, world, rapier, options: undefined, body }  );
  for (const m of floorMeshes) group.add(m);
  scene.add(group);
  const obj: LandObject = {
    data,
    mesh: group,
    body,
    collider: floorColliders
  };
  configureBaseObjectPhysics(obj);
  return obj;
}

export const LandBuilder = { type: 'land', create };