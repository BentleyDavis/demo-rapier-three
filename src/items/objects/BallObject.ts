import type { World } from '@dimforge/rapier3d';
import type { Rapier } from '../../physics/rapier';
import { Mesh, MeshStandardMaterial, SphereGeometry, Scene } from 'three';
import { BaseObject, BaseObjectData, configureBaseObjectPhysics } from './BaseObject';

export interface BallObjectData extends BaseObjectData {
  type: 'ball';
  fixed?: boolean;
  color?: number;
  velocity?: { x: number; y: number; z: number };
}

export interface BallObject extends BaseObject {
  data: BallObjectData;
}

function create(data: BallObjectData, scene: Scene, world: World, rapier: Rapier): BallObject {
  const geometry = new SphereGeometry(1, 32, 32);
  const material = new MeshStandardMaterial({ color: data.color ?? 0xffff00 });
  const mesh = new Mesh(geometry, material);
  scene.add(mesh);
  let rbDesc = data.fixed ? rapier.RigidBodyDesc.fixed() : rapier.RigidBodyDesc.dynamic();
  rbDesc.setTranslation(data.position.x, data.position.y, data.position.z);
  const body = world.createRigidBody(rbDesc);
  const clDesc = rapier.ColliderDesc.ball(1);
  clDesc.setActiveEvents(1); // COLLISION_EVENTS = 1
  const collider = world.createCollider(clDesc, body);
  const obj: BallObject = {
    data,
    mesh,
    body,
    collider
  };
  configureBaseObjectPhysics(obj);
  // Set initial velocity if provided
  if (data.velocity && typeof body.setLinvel === 'function') {
    body.setLinvel(data.velocity, true);
  }
  return obj;
}


export const BallBuilder = { type: 'ball', create };
