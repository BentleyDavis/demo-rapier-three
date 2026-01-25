import type { RigidBody, World } from '@dimforge/rapier3d';
import type { Rapier } from '../../physics/rapier';
import { Mesh, MeshStandardMaterial, CylinderGeometry, Scene } from 'three';
import { BaseObject, BaseObjectData, configureBaseObjectPhysics } from './BaseObject';

export interface AttractorObjectData extends BaseObjectData {
  type: 'attractor';
  attraction: number;
}

export interface AttractorObject extends BaseObject {
  data: AttractorObjectData;
  handleCollision?: (other: BaseObject | undefined, world?: World) => void;
}

function create(data: AttractorObjectData, scene: Scene, world: World, rapier: Rapier): AttractorObject {
  const geometry = new CylinderGeometry(1, 1, 2, 32);
  const material = new MeshStandardMaterial({ color: 0xff00ff });
  const mesh = new Mesh(geometry, material);
  scene.add(mesh);
  const rbDesc = rapier.RigidBodyDesc.fixed();
  rbDesc.setTranslation(data.position.x, data.position.y, data.position.z);
  const body = world.createRigidBody(rbDesc);
  const clDesc = rapier.ColliderDesc.cylinder(1, 1);
  clDesc.setActiveEvents(1); // COLLISION_EVENTS = 1
  const collider = world.createCollider(clDesc, body);
  const obj: AttractorObject = {
    data,
    mesh,
    body,
    collider,
    handleCollision: (other, world) => {
      // Attractor-specific collision logic (if any)
    }
  };
  configureBaseObjectPhysics(obj);
  return obj;
}

function step(obj: AttractorObject, dt: number, allObjects?: BaseObject[], world?: World) {
  if (!allObjects) return;
  for (const target of allObjects) {
    if (target.body.isFixed()) continue;
    const t1 = target.body.translation();
    const t2 = obj.body.translation();
    const dx = t2.x - t1.x;
    const dz = t2.z - t1.z;
    const distSq = dx * dx + dz * dz;
    const minAttractDist = 2;
    const maxAttractDist = 20;
    if (distSq <= maxAttractDist * maxAttractDist) {
      const dist = Math.sqrt(distSq);
      if (dist > minAttractDist) {
        const forceMag = obj.data.attraction;
        const fx = (dx / dist) * forceMag;
        const fz = (dz / dist) * forceMag;
        target.body.applyImpulse({ x: fx, y: 0, z: fz }, true);
      }
    }
  }

}


export const AttractorBuilder = { type: 'attractor', create, step };
