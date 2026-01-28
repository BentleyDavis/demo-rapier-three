import type { World } from '@dimforge/rapier3d';
import type { Rapier } from '../../physics/rapier';
import { Mesh, Scene, Group, Vector3, MeshStandardMaterial, Shape, ExtrudeGeometry, CatmullRomCurve3 } from 'three';
import { createWall, tileWidth, wallHeight, wallThickness, wallMaterial } from './wallUtils.js';
import { floorThickness } from '../floorConstants';
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
}


function create(data: CornerObjectData, scene: Scene, world: World, rapier: Rapier): CornerObject {
  // Create a fixed rigid body for the tile at the correct position
  const rbDesc = rapier.RigidBodyDesc.fixed();
  rbDesc.setTranslation(data.position.x, data.position.y, data.position.z);
  const body = world.createRigidBody(rbDesc);

  // Represent a corner as a single curved wall
  const group = new Group();
  // Parameters for the curved wall
  // Calculate radius so the outer face of the wall extends half a wall thickness past the tile edge
  const radius = tileWidth / 2;
  const arcAngle = Math.PI / 2; // 90 degrees
  const wallSegments = 32;
  // Create a custom curved wall mesh using TubeGeometry and a quarter-circle curve
  // Create a custom curved wall mesh with no vertical curve using ExtrudeGeometry
  // Define a rectangle shape for the wall cross-section (width = wallThickness, height = wallHeight)
  const wallShape = new Shape();
  wallShape.moveTo(-wallThickness / 2, 0);
  wallShape.lineTo(wallThickness / 2, 0);
  wallShape.lineTo(wallThickness / 2, wallHeight);
  wallShape.lineTo(-wallThickness / 2, wallHeight);
  wallShape.lineTo(-wallThickness / 2, 0);

  // Define the quarter-circle path for extrusion
  // arcPoints already declared above
  const meshArcSegments = 64;
  // Offset the extrusion path inward by half the wall thickness (center the wall on the arc)
  const pathRadius = radius;
  // Extend straight length so the wall mesh extends half a wall thickness past the tile edge
  const straightLength = tileWidth / 2 + wallThickness / 2;
  const arcPoints: Vector3[] = [];
  // Start tangent direction (at t=0, angle=0): tangent is (1,0,0)
  arcPoints.push(new Vector3(-straightLength, 0, -pathRadius));
  arcPoints.push(new Vector3(0, 0, -pathRadius));
  // Arc segment
  for (let i = 0; i <= meshArcSegments; i++) {
    const t = i / meshArcSegments;
    const angle = t * Math.PI / 2;
    arcPoints.push(new Vector3(
      pathRadius * Math.sin(angle),
      0,
      -pathRadius * Math.cos(angle)
    ));
  }
  // End tangent direction (at t=1, angle=π/2): tangent is (0,0,1)
  arcPoints.push(new Vector3(pathRadius, 0, 0));
  arcPoints.push(new Vector3(pathRadius, 0, straightLength));

  // Use CatmullRomCurve3 for the extrusion path
  const arcCurve = new CatmullRomCurve3(arcPoints);

  const extrudeSettings = {
    steps: meshArcSegments,
    extrudePath: arcCurve
  };
  const curvedWallGeometry = new ExtrudeGeometry(wallShape, extrudeSettings);
  const curvedWallMesh = new Mesh(curvedWallGeometry, wallMaterial);
  // Match wallUtils: base sits on top of the floor
  curvedWallMesh.position.y = floorThickness;
  group.add(curvedWallMesh);
  if (data.rotation) group.rotation.y = -(data.rotation * Math.PI) / 180;

  // Floor, pass the body so the collider attaches to it
  const { meshes: floorMeshes, colliders: floorColliders } = createTileFloor(
    { scene: group, world, rapier, options: undefined, body }  );
  for (const m of floorMeshes) group.add(m);
  scene.add(group);

  // Colliders for the wall: two straight segments and the arc
  const colliderGroup = new ColliderGroup();
  // 1. Straight segment along -X (from tile edge to arc start)
  // The straight segment runs from (-straightLength, 0, -radius) to (0, 0, -radius)
  const straightPartLength = straightLength;
  const straightCollider1 = rapier.ColliderDesc.cuboid(straightPartLength / 2, wallHeight / 2, wallThickness / 2);
  straightCollider1.setActiveEvents(1);
  // Center is halfway between -straightLength and 0 on X, Z is -radius
  colliderGroup.addCollider(
    straightCollider1,
    new Vector3(-straightLength / 2, wallHeight / 2, -radius)
  );

  // 2. Arc segment (approximate with small cuboids)
  const colliderArcSegments = 8;
  const segmentAngle = arcAngle / colliderArcSegments;
  for (let i = 0; i < colliderArcSegments; i++) {
    const angle = segmentAngle * (i + 0.5);
    const x = radius * Math.sin(angle);
    const z = -radius * Math.cos(angle);
    const arcLength = radius * segmentAngle;
    const clDesc = rapier.ColliderDesc.cuboid(wallThickness / 2, wallHeight / 2, arcLength / 2);
    clDesc.setActiveEvents(1);
    // Set rotation using quaternion if available
    if (clDesc.setRotation) {
      // Y-axis quaternion for angle
      const halfAngle = angle / 2;
      const qy = Math.sin(halfAngle);
      const qw = Math.cos(halfAngle);
      clDesc.setRotation({ x: 0, y: qy, z: 0, w: qw });
    }
    colliderGroup.addCollider(
      clDesc,
      new Vector3(x, wallHeight / 2, z)
    );
  }

  // 3. Straight segment along +Z (from arc end to tile edge)
  // The straight segment runs from (radius, 0, 0) to (radius, 0, straightLength)
  const straightCollider2 = rapier.ColliderDesc.cuboid(wallThickness / 2, wallHeight / 2, straightPartLength / 2);
  straightCollider2.setActiveEvents(1);
  // Center is halfway between 0 and straightLength on Z, X is radius
  colliderGroup.addCollider(
    straightCollider2,
    new Vector3(radius, wallHeight / 2, straightLength / 2)
  );

  // Apply group rotation if needed
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
    meshGroup: group,
    body,
    colliders: [...wallColliders, ...floorColliders]
  };
  configureBaseObjectPhysics(obj);
  return obj;
}

export const CornerBuilder = { type: 'corner', create };