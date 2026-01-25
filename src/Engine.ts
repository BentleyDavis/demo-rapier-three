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
// No OrbitControls for orthogonal 2.5D movement
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
// ...existing code...
}





/** Contains the three.js renderer and handles to important resources. */

export class Engine {
    // Set up mouse wheel zoom for orthogonal camera
    private setupZoomControls() {
      const canvas = this.renderer.domElement;
      canvas.addEventListener('wheel', (e) => {
        if ('isOrthographicCamera' in this.camera && this.camera.isOrthographicCamera) {
          e.preventDefault();
          // Zoom in/out
          const zoomDelta = e.deltaY > 0 ? 1.1 : 0.9;
          this.zoom *= zoomDelta;
          this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));
          this.updateCameraZoom();
        }
      }, { passive: false });
    }

    // Update orthographic camera zoom
    private updateCameraZoom() {
      if ('isOrthographicCamera' in this.camera && this.camera.isOrthographicCamera) {
        const cam = this.camera as OrthographicCamera;
        const aspect = this.renderer.domElement.clientWidth / this.renderer.domElement.clientHeight;
        const d = 20 * (1 / this.zoom);
        cam.left = -d * aspect;
        cam.right = d * aspect;
        cam.top = d;
        cam.bottom = -d;
        cam.updateProjectionMatrix();
      }
    }
  public readonly scene = new Scene();
  public readonly camera: Camera;
  public readonly renderer: WebGLRenderer;
  public readonly viewPosition = new Vector3();
  public viewAngle = 0;
  public rapier!: Rapier;
  // Camera pan state for orthogonal movement
  private panTarget = new Vector3(0, 0, 0);
  private isPanning = false;
  private lastPan = { x: 0, y: 0 };
  // Zoom state
  private zoom = 1.0;
  private readonly minZoom = 0.3;
  private readonly maxZoom = 3.0;

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
    // Set up event listeners for orthogonal camera panning and zoom
    this.setupPanControls();
    this.setupZoomControls();
    // ...existing code...
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
    // No controls to re-attach for orthogonal camera


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
    this.updateCameraPan();
    this.render();
    this.frameId = window.requestAnimationFrame(this.animate);
  }

  // Set up mouse and keyboard panning for orthogonal camera
  private setupPanControls() {
    const canvas = this.renderer.domElement;
    // Mouse drag panning (map to isometric XZ plane)
    const isoAzimuth = Math.PI / 4;
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isPanning = true;
        this.lastPan.x = e.clientX;
        this.lastPan.y = e.clientY;
      }
    });
    window.addEventListener('mousemove', (e) => {
      if (this.isPanning && 'isOrthographicCamera' in this.camera && this.camera.isOrthographicCamera) {
        const dx = e.clientX - this.lastPan.x;
        const dy = e.clientY - this.lastPan.y;
        // Calculate world units per pixel (adjusted for zoom)
        const cam = this.camera as OrthographicCamera;
        const width = this.renderer.domElement.clientWidth;
        const height = this.renderer.domElement.clientHeight;
        const worldPerPixelX = (cam.right - cam.left) / width;
        const worldPerPixelY = Math.abs((cam.top - cam.bottom) / height);
        // Map screen movement to world XZ axes for isometric view
        // Normalize so up/down and left/right have equal speed
        const worldDx = dx * worldPerPixelX;
        const worldDy = dy * worldPerPixelY;
        // Isometric axes unit vectors
        const isoX = { x: -Math.cos(isoAzimuth), z: Math.sin(isoAzimuth) };
        const isoY = { x: -Math.cos(isoAzimuth), z: -Math.sin(isoAzimuth) };
        // Normalize axis length
        const axisLen = Math.sqrt(isoX.x * isoX.x + isoX.z * isoX.z);
        // Apply normalized mapping, with user-tunable vertical panning multiplier for best feel
        const verticalPanMultiplier = 1.25; // Increase if up/down is too slow
        const verticalBoost = Math.SQRT2 * verticalPanMultiplier;
        this.panTarget.x += (worldDx * isoX.x + (worldDy * verticalBoost) * isoY.x) / axisLen;
        this.panTarget.z += (worldDx * isoX.z + (worldDy * verticalBoost) * isoY.z) / axisLen;
        this.lastPan.x = e.clientX;
        this.lastPan.y = e.clientY;
      }
    });
    window.addEventListener('mouseup', () => {
      this.isPanning = false;
    });
    // Keyboard panning (WASD/arrow keys) using isometric mapping
    window.addEventListener('keydown', (e) => {
      // Use the same scaling as mouse drag for consistency
      const cam = this.camera as OrthographicCamera;
      const width = this.renderer.domElement.clientWidth;
      const height = this.renderer.domElement.clientHeight;
      const worldPerPixelX = (cam.right - cam.left) / width;
      const worldPerPixelY = Math.abs((cam.top - cam.bottom) / height);
      const keyStep = 20; // Number of pixels to simulate per key press
      let dx = 0, dy = 0;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          dy = -keyStep;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          dy = keyStep;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          dx = -keyStep;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          dx = keyStep;
          break;
        default:
          return;
      }
      // Use the same isometric mapping as mouse (adjusted for zoom)
      const worldDx = dx * worldPerPixelX;
      const worldDy = dy * worldPerPixelY;
      const isoX = { x: -Math.cos(isoAzimuth), z: Math.sin(isoAzimuth) };
      const isoY = { x: -Math.cos(isoAzimuth), z: -Math.sin(isoAzimuth) };
      const axisLen = Math.sqrt(isoX.x * isoX.x + isoX.z * isoX.z);
      const verticalPanMultiplier = 2.0;
      const verticalBoost = Math.SQRT2 * verticalPanMultiplier;
      this.panTarget.x -= (worldDx * isoX.x + (worldDy * verticalBoost) * isoY.x) / axisLen;
      this.panTarget.z -= (worldDx * isoX.z + (worldDy * verticalBoost) * isoY.z) / axisLen;
    });
  }

  // Update camera position to follow panTarget, always looking down at same angle
  private updateCameraPan() {
    if ('isOrthographicCamera' in this.camera && this.camera.isOrthographicCamera) {
      // True isometric: fixed azimuth and elevation
      const cam = this.camera;
      const isoAzimuth = Math.PI / 4; // 45 degrees
      const isoElevation = Math.atan(1 / Math.sqrt(2)); // ~35.26 degrees
      const dist = 40 * (1 / this.zoom);
      // Calculate camera position in isometric direction
      const camX = this.panTarget.x + dist * Math.cos(isoElevation) * Math.cos(isoAzimuth);
      const camY = this.panTarget.y + dist * Math.sin(isoElevation);
      const camZ = this.panTarget.z + dist * Math.cos(isoElevation) * Math.sin(isoAzimuth);
      cam.position.set(camX, camY, camZ);
      cam.lookAt(this.panTarget.x, this.panTarget.y, this.panTarget.z);
      cam.updateMatrixWorld();
    }
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
        const d = 20 * (1 / this.zoom);
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
