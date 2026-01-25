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
  // private terrain: TerrainShape[] = [];
  private physicsWorld?: World;
  private sphere!: Mesh;
  private sphereBody?: RigidBody;
  private attractor!: Mesh;
  private attractorBody?: RigidBody;
  private simulationStep: number = 0;

  constructor(camera?: Camera) {
    this.animate = this.animate.bind(this);
    this.camera = camera ?? new PerspectiveCamera(40, 1, 0.1, 100);
    this.sunlight = this.createSunlight();
    this.createAmbientLight();
    this.renderer = this.createRenderer();

    // Main ball
    const geometry = new SphereGeometry(1, 32, 16);
    const material = new MeshStandardMaterial({ color: 0xffff00 });
    this.sphere = new Mesh(geometry, material);
    this.sphere.castShadow = true;
    this.scene.add(this.sphere);

    // Attractor ball (gravity source)
    const attractorGeometry = new SphereGeometry(1, 32, 16);
    const attractorMaterial = new MeshStandardMaterial({ color: 0x00aaff });
    this.attractor = new Mesh(attractorGeometry, attractorMaterial);
    this.attractor.castShadow = true;
    this.scene.add(this.attractor);

    // No terrain patches for 2D plane game.

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

    // Create physics world with NO default gravity (all movement is custom)
    const gravity = new Vector3(0.0, 0.0, 0.0);
    this.physicsWorld = new r.World(gravity);
    // No terrain physics


    // Create rigid body for the main ball
    const rbDesc = r.RigidBodyDesc.dynamic()
      .setTranslation(0, 0, 0) // Centered in the plane
      .setLinearDamping(2.0) // High damping for fluid/air effect
      .setAngularDamping(2.0)
      .setCcdEnabled(true)
      .setAdditionalMass(1.0); // Explicitly set mass to 1.0
    this.sphereBody = this.physicsWorld.createRigidBody(rbDesc);
    // Give initial velocity in X direction (constrained to XZ plane)
    this.sphereBody.setLinvel({ x: 30, y: 0, z: 0 }, true);
    //this.sphereBody.applyImpulse({ x: 50000000, y: 0, z: 0 }, true); // Initial push

    const clDesc = this.rapier.ColliderDesc.ball(1)
      .setFriction(0.1)
      .setFrictionCombineRule(r.CoefficientCombineRule.Max)
      .setRestitution(0.1) // Small bounce
      .setRestitutionCombineRule(r.CoefficientCombineRule.Max);
    this.physicsWorld.createCollider(clDesc, this.sphereBody);

    // Create rigid body for the attractor (static so it does not move)
    const attractorDesc = r.RigidBodyDesc.fixed()
      .setTranslation(8, 0, 8);
    this.attractorBody = this.physicsWorld.createRigidBody(attractorDesc);
    const attractorClDesc = this.rapier.ColliderDesc.ball(1)
      .setFriction(0.1)
      .setFrictionCombineRule(r.CoefficientCombineRule.Max)
      .setRestitution(0.1) // Small bounce
      .setRestitutionCombineRule(r.CoefficientCombineRule.Max);
    this.physicsWorld.createCollider(attractorClDesc, this.attractorBody);

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
    // Constrain both balls to XZ plane (y=0)
    if (this.sphereBody && this.attractorBody) {
      // Apply gravity from attractor to sphere only if not overlapping
      const t1 = this.sphereBody.translation();
      const t2 = this.attractorBody.translation();
      // Calculate direction vector in XZ plane
      const dx = t2.x - t1.x;
      const dz = t2.z - t1.z;
      const distSq = dx * dx + dz * dz;
      const minDist = 2; // sum of radii (1 + 1)
      const epsilon = 1e-3;
      if (distSq > (minDist + epsilon) * (minDist + epsilon)) {
        // Apply a constant attraction force towards the attractor (halved)
        const forceMag = 1; // Halved force magnitude
        const dist = Math.sqrt(distSq);
        const fx = (dx / dist) * forceMag;
        const fz = (dz / dist) * forceMag;
        if (this.simulationStep < 1000) {
          this.sphereBody.applyImpulse({ x: fx, y: 0, z: fz }, true);
        }
      }
      // Only constrain Y to 0 if it drifts significantly (keep XZ free for collision)
      const t1new = this.sphereBody.translation();
      const t2new = this.attractorBody.translation();
      // if (Math.abs(t1new.y) > 1e-4) {
      //   this.sphereBody.setTranslation({ x: t1new.x, y: 0, z: t1new.z }, true);
      // }
      // if (Math.abs(t2new.y) > 1e-4) {
      //   this.attractorBody.setTranslation({ x: t2new.x, y: 0, z: t2new.z }, true);
      // }
      this.sphere.position.set(t1new.x, 0, t1new.z);
      this.attractor.position.set(t2new.x, 0, t2new.z);

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
    const sunlight = new DirectionalLight(new Color('#ffffff').convertSRGBToLinear(), 2); // Increased intensity
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
      1.2 // Increased overall intensity
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
