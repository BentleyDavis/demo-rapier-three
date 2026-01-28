import { Quaternion, Vector3 } from 'three';
import type { Rapier } from '../../physics/rapier';
import type { World, RigidBody, Collider } from '@dimforge/rapier3d';

/**
 * ColliderGroup mimics a Three.js Group for colliders, allowing you to add colliders with local transforms
 * and then apply a group transform (position, rotation) to all colliders when creating them in Rapier.
 */
export class ColliderGroup {
  private children: Array<{
    desc: any; // ColliderDesc
    localPosition: Vector3;
    localRotation: Quaternion;
  }> = [];
  public position: Vector3 = new Vector3();
  public rotation: Quaternion = new Quaternion();

  addCollider(desc: any, localPosition = new Vector3(), localRotation = new Quaternion()) {
    this.children.push({ desc, localPosition, localRotation });
  }

  /**
   * Create all colliders in the world, attached to the given rigid body, applying the group transform.
   * Returns the created Collider[]
   */
  createColliders(world: World, body: RigidBody, rapier: Rapier): Collider[] {
    const result: Collider[] = [];
    for (const { desc, localPosition, localRotation } of this.children) {
      // Apply group rotation to local position
      const worldPos = localPosition.clone().applyQuaternion(this.rotation).add(this.position);
      // Combine group rotation with local rotation
      const worldRot = this.rotation.clone().multiply(localRotation);
      desc.setTranslation(worldPos.x, worldPos.y, worldPos.z);
      desc.setRotation({
        x: worldRot.x,
        y: worldRot.y,
        z: worldRot.z,
        w: worldRot.w,
      });
      const collider = world.createCollider(desc, body);
      result.push(collider);
    }
    return result;
  }
}
