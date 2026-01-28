import type { RigidBody, Collider, World } from '@dimforge/rapier3d';
import type { Mesh } from 'three';

/**
 * Applies default physics properties to a BaseObject's rigid body.
 * Currently sets linear and angular damping, but can be extended for other properties.
 * @param obj The BaseObject to configure.
 * @param options Optional configuration for physics properties.
 *   - linearDamping: Linear damping value (default: 0.1)
 *   - angularDamping: Angular damping value (default: 0.1)
 */
export function configureBaseObjectPhysics(
  obj: BaseObject,
  options?: {
    linearDamping?: number;
    angularDamping?: number;
    // Add more properties here as needed
  }
): void {
  const linearDamping = options?.linearDamping ?? 0.001;
  const angularDamping = options?.angularDamping ?? 0.001;
  obj.body.setLinearDamping(linearDamping);
  obj.body.setAngularDamping(angularDamping);
  if (obj.meshGroup && 'children' in obj.meshGroup) {
    for (const m of obj.meshGroup.children) {
      if ('castShadow' in m) {
        m.castShadow = true;
      }
    }
  }
  // Extend with more property setters as needed
}



export interface BaseObjectData {
  type: string;
  position: { x: number; y: number; z: number };
}

import type { Group } from 'three';
export interface BaseObject {
  data: BaseObjectData;
  meshGroup: Group;
  body: RigidBody;
  colliders: Collider[];
  handleCollision?: (other: BaseObject | undefined, world?: World) => void;
  step?: (obj: BaseObject, dt: number, allObjects?: BaseObject[], world?: World) => void;
}
