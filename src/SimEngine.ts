import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GameConfig } from './GameConfig';

export class SimEngine {
  private canvas: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private gridHelper!: THREE.GridHelper;
  
  // Lights
  private ambientLight!: THREE.AmbientLight;
  private dirLight!: THREE.DirectionalLight;

  // Physics World
  private world!: CANNON.World;
  private droneBody!: CANNON.Body;
  private droneMesh!: THREE.Object3D;

  // State & loop
  private animationFrameId: number | null = null;
  private lastTime = 0;
  private throttleInput = -1.0; // range: -1.0 to 1.0
  private isActive = false;

  constructor(canvasId: string) {
    const canvasEl = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvasEl) {
      throw new Error(`Canvas with id ${canvasId} not found`);
    }
    this.canvas = canvasEl;

    this.initGraphics();
    this.initPhysics();
    this.createDrone();

    // Listen to resize events
    window.addEventListener('resize', this.handleResize);
  }

  private initGraphics() {
    // Renderer - using window sizes directly
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    
    // Clear color set to 0x1a2530 as requested
    this.renderer.setClearColor(0x1a2530, 1);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x1a2530, 0.015);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Camera positioned at (0, 3, 7) and looking at origin
    this.camera.position.set(0, 3, 7);
    this.camera.lookAt(0, 0, 0);

    // Ambient light: intensity 0.6
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    // Directional light: intensity 1.0, position (5, 10, 5)
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.dirLight.position.set(5, 10, 5);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.scene.add(this.dirLight);

    // Grid Helper: size 20, divisions 20, color 0x888888, 0x444444
    this.gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0x444444);
    this.gridHelper.position.y = 0;
    this.scene.add(this.gridHelper);
  }

  private initPhysics() {
    this.world = new CANNON.World();
    
    // Set Gravity from GameConfig
    const grav = GameConfig.physics.gravity;
    this.world.gravity.set(grav[0], grav[1], grav[2]);

    // Ground plane
    const groundMaterial = new CANNON.Material('groundMaterial');
    const groundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: groundMaterial,
    });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(groundBody);
  }

  private createDrone() {
    // 1. Create Cannon.js Physical Body
    const mass = GameConfig.physics.droneMass;
    const dims = GameConfig.physics.droneDimensions;
    
    const boxShape = new CANNON.Box(
      new CANNON.Vec3(dims[0] / 2, dims[1] / 2, dims[2] / 2)
    );

    const startPos = GameConfig.physics.resetPosition;
    this.droneBody = new CANNON.Body({
      mass: mass,
      shape: boxShape,
      linearDamping: 0.1,
      angularDamping: 0.2,
    });
    this.droneBody.position.set(startPos[0], startPos[1], startPos[2]);
    this.world.addBody(this.droneBody);

    // 2. Highly visible Red Box Mesh
    const geometry = new THREE.BoxGeometry(dims[0], dims[1], dims[2]);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff0000, // Red
      roughness: 0.3,
      metalness: 0.2,
    });
    
    const droneMesh = new THREE.Mesh(geometry, material);
    droneMesh.castShadow = true;
    droneMesh.receiveShadow = true;

    this.scene.add(droneMesh);
    this.droneMesh = droneMesh;

    this.syncMeshWithPhysics();
  }

  public updateThrottle(value: number) {
    this.throttleInput = value;
  }

  public start() {
    if (this.isActive) return;
    this.isActive = true;
    this.canvas.classList.add('active');
    this.handleResize();
    this.lastTime = performance.now();
    this.loop();
  }

  public stop() {
    this.isActive = false;
    this.canvas.classList.remove('active');
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public reset() {
    const startPos = GameConfig.physics.resetPosition;
    
    this.droneBody.position.set(startPos[0], startPos[1], startPos[2]);
    this.droneBody.velocity.set(0, 0, 0);
    this.droneBody.angularVelocity.set(0, 0, 0);
    this.droneBody.quaternion.set(0, 0, 0, 1);

    this.syncMeshWithPhysics();
    this.updateCameraFollow();
  }

  private handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private syncMeshWithPhysics() {
    this.droneMesh.position.copy(this.droneBody.position as any);
    this.droneMesh.quaternion.copy(this.droneBody.quaternion as any);
  }

  private updateCameraFollow() {
    // Camera tracks the drone relative to its position, looking at it
    this.camera.position.set(
      this.droneMesh.position.x,
      this.droneMesh.position.y + 3.0,
      this.droneMesh.position.z + 7.0
    );
    this.camera.lookAt(this.droneMesh.position);
  }

  private loop = () => {
    if (!this.isActive) return;

    this.animationFrameId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // Apply thrust upward along body local Y axis
    const normalizedThrottle = Math.max(0, (this.throttleInput + 1.0) / 2.0);
    const forceMagnitude = normalizedThrottle * GameConfig.physics.maxThrust;

    if (forceMagnitude > 0) {
      const forceVec = new CANNON.Vec3(0, forceMagnitude, 0);
      this.droneBody.applyLocalForce(forceVec, new CANNON.Vec3(0, 0, 0));
    }

    // Physics step
    this.world.step(1 / 60, dt);

    // Sync mesh with physics
    this.syncMeshWithPhysics();

    // Camera follow drone
    this.updateCameraFollow();

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  };
}
