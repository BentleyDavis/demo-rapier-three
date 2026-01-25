import type { RigidBody, World } from '@dimforge/rapier3d';
import type { Rapier } from '../../physics/rapier';
import { Mesh, MeshStandardMaterial, CylinderGeometry, Scene } from 'three';
import { BaseObject, BaseObjectData, configureBaseObjectPhysics } from './BaseObject';

export interface BumperObjectData extends BaseObjectData {
  type: 'bumper';
  bumpStrength: number;
}

export interface BumperObject extends BaseObject {
  data: BumperObjectData;
}

function create(data: BumperObjectData, scene: Scene, world: World, rapier: Rapier): BumperObject {
  const geometry = new CylinderGeometry(1, 1, 2, 32);
  const material = new MeshStandardMaterial({ color: data.color ?? 0xffaa00 });
  const mesh = new Mesh(geometry, material);
  scene.add(mesh);
  const rbDesc = rapier.RigidBodyDesc.fixed();
  rbDesc.setTranslation(data.position.x, data.position.y, data.position.z);
  const body = world.createRigidBody(rbDesc);
  const clDesc = rapier.ColliderDesc.cylinder(1, 1);
  clDesc.setActiveEvents(1); // COLLISION_EVENTS = 1
  const collider: import('@dimforge/rapier3d').Collider = world.createCollider(clDesc, body);
  const obj = { data, mesh, body, collider };
  configureBaseObjectPhysics(obj);
  return obj;
}

function step(obj: BumperObject, dt: number, allObjects: BaseObject[], world: World) {
  if (!allObjects || !world) return;
  for (const target of allObjects) {
    if (target.body.isFixed() || !('collider' in target)) continue;
    // Check for contact between bumper and target collider
    if (world.intersectionPair(obj.collider, target.collider)) {
      // Calculate direction from bumper to target
      const t1 = target.body.translation();
      const t2 = obj.body.translation();
      const dx = t1.x - t2.x;
      const dz = t1.z - t2.z;
      const dist = Math.sqrt(dx * dx + dz * dz) || 0.01;
      const forceMag = obj.data.bumpStrength;
      const fx = (dx / dist) * forceMag;
      const fz = (dz / dist) * forceMag;
      target.body.applyImpulse({ x: fx, y: 0, z: fz }, true);
    }
  }
}

export const BumperBuilder = { type: 'bumper', create, step };