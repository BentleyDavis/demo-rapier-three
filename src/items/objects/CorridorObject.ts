import type { World } from '@dimforge/rapier3d';
import type { Rapier } from '../../physics/rapier';
import { Mesh, Scene, Group, Vector3 } from 'three';
import { createWall, tileWidth, wallHeight, wallThickness } from './wallUtils.js';
import { ColliderGroup } from './ColliderGroup';
import { createTileFloor } from '../tileFloor';
import { floorThickness } from '../floorConstants';
import { BaseObject, BaseObjectData, configureBaseObjectPhysics } from './BaseObject';

export interface CorridorObjectData extends BaseObjectData {
  type: 'corridor';
  rotation?: number; // degrees
}

export interface CorridorObject extends BaseObject {
  data: CorridorObjectData;
}


function create(data: CorridorObjectData, scene: Scene, world: World, rapier: Rapier): CorridorObject {
  // Create a fixed rigid body for the tile at the correct position
  const rbDesc = rapier.RigidBodyDesc.fixed();
  rbDesc.setTranslation(data.position.x, data.position.y, data.position.z);
  const body = world.createRigidBody(rbDesc);

  // Represent a corridor as two parallel walls (N/S open, E/W closed)
  const group = new Group();

  // Calculate wall positions based on wallLength and wallThickness
  const wallOffset = -(tileWidth / 2);

  // Wall on the west (x = -wallOffset)
  const wallW = createWall('vertical');
  wallW.position.x = -wallOffset;

  // Wall on the east (x = +wallOffset)
  const wallE = createWall('vertical');
  wallE.position.x = wallOffset;
  group.add(wallW);
  group.add(wallE);
  if (data.rotation) group.rotation.y = -(data.rotation * Math.PI) / 180;

  // Floor, pass the body so the collider attaches to it
  const { meshes: floorMeshes, colliders: floorColliders } = createTileFloor(
    { scene: group, world, rapier, options: undefined, body }  );
  for (const m of floorMeshes) group.add(m);
  scene.add(group);

  // Two colliders for the corridor walls, attached to the same body, using ColliderGroup
  const colliderGroup = new ColliderGroup();
  const clDescW = rapier.ColliderDesc.cuboid(wallThickness / 2, wallHeight / 2, tileWidth / 2);
  clDescW.setActiveEvents(1);
  colliderGroup.addCollider(
    clDescW,
    new Vector3(-wallOffset, wallHeight / 2 + floorThickness, 0)
  );
  const clDescE = rapier.ColliderDesc.cuboid(wallThickness / 2, wallHeight / 2, tileWidth / 2);
  clDescE.setActiveEvents(1);
  colliderGroup.addCollider(
    clDescE,
    new Vector3(wallOffset, wallHeight / 2 + floorThickness, 0)
  );
  let groupRotation = 0;
  if (data.rotation) {
    groupRotation = data.rotation;
  }
  colliderGroup.position.set(0, 0, 0);
  colliderGroup.rotation.setFromAxisAngle(new Vector3(0, 1, 0), -(groupRotation * Math.PI) / 180);
  const wallColliders = colliderGroup.createColliders(world, body, rapier);

  const obj: CorridorObject = {
    data,
    meshGroup: group,
    body,
    colliders: [...wallColliders, ...floorColliders]
  };
  configureBaseObjectPhysics(obj);
  return obj;
}

export const CorridorBuilder = { type: 'corridor', create };