import type { World } from '@dimforge/rapier3d';
import {
  Clock,
  AmbientLight,
  MathUtils,
  PerspectiveCamera,
  OrthographicCamera,
  Camera,
  Scene,
  DirectionalLight,
  Vector3,
  WebGLRenderer,
} from 'three';
import { getRapier, Rapier } from './physics/rapier';
import { createFuncs, stepFuncs, AnyObject, AnyObjectData } from './items/objects';

const cameraOffset = new Vector3();


export interface EngineConfig {
  world: {
    camera?: {
      position: { x: number; y: number; z: number };
      lookAt: { x: number; y: number; z: number };
    };
  };
  objects: AnyObjectData[];
}





/** Contains the three.js renderer and handles to important resources. */

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
  private eventQueue?: any;
  private simulationStep: number = 0;
  private config: EngineConfig;

  // Data-driven objects
  private objects: AnyObject[] = [];

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
    this.eventQueue = new r.EventQueue(true);

    // Create all objects from configs using the new object builder pattern
    // Import objectBuilders and createFuncs from items/objects
    // (Assume import { createFuncs } from './items/objects'; at the top if not present)
    // Each object config should have a 'type' property to select the builder
    for (const objConfig of this.config.objects) {
      // Determine the type of object to create
      const type = objConfig.type;
      const create = type && createFuncs[type] ? createFuncs[type] : null;
      if (create) {
        // Cast objConfig to the expected type for the builder
        const result = create(objConfig as any, this.scene, this.physicsWorld!, this.rapier);
        if (result && result.mesh && result.body) {
          this.objects.push(result);
        }
      } else {
        // No builder found for this type; log an error
        console.error(`No object builder found for type: ${type}`, objConfig);
      }
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

    // Step all objects
    for (const obj of this.objects) {
      const type = obj.data.type;
      const step = type && (stepFuncs[type] as Function | undefined);
      if (step) {
        step(obj, deltaTime, this.objects, this.physicsWorld);
      }
    }

    // Run physics and handle contact events
    if (this.physicsWorld && this.eventQueue) {
      this.physicsWorld.step(this.eventQueue);
      // Delegate collision handling to objects
      this.eventQueue.drainCollisionEvents((handle1: number, handle2: number, started: boolean) => {
        if (!started) return;
        const obj1 = this.objects.find(obj => obj.collider.handle === handle1);
        const obj2 = this.objects.find(obj => obj.collider.handle === handle2);
        if (obj1 && typeof obj1.handleCollision === 'function') {
          obj1.handleCollision(obj2, this.physicsWorld);
        }
        if (obj2 && typeof obj2.handleCollision === 'function') {
          obj2.handleCollision(obj1, this.physicsWorld);
        }
      });
    }
    // Update mesh positions for all objects after physics step
    for (const obj of this.objects) {
      if (!obj.body || !obj.mesh) continue;
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
