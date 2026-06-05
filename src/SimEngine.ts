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
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    // Set premium background color matching body bg-darker
    this.renderer.setClearColor(0x030408, 1);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x030408, 0.015);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 3, 6);

    // Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.dirLight.position.set(10, 20, 10);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.scene.add(this.dirLight);

    // Grid Helper (Premium colors matching accent cyan and purple)
    // GridHelper(size, divisions, colorCenterLine, colorGrid)
    this.gridHelper = new THREE.GridHelper(200, 200, 0x00f0ff, 0x1e1233);
    this.gridHelper.position.y = 0;
    this.scene.add(this.gridHelper);
  }

  private initPhysics() {
    this.world = new CANNON.World();
    
    // Set Gravity from GameConfig
    const grav = GameConfig.physics.gravity;
    this.world.gravity.set(grav[0], grav[1], grav[2]);

    // Ground Plane Material
    const groundMaterial = new CANNON.Material('groundMaterial');
    
    // Static Ground plane
    const groundBody = new CANNON.Body({
      mass: 0, // static
      shape: new CANNON.Plane(),
      material: groundMaterial,
    });
    // Rotate to lie horizontal
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(groundBody);
  }

  private createDrone() {
    // 1. Create Cannon.js Physical Body
    const mass = GameConfig.physics.droneMass;
    const dims = GameConfig.physics.droneDimensions;
    
    // Box shape takes half-extents
    const boxShape = new CANNON.Box(
      new CANNON.Vec3(dims[0] / 2, dims[1] / 2, dims[2] / 2)
    );

    const startPos = GameConfig.physics.resetPosition;
    this.droneBody = new CANNON.Body({
      mass: mass,
      shape: boxShape,
      linearDamping: 0.1, // Air resistance
      angularDamping: 0.2,
    });
    this.droneBody.position.set(startPos[0], startPos[1], startPos[2]);
    this.world.addBody(this.droneBody);

    // 2. Create Three.js Visual Mesh Group (Premium minimalist quadcopter prototype)
    const droneGroup = new THREE.Group();

    // Central core (box shape)
    const coreGeom = new THREE.BoxGeometry(0.2, 0.05, 0.2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff, // Cyan
      roughness: 0.1,
      metalness: 0.8,
      emissive: 0x003333,
    });
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    coreMesh.castShadow = true;
    coreMesh.receiveShadow = true;
    droneGroup.add(coreMesh);

    // Crossed structural arms
    const armMat = new THREE.MeshStandardMaterial({
      color: 0x33333b, // Dark carbon fiber look
      roughness: 0.4,
      metalness: 0.6,
    });
    const armGeom = new THREE.BoxGeometry(0.55, 0.02, 0.03);

    const arm1 = new THREE.Mesh(armGeom, armMat);
    arm1.rotation.y = Math.PI / 4;
    arm1.castShadow = true;
    droneGroup.add(arm1);

    const arm2 = new THREE.Mesh(armGeom, armMat);
    arm2.rotation.y = -Math.PI / 4;
    arm2.castShadow = true;
    droneGroup.add(arm2);

    // Motors & Props placeholder (Purple Cylinders at corner positions)
    const motorGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.05, 8);
    const motorMat = new THREE.MeshStandardMaterial({
      color: 0xbd00ff, // Purple
      roughness: 0.2,
      metalness: 0.8,
    });

    const motorOffsets = [
      { x: 0.19, z: 0.19 },
      { x: -0.19, z: 0.19 },
      { x: 0.19, z: -0.19 },
      { x: -0.19, z: -0.19 },
    ];

    motorOffsets.forEach(offset => {
      const motor = new THREE.Mesh(motorGeom, motorMat);
      motor.position.set(offset.x, 0.03, offset.z);
      motor.castShadow = true;
      droneGroup.add(motor);
    });

    this.scene.add(droneGroup);
    this.droneMesh = droneGroup;

    // Align mesh position with physical body initially
    this.syncMeshWithPhysics();
  }

  public updateThrottle(value: number) {
    // Keep raw throttle value (-1.0 to 1.0)
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
    
    // Reset Cannon body position & velocities
    this.droneBody.position.set(startPos[0], startPos[1], startPos[2]);
    this.droneBody.velocity.set(0, 0, 0);
    this.droneBody.angularVelocity.set(0, 0, 0);
    this.droneBody.quaternion.set(0, 0, 0, 1);

    this.syncMeshWithPhysics();
    this.updateCameraFollow();
  }

  private handleResize = () => {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private syncMeshWithPhysics() {
    // Copy positions from Cannon body to Three mesh
    this.droneMesh.position.copy(this.droneBody.position as any);
    this.droneMesh.quaternion.copy(this.droneBody.quaternion as any);
  }

  private updateCameraFollow() {
    // Camera stays offset relative to the drone
    this.camera.position.x = this.droneMesh.position.x;
    this.camera.position.y = this.droneMesh.position.y + 2.0;
    this.camera.position.z = this.droneMesh.position.z + 4.5;
    
    this.camera.lookAt(this.droneMesh.position);
  }

  private loop = () => {
    if (!this.isActive) return;

    this.animationFrameId = requestAnimationFrame(this.loop);

    // Delta Time
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // cap dt to avoid huge physics jumps
    this.lastTime = now;

    // Apply thrust force along local Y-axis based on throttle input
    // Map throttle input from [-1.0, 1.0] (joystick coordinates) to [0.0, 1.0] (thrust multiplier)
    const normalizedThrottle = Math.max(0, (this.throttleInput + 1.0) / 2.0);
    const forceMagnitude = normalizedThrottle * GameConfig.physics.maxThrust;

    if (forceMagnitude > 0) {
      // Force applied upward along the local Y-axis of the body, applied at center (0,0,0)
      const forceVec = new CANNON.Vec3(0, forceMagnitude, 0);
      this.droneBody.applyLocalForce(forceVec, new CANNON.Vec3(0, 0, 0));
    }

    // Step Physics World (fixed timestep of 1/60 for stability)
    this.world.step(1 / 60, dt);

    // Sync rendering objects with physics engine
    this.syncMeshWithPhysics();

    // Camera follow drone
    this.updateCameraFollow();

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  };
}
