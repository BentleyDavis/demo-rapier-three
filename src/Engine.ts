import type { RigidBody, World } from '@dimforge/rapier3d';
import {
  Clock,
  AmbientLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  OrthographicCamera,
  Camera,
  Scene,
  SphereGeometry,
  DirectionalLight,
  Vector3,
  WebGLRenderer,
} from 'three';
import { getRapier, Rapier } from './physics/rapier';

const cameraOffset = new Vector3();

/** Contains the three.js renderer and handles to important resources. */

export interface EngineConfig {
  world: {
    linearDamping: number;
    angularDamping: number;
    ccdEnabled: boolean;
    friction: number;
    restitution: number;
    camera?: {
      position: { x: number; y: number; z: number };
      lookAt: { x: number; y: number; z: number };
    };
  };
  objects: {
    position: { x: number; y: number; z: number };
    velocity?: { x: number; y: number; z: number };
    attraction?: number;
    color?: number;
    fixed?: boolean;
  }[];
}

export class Engine {
  public readonly scene = new Scene();
  public readonly camera: Camera;
  public readonly renderer: WebGLRenderer;
  public readonly viewPosition = new Vector3();
  public viewAngle = 0;
  public rapier!: Rapier;

  private mount: HTMLElement | undefined;
  private frameId: number | null = null;
  private clock = new Clock();
  // Sunlight (DirectionalLight) will be added back in
  private physicsWorld?: World;
  private simulationStep: number = 0;
  private config: EngineConfig;

  // Data-driven objects
  private objects: {
    mesh: Mesh;
    body: RigidBody;
    config: EngineConfig["objects"][number];
  }[] = [];

  constructor(
    config: EngineConfig,
    camera?: Camera
  ) {
    this.config = config;
    this.animate = this.animate.bind(this);
    // Camera creation logic
    if (camera) {
      this.camera = camera;
    } else {
      const camConfig = config.world.camera;
      // Always use orthographic camera with default up and d if not provided
      if (camConfig) {
        const aspect = window.innerWidth / window.innerHeight;
        const d = 20;
        const orthoCamera = new OrthographicCamera(
          -d * aspect,
          d * aspect,
          d,
          -d,
          0.1,
          1000
        );
        orthoCamera.position.set(camConfig.position.x, camConfig.position.y, camConfig.position.z);
        orthoCamera.lookAt(camConfig.lookAt.x, camConfig.lookAt.y, camConfig.lookAt.z);
        orthoCamera.up.set(0, 1, 0);
        this.camera = orthoCamera;
      } else {
        // Fallback to perspective camera
        this.camera = new PerspectiveCamera(40, 1, 0.1, 100);
        cameraOffset.setFromSphericalCoords(20, MathUtils.degToRad(75), this.viewAngle);
        this.camera.position.copy(this.viewPosition).add(cameraOffset);
        this.camera.lookAt(this.viewPosition);
        this.camera.updateMatrixWorld();
      }
    }
    this.createAmbientLight();
    this.createSunLight();
    this.renderer = this.createRenderer();
  }

  /** Adds a sun (directional light) to the scene. */
  public createSunLight() {
    const sun = new DirectionalLight(0xffffff, 1.2);
    sun.position.set(30, 30, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 100;
    this.scene.add(sun);
    return sun;
  }

  /** Shut down the renderer and release all resources. */
  public dispose() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    window.removeEventListener('resize', this.onWindowResize);
    if (this.mount && this.renderer.domElement.parentElement === this.mount) {
      this.mount.removeChild(this.renderer.domElement);
    }
    // Optionally: clean up physics world, meshes, etc.
  }

