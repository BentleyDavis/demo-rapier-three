import type { RigidBody, World } from '@dimforge/rapier3d';
import {
  Clock,
  Color,
  DirectionalLight,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  OrthographicCamera,
  Camera,
  Scene,
  SphereGeometry,
  // sRGBEncoding removed in three.js r182+
  Vector3,
  WebGLRenderer,
} from 'three';
import { EventSource, ResourcePool } from './lib';
import { getRapier, Rapier } from './physics/rapier';
// import { TerrainShape } from './terrain/TerrainShape';

const cameraOffset = new Vector3();

/** Contains the three.js renderer and handles to important resources. */

export interface EngineConfig {
  world: {
    linearDamping: number;
    angularDamping: number;
    ccdEnabled: boolean;
    friction: number;
    restitution: number;
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
  public readonly pool = new ResourcePool();
  public readonly viewPosition = new Vector3();
  public viewAngle = 0;
  public readonly update = new EventSource<{ update: number }>();
  public rapier!: Rapier;

  private mount: HTMLElement | undefined;
  private frameId: number | null = null;
  private clock = new Clock();
  private sunlight: DirectionalLight;
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
    this.camera = camera ?? new PerspectiveCamera(40, 1, 0.1, 100);
    this.sunlight = this.createSunlight();
    this.createAmbientLight();
    this.renderer = this.createRenderer();

    if (!camera) {
      cameraOffset.setFromSphericalCoords(20, MathUtils.degToRad(75), this.viewAngle);
      this.camera.position.copy(this.viewPosition).add(cameraOffset);
      this.camera.lookAt(this.viewPosition);
      this.camera.updateMatrixWorld();
    }
  }

  /** Shut down the renderer and release all resources. */
  public dispose() {
    this.pool.dispose();
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
      const geometry = new SphereGeometry(1, 32, 16);
      const material = new MeshStandardMaterial({ color: objConfig.color ?? 0xffff00 });
      const mesh = new Mesh(geometry, material);
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
    // Run callbacks.
    this.update.emit('update', deltaTime);

    // Increment simulation step counter
    this.simulationStep++;

    // Run physics
    this.physicsWorld?.step();

    // Attraction logic: for each object with attraction, apply to all others within a max distance (2x radius)
    const epsilon = 1e-3;
    const objectRadius = 1; // SphereGeometry(1, ...)
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
          if (dist > epsilon) {
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
    this.adjustLightPosition();
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

  private createSunlight() {
    const sunlight = new DirectionalLight(new Color('#ffffff').convertSRGBToLinear(), 1); // Increased intensity
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.width = 1024;
    sunlight.shadow.mapSize.height = 1024;
    sunlight.shadow.camera.near = 1;
    sunlight.shadow.camera.far = 32;
    sunlight.shadow.camera.left = -15;
    sunlight.shadow.camera.right = 15;
    sunlight.shadow.camera.top = 15;
    sunlight.shadow.camera.bottom = -15;
    this.scene.add(sunlight);
    this.scene.add(sunlight.target);
    return sunlight;
  }

  public createAmbientLight() {
    const light = new HemisphereLight(
      new Color(0xb1e1ff).multiplyScalar(0.4).convertSRGBToLinear(), // Increased sky color intensity
      new Color(0xb97a20).multiplyScalar(0.4).convertSRGBToLinear(), // Increased ground color intensity
      8 // Increased overall intensity
    );
    this.scene.add(light);
    return light;
  }

  private adjustLightPosition() {
    // Adjust shadow map bounds
    const lightPos = this.sunlight.target.position;
    lightPos.copy(this.viewPosition);

    // Quantizing the light's location reduces the amount of shadow jitter.
    lightPos.x = Math.round(lightPos.x);
    lightPos.z = Math.round(lightPos.z);
    this.sunlight.position.set(lightPos.x + 6, lightPos.y + 8, lightPos.z + 4);
  }
}
