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
}

function create(data: AttractorObjectData, scene: Scene, world: World, rapier: Rapier): AttractorObject {
  // Cylinder: radiusTop, radiusBottom, height, radialSegments
  const geometry = new CylinderGeometry(1, 1, 2, 32);
  const material = new MeshStandardMaterial({ color: data.color ?? 0xff00ff });
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  scene.add(mesh);
  const rbDesc = rapier.RigidBodyDesc.fixed();
  rbDesc.setTranslation(data.position.x, data.position.y, data.position.z);
  const body = world.createRigidBody(rbDesc);
  // Rapier cylinder: halfHeight, radius
  const clDesc = rapier.ColliderDesc.cylinder(1, 1); // halfHeight=1, radius=1
  world.createCollider(clDesc, body);
  const obj = { data, mesh, body };
  configureBaseObjectPhysics(obj);
  return obj;
}

function step(obj: AttractorObject, dt: number, allObjects?: BaseObject[]) {
  if (!allObjects) return;
  for (const target of allObjects) {
    // if (
    //   target === obj ||
    //   !target ||
    //   typeof target !== 'object' ||
    //   !('data' in target) ||
    //   !target.data ||
    //   target.data.type !== 'ball' ||
    //   !target.body ||
    //   !obj.body
    // ) continue;
    if (target.body.isFixed()) continue;
    const t1 = target.body.translation();
    const t2 = obj.body.translation();
    const dx = t2.x - t1.x;
    const dz = t2.z - t1.z;
    const distSq = dx * dx + dz * dz;
    const minAttractDist = 2;
    const maxAttractDist = 10;
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