  /** Update the positions of any moving objects. */
  /** Attach the renderer to the DOM. */
  public async attach(mount: HTMLElement) {
    this.mount = mount;
    window.addEventListener('resize', this.onWindowResize.bind(this));
    mount.appendChild(this.renderer.domElement);
    this.onWindowResize();


    // Make sure physics WASM bundle is initialized before starting rendering loop.
    // Physics objects cannot be created until after physics engine is initialized.
    const r = (this.rapier = await getRapier());

    // Create physics world with default zero gravity
    this.physicsWorld = new r.World(new Vector3(0, 0, 0));

    // Create all objects from configs
    for (const objConfig of this.config.objects) {
      const geometry = new SphereGeometry(1, 32, 32); // (radius, widthSegments, heightSegments)
      const material = new MeshStandardMaterial({ color: objConfig.color ?? 0xffff00 });
      const mesh = new Mesh(geometry, material);
      mesh.rotation.x = Math.PI / 2; // Rotate to be parallel to the floor
      mesh.castShadow = true;
      this.scene.add(mesh);

      const isStatic = !!objConfig.fixed;
      let rbDesc;
      if (isStatic) {
        rbDesc = r.RigidBodyDesc.fixed();
      } else {
        rbDesc = r.RigidBodyDesc.dynamic()
          .setLinearDamping(this.config.world.linearDamping)
          .setAngularDamping(this.config.world.angularDamping)
          .setCcdEnabled(this.config.world.ccdEnabled);
      }
      rbDesc.setTranslation(objConfig.position.x, objConfig.position.y, objConfig.position.z);
      const body = this.physicsWorld.createRigidBody(rbDesc);
      if (objConfig.velocity) {
        body.setLinvel(objConfig.velocity, true);
      }
      const clDesc = this.rapier.ColliderDesc.ball(1)
        .setFriction(this.config.world.friction)
        .setFrictionCombineRule(r.CoefficientCombineRule.Max)
        .setRestitution(this.config.world.restitution)
        .setRestitutionCombineRule(r.CoefficientCombineRule.Max);
      this.physicsWorld.createCollider(clDesc, body);

      this.objects.push({ mesh, body, config: objConfig });
    }

    if (!this.frameId) {
      this.clock.start();
      this.frameId = requestAnimationFrame(this.animate);
    }
  }

  /** Detach the renderer from the DOM. */
  public detach() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    window.removeEventListener('resize', this.onWindowResize);
    this.mount?.removeChild(this.renderer.domElement);
  }

  /** Update the positions of any moving objects. */
  public updateScene(deltaTime: number) {
    // Increment simulation step counter
    this.simulationStep++;

    // Run physics
    this.physicsWorld?.step();

    // Attraction logic: for each object with attraction, apply to all others within a max distance, but not if touching (distance <= 2 * radius)
    const epsilon = 1e-3;
    const objectRadius = 1; // SphereGeometry(1, ...)
    const minAttractDist = 2 * objectRadius; // touching if distance <= this
    const maxAttractDist = 10 * objectRadius;
    for (const obj of this.objects) {
      if (!obj.config.attraction) continue;
      for (const target of this.objects) {
        if (obj === target) continue;
        // Only apply to dynamic bodies
        if (target.body.isFixed()) continue;
        const t1 = target.body.translation();
        const t2 = obj.body.translation();
        const dx = t2.x - t1.x;
        const dz = t2.z - t1.z;
        const distSq = dx * dx + dz * dz;
        if (distSq <= (maxAttractDist + epsilon) * (maxAttractDist + epsilon)) {
          const dist = Math.sqrt(distSq);
          // Skip if objects are touching or overlapping
          if (dist > minAttractDist + epsilon) {
            const forceMag = obj.config.attraction;
            const fx = (dx / dist) * forceMag;
            const fz = (dz / dist) * forceMag;
            target.body.applyImpulse({ x: fx, y: 0, z: fz }, true);
          }
        }
      }
    }

    // Update mesh positions and reset y to zero
    for (const obj of this.objects) {
      const t = obj.body.translation();
      obj.mesh.position.set(t.x, 0, t.z);
    }
  }

  /** Return the elapsed running time. */
  public get time(): number {
    return this.clock.elapsedTime;
  }

  private animate() {
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    this.updateScene(deltaTime);
    this.render();
    this.frameId = window.requestAnimationFrame(this.animate);
  }

  /** Render the scene. */
  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  /** Handle window resize event. */
  private onWindowResize() {
    if (this.mount) {
      const width = this.mount.clientWidth;
      const height = this.mount.clientHeight;
      if ('isPerspectiveCamera' in this.camera && this.camera.isPerspectiveCamera) {
        const cam = this.camera as PerspectiveCamera;
        cam.aspect = width / height;
        cam.updateProjectionMatrix();
      } else if ('isOrthographicCamera' in this.camera && this.camera.isOrthographicCamera) {
        const cam = this.camera as OrthographicCamera;
        const aspect = width / height;
        const d = 20;
        cam.left = -d * aspect;
        cam.right = d * aspect;
        cam.top = d;
        cam.bottom = -d;
        cam.updateProjectionMatrix();
      }
      this.renderer.setSize(width, height);
      this.renderer.render(this.scene, this.camera);
    }
  }

  private createRenderer() {
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.autoClear = true;
    renderer.autoClearColor = true;
    renderer.autoClearDepth = true;
    renderer.autoClearStencil = false;
    (renderer as any).colorSpace = 'srgb';
    return renderer;
  }

  public createAmbientLight() {
    const light = new AmbientLight(0xffffff, 0.3);
    this.scene.add(light);
    return light;
  }

}
