import type { World } from '@dimforge/rapier3d';
import type { Rapier } from '../../physics/rapier';
import { Mesh, Scene, Group, Vector3 } from 'three';
import { createWall, tileWidth, wallHeight, wallThickness } from './wallUtils.js';
import { ColliderGroup } from './ColliderGroup';
import { createTileFloor } from '../tileFloor';
import { BaseObject, BaseObjectData, configureBaseObjectPhysics } from './BaseObject';

export interface OneWallObjectData extends BaseObjectData {
  type: 'oneWall';
  rotation?: number; // degrees
}

export interface OneWallObject extends BaseObject {
  data: OneWallObjectData;
}



function create(data: OneWallObjectData, scene: Scene, world: World, rapier: Rapier): OneWallObject {
  // Calculate wall position for the north edge based on wallLength and wallThickness
  // Wall should be centered so that half its thickness extends past the tile edge
  const wallOffset = -(tileWidth / 2);
  // Wall geometry: always at the north edge (z = wallOffset), matching N/S closed, E/W open pattern
  const wallMesh = createWall('horizontal');
  wallMesh.position.z = wallOffset;

  // Group all meshes
  const group = new Group();
  group.add(wallMesh);

  // Floor, pass the group and body for consistency
  const rbDesc = rapier.RigidBodyDesc.fixed();
  rbDesc.setTranslation(data.position.x, data.position.y, data.position.z);
  const body = world.createRigidBody(rbDesc);
  const { meshes: floorMeshes, colliders: floorColliders } = createTileFloor(
    { scene: group, world, rapier, options: undefined, body });
  for (const m of floorMeshes) group.add(m);

  // Handle rotation for both mesh group and collider group
  let groupRotation = 0;
  if (data.rotation) {
    group.rotation.y = -(data.rotation * Math.PI) / 180;
    groupRotation = data.rotation;
  }
  scene.add(group);

  // Wall collider (north edge) using ColliderGroup
  const colliderGroup = new ColliderGroup();
  const wallColliderDesc = rapier.ColliderDesc.cuboid(tileWidth / 2, wallHeight / 2, wallThickness / 2);
  wallColliderDesc.setActiveEvents(1);
  colliderGroup.addCollider(
    wallColliderDesc,
    // local position matches mesh
    new Vector3(0, 0, wallOffset)
  );
  // Set group rotation (Y axis)
  colliderGroup.position.set(0, 0, 0);
  colliderGroup.rotation.setFromAxisAngle(new Vector3(0, 1, 0), -(groupRotation * Math.PI) / 180);
  const wallColliders = colliderGroup.createColliders(world, body, rapier);

  const obj: OneWallObject = {
    data,
    meshGroup: group,
    body,
    colliders: [...wallColliders, ...floorColliders]
  };
  configureBaseObjectPhysics(obj);
  return obj;
}

export const OneWallBuilder = { type: 'oneWall', create };