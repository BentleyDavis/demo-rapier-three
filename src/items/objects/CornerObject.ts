import type { World } from '@dimforge/rapier3d';
import type { Rapier } from '../../physics/rapier';
import { Mesh, Scene, Group, Vector3 } from 'three';
import { createWallMesh, WALL_LENGTH, WALL_HEIGHT, WALL_THICKNESS } from './wallUtils.js';
import { ColliderGroup } from './ColliderGroup';
import { BaseObject, BaseObjectData, configureBaseObjectPhysics } from './BaseObject';
import { createTileFloor } from '../tileFloor';
import type { Collider } from '@dimforge/rapier3d';

export interface CornerObjectData extends BaseObjectData {
  type: 'corner';
  rotation?: number; // degrees
}

export interface CornerObject extends BaseObject {
  data: CornerObjectData;
  visual: Group;
}


function create(data: CornerObjectData, scene: Scene, world: World, rapier: Rapier): CornerObject {
  // Create a fixed rigid body for the tile at the correct position
  const rbDesc = rapier.RigidBodyDesc.fixed();
  rbDesc.setTranslation(data.position.x, data.position.y, data.position.z);
  const body = world.createRigidBody(rbDesc);

  // Represent a corner as two joined walls (L-shape)
  const group = new Group();
  const wall1 = createWallMesh('horizontal');
  wall1.position.set(0, 0, -0.85);
  const wall2 = createWallMesh('vertical');
  wall2.position.set(0.85, 0, 0);
  group.add(wall1);
  group.add(wall2);
  if (data.rotation) group.rotation.y = -(data.rotation * Math.PI) / 180;

  // Floor, pass the body so the collider attaches to it
  const { meshes: floorMeshes, colliders: floorColliders } = createTileFloor(
    { scene: group, world, rapier, options: undefined, body }  );
  for (const m of floorMeshes) group.add(m);
  scene.add(group);

  // Two colliders for the L-shape, attached to the same body, using ColliderGroup
  const colliderGroup = new ColliderGroup();
  const clDesc1 = rapier.ColliderDesc.cuboid(WALL_LENGTH / 2, WALL_HEIGHT / 2, WALL_THICKNESS / 2);
  clDesc1.setActiveEvents(1);
  colliderGroup.addCollider(
    clDesc1,
    new Vector3(0, 0, -0.85)
  );
  const clDesc2 = rapier.ColliderDesc.cuboid(WALL_THICKNESS / 2, WALL_HEIGHT / 2, WALL_LENGTH / 2);
  clDesc2.setActiveEvents(1);
  colliderGroup.addCollider(
    clDesc2,
    new Vector3(0.85, 0, 0)
  );
  let groupRotation = 0;
  if (data.rotation) {
    groupRotation = data.rotation;
  }
  colliderGroup.position.set(0, 0, 0);
  colliderGroup.rotation.setFromAxisAngle(new Vector3(0, 1, 0), -(groupRotation * Math.PI) / 180);
  const wallColliders = colliderGroup.createColliders(world, body, rapier);

  // Use both wall meshes and floor mesh
  const obj: CornerObject = {
    data,
    mesh: group,
    visual: group,
    body,
    collider: [...wallColliders, ...floorColliders]
  };
  configureBaseObjectPhysics(obj);
  return obj;
}

export const CornerBuilder = { type: 'corner', create };