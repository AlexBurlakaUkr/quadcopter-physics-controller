import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GameConfig } from './GameConfig';
import { PIDController } from './PIDController';
import { BUILDER_CONFIG } from './BuilderConfig';

export class SimEngine {
  private canvas: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private gridHelper!: THREE.GridHelper;
  
  // 3D Builder Scene State (Phase 17)
  private viewMode: 'simulator' | 'builder' = 'simulator';
  private builderScene!: THREE.Scene;
  private builderCamera!: THREE.PerspectiveCamera;
  private builderControls!: OrbitControls;
  private builderFrameGroup!: THREE.Group;
  private builderSlots: THREE.Mesh[] = [];
  private draggedItem: THREE.Object3D | null = null;
  private draggedItemType: 'motor' | 'battery' | 'camera' | 'esc' | 'fc' | 'propeller' | 'arm' | 'vtx' | 'rx' | 'top_deck' | null = null;
  private snappedSlot: THREE.Mesh | null = null;
  private hasCelebrated = false;
  private isCelebratingRotation = false;
  public currentStepIndex = 0;
  private raycaster = new THREE.Raycaster();
  private dragPlane = new THREE.Plane();
  private assembledParts: { slotId: string; mesh: THREE.Object3D }[] = [];
  private toastTimeout: number | null = null;

  // Lights
  private ambientLight!: THREE.AmbientLight;
  private dirLight!: THREE.DirectionalLight;

  // Physics World
  private world!: CANNON.World;
  private droneBody!: CANNON.Body;
  private droneMesh!: THREE.Object3D;
  private groundBody!: CANNON.Body;

  // Crash event callback
  public onCrash: (() => void) | null = null;
  public onStepChange: ((index: number) => void) | null = null;

  // Active Spark Particles
  private activeSparks: {
    points: THREE.Points;
    velocities: THREE.Vector3[];
    age: number;
    maxAge: number;
  }[] = [];

  // 3D Landing Legs
  private droneLegs: THREE.Mesh[] = [];

  // Resetting state
  private isResetting = false;

  // Time tracking for frame delta
  private lastTime = 0;

  // Physics time accumulator
  private timeAccumulator = 0;

  // State & loop
  private animationFrameId: number | null = null;
  private throttleInput = -1.0; // range: -1.0 to 1.0
  private yawInput = 0.0;
  private pitchInput = 0.0;
  private rollInput = 0.0;
  private isActive = false;
  private cameraMode: 'LOS' | 'CHASE' | 'FPV' = 'LOS';

  // 3D Initiation Rods Group
  private initiationRodsGroup!: THREE.Group;

  // Persistent tracking yaw for LOS camera
  private losCameraYaw = 0;

  // PID controllers
  private pitchController!: PIDController;
  private rollController!: PIDController;

  // 3D Propeller references
  private droneRotors: THREE.Mesh[] = [];

  // Environmental obstacles
  private obstacleMeshes: THREE.Object3D[] = [];
  private obstacleBodies: CANNON.Body[] = [];

  constructor(canvasId: string) {
    const canvasEl = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvasEl) {
      throw new Error(`Canvas with id ${canvasId} not found`);
    }
    this.canvas = canvasEl;

    this.initGraphics();
    this.initPhysics();
    this.createDrone();
    this.createEnvironment();
    this.initFlightControllers();
    this.initBuilder();

    // Listen to resize events
    window.addEventListener('resize', this.handleResize);
  }

  private initFlightControllers() {
    const config = GameConfig.flight;
    this.pitchController = new PIDController(
      config.pidPitchRoll.kp,
      config.pidPitchRoll.ki,
      config.pidPitchRoll.kd
    );
    this.rollController = new PIDController(
      config.pidPitchRoll.kp,
      config.pidPitchRoll.ki,
      config.pidPitchRoll.kd
    );
  }

  public updateControls(throttle: number, yaw: number, pitch: number, roll: number) {
    this.throttleInput = throttle;
    this.yawInput = yaw;
    this.pitchInput = pitch;
    this.rollInput = roll;
  }

  private initGraphics() {
    // Initialize Time
    this.lastTime = performance.now();

    // Renderer - using window sizes directly
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    
    // Clear color set to fogColor from GameConfig
    const env = GameConfig.environment;
    this.renderer.setClearColor(env.fogColor, 1);

    // Scene
    this.scene = new THREE.Scene();
    
    // Create sky gradient background
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createLinearGradient(0, 0, 0, 512);
      gradient.addColorStop(0, env.skyColorTop);
      gradient.addColorStop(1, env.skyColorBottom);
      context.fillStyle = gradient;
      context.fillRect(0, 0, 2, 512);
    }
    const skyTexture = new THREE.CanvasTexture(canvas);
    this.scene.background = skyTexture;

    this.scene.fog = new THREE.Fog(env.fogColor, env.fogNear, env.fogFar);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.01,
      1000
    );
    // Camera positioned at (0, 3, 7) and looking at origin
    this.camera.position.set(0, 3, 7);
    this.camera.lookAt(0, 0, 0);

    // Ambient light using intensity from GameConfig.environment
    this.ambientLight = new THREE.AmbientLight(0xffffff, GameConfig.environment.ambientLightIntensity);
    this.scene.add(this.ambientLight);

    // Directional light using intensity from GameConfig.environment
    this.dirLight = new THREE.DirectionalLight(0xffffff, GameConfig.environment.dirLightIntensity);
    this.dirLight.position.set(50, 100, 50);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.left = -50;
    this.dirLight.shadow.camera.right = 50;
    this.dirLight.shadow.camera.top = 50;
    this.dirLight.shadow.camera.bottom = -50;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 200;
    this.scene.add(this.dirLight);

    // Ground plane mesh (to receive shadows)
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e272e,
      roughness: 0.8,
      metalness: 0.1
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    groundMesh.matrixAutoUpdate = false;
    groundMesh.updateMatrix();
    this.scene.add(groundMesh);

    // Grid Helper: raised slightly above ground mesh to prevent z-fighting
    this.gridHelper = new THREE.GridHelper(2000, 200, 0x888888, 0x444444);
    this.gridHelper.position.y = 0.01;
    this.scene.add(this.gridHelper);
  }

  private initPhysics() {
    this.world = new CANNON.World();
    this.world.allowSleep = false;
    
    // Set Gravity from GameConfig
    const grav = GameConfig.physics.gravity;
    this.world.gravity.set(grav[0], grav[1], grav[2]);

    // Ground plane
    const groundMaterial = new CANNON.Material('groundMaterial');
    this.groundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: groundMaterial,
    });
    this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(this.groundBody);
  }

  private createDrone() {
    // 1. Create Cannon.js Physical Body - Spherical Collider (radius ~0.3)
    const mass = GameConfig.physics.droneMass;
    const sphereShape = new CANNON.Sphere(0.3);

    const startPos = GameConfig.physics.resetPosition;
    this.droneBody = new CANNON.Body({
      mass: mass,
      linearDamping: GameConfig.physics.linearDamping,
      angularDamping: GameConfig.physics.angularDamping,
    });
    this.droneBody.position.set(startPos[0], startPos[1], startPos[2]);
    
    // Add compound shapes (sphere body and 2 initiation rods)
    this.droneBody.addShape(sphereShape);
    
    const rodLength = 0.35;
    const rodBoxHalfExtents = new CANNON.Vec3(0.01, 0.01, rodLength / 2);
    const rodBoxShape = new CANNON.Box(rodBoxHalfExtents);
    this.droneBody.addShape(rodBoxShape, new CANNON.Vec3(-0.06, 0.0, -0.15 - rodLength / 2));
    this.droneBody.addShape(rodBoxShape, new CANNON.Vec3(0.06, 0.0, -0.15 - rodLength / 2));

    this.world.addBody(this.droneBody);

    // Register crash / collision listener
    this.droneBody.addEventListener('collide', (event: any) => {
      if (this.isResetting) return;

      const targetBody = event.body;
      const contact = event.contact; // Cannon-es ContactEquation

      if (!targetBody || !contact) return;

      const shapes = this.droneBody.shapes;
      const isRodContact = contact.si === shapes[1] || contact.si === shapes[2];
      const isMainBodyContact = contact.si === shapes[0];

      let isCrash = false;

      if (isRodContact) {
        // Front initiation rods touch anything -> Instant crash!
        isCrash = true;
      } else if (isMainBodyContact) {
        // Main body/props hitting obstacles is a crash (hitting ground rests on legs, so it's safe)
        if (targetBody !== this.groundBody && this.obstacleBodies.includes(targetBody)) {
          isCrash = true;
        }
      }

      if (isCrash) {
        console.warn("Drone crashed!");
        this.isResetting = true;

        if (this.droneMesh) {
          const leftTipWorld = this.droneMesh.localToWorld(new THREE.Vector3(-0.06, 0.0, -0.50));
          const rightTipWorld = this.droneMesh.localToWorld(new THREE.Vector3(0.06, 0.0, -0.50));

          this.triggerSparkFX(leftTipWorld);
          this.triggerSparkFX(rightTipWorld);

          // Hide drone mesh on impact
          this.droneMesh.visible = false;
        }

        if (typeof navigator.vibrate === 'function') {
          navigator.vibrate([100, 50, 100]); // Strong haptic feedback pattern
        }

        // Freeze physical movement instantly at current spot
        this.droneBody.velocity.set(0, 0, 0);
        this.droneBody.angularVelocity.set(0, 0, 0);
        this.droneBody.force.set(0, 0, 0);
        this.droneBody.torque.set(0, 0, 0);

        // Immediate Input Override
        this.throttleInput = -1.0;
        this.yawInput = 0.0;
        this.pitchInput = 0.0;
        this.rollInput = 0.0;

        this.pitchController.reset();
        this.rollController.reset();

        if (this.onCrash) {
          this.onCrash();
        }

        // Sequencer delay: remain at impact site for 1.75 seconds
        setTimeout(() => {
          this.reset();
          this.isResetting = false;
        }, 1750);
      }
    });

    // 2. High-Fidelity 3D Drone Model Group
    const droneGroup = new THREE.Group();

    // Central Body - dark grey box
    const bodyGeom = new THREE.BoxGeometry(0.3, 0.08, 0.3);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2d3436,
      roughness: 0.5,
      metalness: 0.8
    });
    const centralBody = new THREE.Mesh(bodyGeom, bodyMat);
    centralBody.castShadow = true;
    centralBody.receiveShadow = true;
    droneGroup.add(centralBody);

    // Front Indicator - bright green camera lens block on front (negative Z)
    const cameraGeom = new THREE.BoxGeometry(0.12, 0.06, 0.08);
    const cameraMat = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      roughness: 0.2,
      metalness: 0.9,
      emissive: 0x003300
    });
    const frontIndicator = new THREE.Mesh(cameraGeom, cameraMat);
    frontIndicator.position.set(0, 0, -0.16);
    frontIndicator.castShadow = true;
    frontIndicator.receiveShadow = true;
    droneGroup.add(frontIndicator);

    // 4 Arms diagonal from center
    const armGeom = new THREE.BoxGeometry(0.04, 0.03, 0.5);
    const armMat = new THREE.MeshStandardMaterial({
      color: 0x636e72,
      roughness: 0.6,
      metalness: 0.7
    });

    const arm1 = new THREE.Mesh(armGeom, armMat);
    arm1.rotation.y = Math.PI / 4;
    arm1.castShadow = true;
    arm1.receiveShadow = true;
    droneGroup.add(arm1);

    const arm2 = new THREE.Mesh(armGeom, armMat);
    arm2.rotation.y = -Math.PI / 4;
    arm2.castShadow = true;
    arm2.receiveShadow = true;
    droneGroup.add(arm2);

    // 4 Rotors (Propellers) - flat semi-transparent cylinders
    const rotorGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.01, 16);
    const rotorMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1
    });

    this.droneRotors = [];

    const rotorPositions = [
      { x: 0.1498, y: 0.073, z: -0.2345 },
      { x: -0.1498, y: 0.073, z: -0.2345 },
      { x: -0.1498, y: 0.073, z: 0.2345 },
      { x: 0.1498, y: 0.073, z: 0.2345 }
    ];

    rotorPositions.forEach((pos) => {
      const rotor = new THREE.Mesh(rotorGeom, rotorMat);
      rotor.position.set(pos.x, pos.y, pos.z);
      rotor.castShadow = true;
      rotor.receiveShadow = true;
      droneGroup.add(rotor);
      this.droneRotors.push(rotor);
    });

    // 3D Landing Legs Additions
    const legLength = 0.15;
    const legRadius = 0.008; // thin cylinder
    const legGeom = new THREE.CylinderGeometry(legRadius, legRadius, legLength, 8);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x2d3436, // matching body color
      roughness: 0.5,
      metalness: 0.8
    });

    this.droneLegs = [];
    rotorPositions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeom, legMat);
      const defaultY = -0.015 - legLength / 2;
      leg.position.set(pos.x, defaultY, pos.z);
      leg.userData = { defaultY: defaultY, currentExtension: 1.0 };
      leg.castShadow = true;
      leg.receiveShadow = true;
      droneGroup.add(leg);
      this.droneLegs.push(leg);
    });

    // FPV Detonation Initiation Rods (3D Mesh Additions)
    const rodRadius = 0.0022; // ~4.4mm diameter
    const rodGeom = new THREE.CylinderGeometry(rodRadius, rodRadius, rodLength, 8);
    const rodMat = new THREE.MeshStandardMaterial({
      color: 0xbdc3c7,
      roughness: 0.3,
      metalness: 0.9
    });

    const leftRodMesh = new THREE.Mesh(rodGeom, rodMat);
    leftRodMesh.position.set(-0.06, 0.0, -0.15 - rodLength / 2);
    leftRodMesh.rotation.x = Math.PI / 2;
    leftRodMesh.castShadow = true;
    leftRodMesh.receiveShadow = true;

    const rightRodMesh = new THREE.Mesh(rodGeom, rodMat);
    rightRodMesh.position.set(0.06, 0.0, -0.15 - rodLength / 2);
    rightRodMesh.rotation.x = Math.PI / 2;
    rightRodMesh.castShadow = true;
    rightRodMesh.receiveShadow = true;

    // Group the rods to rotate them together for camera tilt sync
    this.initiationRodsGroup = new THREE.Group();
    this.initiationRodsGroup.add(leftRodMesh);
    this.initiationRodsGroup.add(rightRodMesh);
    droneGroup.add(this.initiationRodsGroup);

    this.scene.add(droneGroup);
    this.droneMesh = droneGroup;

    this.syncMeshWithPhysics();
  }

  private createEnvironment() {
    this.buildCity();
  }

  private buildCity() {
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x34495e,
      roughness: 0.5,
      metalness: 0.4
    });

    // Street layouts: place buildings in blocks along rows at X = -50, -20, 20, 50
    // Leaves a clean central street runway at X = 0, and secondary street corridors.
    const xPositions = [-50, -20, 20, 50];
    const zStart = -100;
    const zEnd = 100;
    const zSpacing = 25;

    for (const x of xPositions) {
      for (let z = zStart; z <= zEnd; z += zSpacing) {
        // Skip safety/spawning area around center origin
        if (Math.abs(x) < 25 && Math.abs(z) < 25) {
          continue;
        }

        // 10% chance to skip building to make it a loose grid
        if (Math.random() < 0.1) continue;

        const bWidth = 8 + Math.random() * 8;
        const bDepth = 8 + Math.random() * 8;
        const bHeight = 15 + Math.random() * 25;

        // Add small organic offsets to building positions within their blocks
        const offsetX = (Math.random() - 0.5) * 4;
        const offsetZ = (Math.random() - 0.5) * 6;

        const posX = x + offsetX;
        const posZ = z + offsetZ;

        const geom = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
        const mesh = new THREE.Mesh(geom, buildingMat);
        mesh.position.set(posX, bHeight / 2, posZ);

        // Shadows
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Static object performance optimization
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();

        this.scene.add(mesh);
        this.obstacleMeshes.push(mesh);

        // Cannon-es static body (mass = 0)
        const shape = new CANNON.Box(new CANNON.Vec3(bWidth / 2, bHeight / 2, bDepth / 2));
        const body = new CANNON.Body({
          mass: 0,
          shape: shape
        });
        body.position.set(posX, bHeight / 2, posZ);
        this.world.addBody(body);
        this.obstacleBodies.push(body);
      }
    }

    // Generate 6 neon arch gates along the central street corridor (at X = 0)
    const archMat = new THREE.MeshStandardMaterial({
      color: 0xe84118, // vibrant neon red-orange
      roughness: 0.3,
      metalness: 0.8,
      emissive: 0x220500
    });

    const archZPositions = [-80, -50, -20, 20, 50, 80];
    const pillarWidth = 1.0;
    const pillarHeight = 7.0;
    const pillarDepth = 1.0;
    const archWidth = 8.0; // span from left to right outer edges
    const archClearance = 6.0; // space between pillars
    const topBarHeight = 1.0;

    for (const z of archZPositions) {
      const leftPillarX = - (archClearance / 2 + pillarWidth / 2); // -3.5
      const rightPillarX = (archClearance / 2 + pillarWidth / 2);  // 3.5

      // Left Pillar
      const leftGeom = new THREE.BoxGeometry(pillarWidth, pillarHeight, pillarDepth);
      const leftMesh = new THREE.Mesh(leftGeom, archMat);
      leftMesh.position.set(leftPillarX, pillarHeight / 2, z);
      leftMesh.castShadow = true;
      leftMesh.receiveShadow = true;
      leftMesh.matrixAutoUpdate = false;
      leftMesh.updateMatrix();
      this.scene.add(leftMesh);
      this.obstacleMeshes.push(leftMesh);

      const leftShape = new CANNON.Box(new CANNON.Vec3(pillarWidth / 2, pillarHeight / 2, pillarDepth / 2));
      const leftBody = new CANNON.Body({ mass: 0, shape: leftShape });
      leftBody.position.set(leftPillarX, pillarHeight / 2, z);
      this.world.addBody(leftBody);
      this.obstacleBodies.push(leftBody);

      // Right Pillar
      const rightGeom = new THREE.BoxGeometry(pillarWidth, pillarHeight, pillarDepth);
      const rightMesh = new THREE.Mesh(rightGeom, archMat);
      rightMesh.position.set(rightPillarX, pillarHeight / 2, z);
      rightMesh.castShadow = true;
      rightMesh.receiveShadow = true;
      rightMesh.matrixAutoUpdate = false;
      rightMesh.updateMatrix();
      this.scene.add(rightMesh);
      this.obstacleMeshes.push(rightMesh);

      const rightShape = new CANNON.Box(new CANNON.Vec3(pillarWidth / 2, pillarHeight / 2, pillarDepth / 2));
      const rightBody = new CANNON.Body({ mass: 0, shape: rightShape });
      rightBody.position.set(rightPillarX, pillarHeight / 2, z);
      this.world.addBody(rightBody);
      this.obstacleBodies.push(rightBody);

      // Top Bar
      const topGeom = new THREE.BoxGeometry(archWidth, topBarHeight, pillarDepth);
      const topMesh = new THREE.Mesh(topGeom, archMat);
      topMesh.position.set(0, pillarHeight + topBarHeight / 2, z);
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;
      topMesh.matrixAutoUpdate = false;
      topMesh.updateMatrix();
      this.scene.add(topMesh);
      this.obstacleMeshes.push(topMesh);

      const topShape = new CANNON.Box(new CANNON.Vec3(archWidth / 2, topBarHeight / 2, pillarDepth / 2));
      const topBody = new CANNON.Body({ mass: 0, shape: topShape });
      topBody.position.set(0, pillarHeight + topBarHeight / 2, z);
      this.world.addBody(topBody);
      this.obstacleBodies.push(topBody);
    }
  }

  public updateThrottle(value: number) {
    this.throttleInput = value;
  }

  public cycleCameraMode(): 'LOS' | 'CHASE' | 'FPV' {
    if (this.cameraMode === 'LOS') {
      this.cameraMode = 'CHASE';
    } else if (this.cameraMode === 'CHASE') {
      this.cameraMode = 'FPV';
    } else {
      this.cameraMode = 'LOS';
    }
    // Snap camera immediately on transition
    this.updateCameraFollow(1 / 60, true);
    return this.cameraMode;
  }

  public start() {
    if (this.isActive) return;
    this.isActive = true;
    this.canvas.classList.add('active');
    this.handleResize();
    this.lastTime = performance.now(); // Reset time delta on start
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

    this.throttleInput = -1.0;
    this.yawInput = 0.0;
    this.pitchInput = 0.0;
    this.rollInput = 0.0;

    this.pitchController.reset();
    this.rollController.reset();

    this.timeAccumulator = 0;
    this.syncMeshWithPhysics();
    if (this.droneMesh) {
      this.droneMesh.visible = true;
    }
    this.updateCameraFollow(1 / 60, true);
  }

  private handleResize = () => {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    if (this.builderCamera) {
      this.builderCamera.aspect = aspect;
      this.builderCamera.updateProjectionMatrix();
    }
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };


  private syncMeshWithPhysics() {
    this.droneMesh.position.copy(this.droneBody.position as any);
    this.droneMesh.quaternion.copy(this.droneBody.quaternion as any);
  }

  private triggerSparkFX(position: THREE.Vector3) {
    const particleCount = 20;
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const velocities: THREE.Vector3[] = [];

    const colorPalette = [
      new THREE.Color(0xffffff), // White
      new THREE.Color(0xfff200), // Yellow
      new THREE.Color(0xff7f50), // Orange
      new THREE.Color(0xff4500)  // Red-Orange
    ];

    for (let i = 0; i < particleCount; i++) {
      positions.push(position.x, position.y, position.z);

      const speed = 1.5 + Math.random() * 3.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const vx = Math.sin(phi) * Math.cos(theta) * speed;
      const vy = Math.sin(phi) * Math.sin(theta) * speed;
      const vz = Math.cos(phi) * speed;
      velocities.push(new THREE.Vector3(vx, vy, vz));

      const randColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors.push(randColor.r, randColor.g, randColor.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.activeSparks.push({
      points,
      velocities,
      age: 0,
      maxAge: 0.5 // 500 ms
    });
  }

  private updateCameraFollow(deltaTime: number = 1 / 60, snap: boolean = false) {
    const cameraSettings = GameConfig.flight.camera;

    // Sync detonation rods group tilt rotation with FPV tilt angle (Task 3)
    if (this.initiationRodsGroup) {
      const tiltRad = cameraSettings.fpvTiltDegrees * (Math.PI / 180);
      this.initiationRodsGroup.rotation.x = tiltRad;
    }

    if (this.cameraMode === 'FPV') {
      const offset = new THREE.Vector3(
        cameraSettings.fpvOffset[0],
        cameraSettings.fpvOffset[1],
        cameraSettings.fpvOffset[2]
      );
      offset.applyQuaternion(this.droneMesh.quaternion);
      const targetPosition = this.droneMesh.position.clone().add(offset);
      this.camera.position.copy(targetPosition);
      
      // Copy drone rotation and apply tilt UP relative to drone's nose
      const tiltRad = cameraSettings.fpvTiltDegrees * (Math.PI / 180);
      const camQuat = this.droneMesh.quaternion.clone();
      const tiltQuat = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        tiltRad
      );
      camQuat.multiply(tiltQuat);
      this.camera.quaternion.copy(camQuat);
    } else if (this.cameraMode === 'CHASE') {
      const offset = new THREE.Vector3(
        cameraSettings.chaseOffset[0],
        cameraSettings.chaseOffset[1],
        cameraSettings.chaseDistance
      );
      offset.applyQuaternion(this.droneMesh.quaternion);
      const targetPosition = this.droneMesh.position.clone().add(offset);
      this.camera.position.copy(targetPosition);
      this.camera.quaternion.copy(this.droneMesh.quaternion);
    } else if (this.cameraMode === 'LOS') {
      // Intelligent directional follow based on drone yaw (Task 1)
      const distance = cameraSettings.losDistance;
      const height = distance * 0.5;

      // Extract horizontal heading Yaw from drone frame (ignoring pitch and roll)
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.droneMesh.quaternion);
      const droneYaw = Math.atan2(-forward.x, -forward.z);

      // Smoothly interpolate around world Y-axis (Yaw)
      if (snap) {
        this.losCameraYaw = droneYaw;
      } else {
        let diff = droneYaw - this.losCameraYaw;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        
        // Frame-rate independent lerp using lerpFactor
        const frameRatio = deltaTime * 60;
        const lerpAmount = Math.min(cameraSettings.lerpFactor * frameRatio, 1.0);
        this.losCameraYaw += diff * lerpAmount;
      }

      // Compute level camera offset (Horizon Lock)
      const offset = new THREE.Vector3(
        Math.sin(this.losCameraYaw) * distance,
        height,
        Math.cos(this.losCameraYaw) * distance
      );
      const targetPosition = this.droneMesh.position.clone().add(offset);

      this.camera.position.copy(targetPosition);
      this.camera.lookAt(this.droneMesh.position);
    }
  }

  public updateCamera() {
    this.updateCameraFollow(1 / 60, true);
    this.renderer.render(this.scene, this.camera);
  }

  private loop = () => {
    if (!this.isActive) return;

    this.animationFrameId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (this.viewMode === 'builder') {
      this.builderControls?.update();

      if (this.isCelebratingRotation) {
        const rotorSpeed = 0.25;
        this.assembledParts.forEach(part => {
          if (part.slotId.startsWith('propeller_')) {
            const suffix = part.slotId.split('_')[1]; // fr, fl, br, bl
            const dir = (suffix === 'fr' || suffix === 'bl') ? 1 : -1;
            part.mesh.rotation.y += dir * rotorSpeed;
          }
        });
      }

      this.renderer.render(this.builderScene, this.builderCamera);
      return;
    }

    // --- PROPELLER ROTATION ANIMATION ---
    const normalizedThrottle = Math.max(0, (this.throttleInput + 1.0) / 2.0);
    const rotorSpeed = (0.08 + normalizedThrottle * 0.8) * (deltaTime * 60);
    this.droneRotors.forEach((rotor, index) => {
      const dir = (index % 2 === 0) ? 1 : -1;
      rotor.rotation.y += dir * rotorSpeed;
    });

    // --- UPDATE SPARK PARTICLES ---
    for (let i = this.activeSparks.length - 1; i >= 0; i--) {
      const spark = this.activeSparks[i];
      spark.age += deltaTime;

      if (spark.age >= spark.maxAge) {
        this.scene.remove(spark.points);
        spark.points.geometry.dispose();
        (spark.points.material as THREE.Material).dispose();
        this.activeSparks.splice(i, 1);
      } else {
        const positions = spark.points.geometry.attributes.position.array as Float32Array;
        const opacity = 1.0 - (spark.age / spark.maxAge);
        (spark.points.material as THREE.PointsMaterial).opacity = opacity;

        for (let j = 0; j < spark.velocities.length; j++) {
          const vel = spark.velocities[j];
          positions[j * 3] += vel.x * deltaTime;
          positions[j * 3 + 1] += vel.y * deltaTime;
          positions[j * 3 + 2] += vel.z * deltaTime;
          
          vel.y -= 3.0 * deltaTime; // gravity
          vel.multiplyScalar(0.98); // drag
        }
        spark.points.geometry.attributes.position.needsUpdate = true;
      }
    }

    // --- UPDATE RETRACTABLE LANDING GEAR ---
    const altitude = this.droneBody.position.y;
    // Retract if altitude > 0.5 units, otherwise deploy
    const targetExtension = altitude > 0.5 ? 0.0 : 1.0;
    const animSpeed = deltaTime / 0.3; // Transition complete in 300ms

    this.droneLegs.forEach((leg) => {
      let ext = leg.userData.currentExtension;
      if (ext < targetExtension) {
        ext = Math.min(targetExtension, ext + animSpeed);
      } else if (ext > targetExtension) {
        ext = Math.max(targetExtension, ext - animSpeed);
      }
      leg.userData.currentExtension = ext;

      // Smoothly slide position and scale along Y-axis
      leg.position.y = leg.userData.defaultY * ext;
      leg.scale.y = ext;
    });

    // --- FLIGHT CONTROLLER & PHYSICS STEP (Fixed Timestep Accumulator) ---
    const fixedTimeStep = GameConfig.physics.fixedTimeStep;
    this.timeAccumulator += deltaTime;

    // Prevent spiral of death from large lags
    if (this.timeAccumulator > 0.1) {
      this.timeAccumulator = 0.1;
    }

    while (this.timeAccumulator >= fixedTimeStep) {
      if (this.isResetting) {
        this.droneBody.velocity.set(0, 0, 0);
        this.droneBody.angularVelocity.set(0, 0, 0);
        this.droneBody.force.set(0, 0, 0);
        this.droneBody.torque.set(0, 0, 0);
        this.timeAccumulator -= fixedTimeStep;
        continue;
      }

      const isOnGround = this.droneBody.position.y <= 0.4;

      // Calculate drone's local Up vector
      const localUp = new THREE.Vector3(0, 1, 0);
      const droneQuat = new THREE.Quaternion(
        this.droneBody.quaternion.x,
        this.droneBody.quaternion.y,
        this.droneBody.quaternion.z,
        this.droneBody.quaternion.w
      );
      localUp.applyQuaternion(droneQuat);

      // Grounded "Upside Down" Crash Fix
      if (isOnGround && localUp.y < 0.2) {
        this.droneBody.angularVelocity.set(0, 0, 0);
        this.droneBody.linearDamping = 0.9;
        this.droneBody.angularDamping = 0.9;
      } else {
        this.droneBody.linearDamping = GameConfig.physics.linearDamping;
        this.droneBody.angularDamping = GameConfig.physics.angularDamping;
      }

      // 1. Target angles and rates from inputs
      const targetPitch = -this.pitchInput * GameConfig.flight.maxPitchAngle;
      const targetRoll = -this.rollInput * GameConfig.flight.maxRollAngle;
      const targetYawRate = -this.yawInput * GameConfig.flight.maxYawRate;

      // 2. Current orientation (Euler angles) from physics body directly
      const bodyEuler = new THREE.Euler().setFromQuaternion(droneQuat, 'YXZ');
      const currentPitch = bodyEuler.x;
      const currentRoll = bodyEuler.z;

      // 3. Pitch and Roll PID Torques (Ignored if grounded)
      let pitchTorque = 0;
      let rollTorque = 0;

      if (!isOnGround) {
        pitchTorque = this.pitchController.calculate(targetPitch, currentPitch, fixedTimeStep);
        rollTorque = this.rollController.calculate(targetRoll, currentRoll, fixedTimeStep);
      } else {
        this.pitchController.reset();
        this.rollController.reset();
      }

      // Apply Pitch and Roll local torques to physics body
      const localTorque = new CANNON.Vec3(pitchTorque, 0, rollTorque);
      const worldTorque = this.droneBody.vectorToWorldFrame(localTorque);
      this.droneBody.torque.x += worldTorque.x;
      this.droneBody.torque.y += worldTorque.y;
      this.droneBody.torque.z += worldTorque.z;

      // 4. Yaw Control (Direct local Y angular velocity manipulation - rate mode)
      const localAngularVelocity = this.droneBody.vectorToLocalFrame(this.droneBody.angularVelocity);
      if (isOnGround) {
        localAngularVelocity.y = 0;
      } else {
        localAngularVelocity.y = targetYawRate;
      }
      this.droneBody.angularVelocity.copy(this.droneBody.vectorToWorldFrame(localAngularVelocity));

      // 5. Apply thrust upward along body local Y axis
      let forceMagnitude = 0;
      if (this.throttleInput > -0.99) {
        forceMagnitude = normalizedThrottle * GameConfig.physics.maxThrust;
      }

      if (forceMagnitude > 0) {
        const forceVec = new CANNON.Vec3(0, forceMagnitude, 0);
        this.droneBody.applyLocalForce(forceVec, new CANNON.Vec3(0, 0, 0));
      }

      // Step physics
      this.world.step(fixedTimeStep);

      this.timeAccumulator -= fixedTimeStep;
    }

    // Sync mesh with physics (direct snap to final physics position, no interpolation noise)
    this.syncMeshWithPhysics();

    // Camera follow drone (calculates target and lerps camera position, then calls lookAt)
    this.updateCameraFollow(deltaTime);

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  };

  private initBuilder() {
    this.builderScene = new THREE.Scene();

    this.builderCamera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.builderCamera.position.set(0, BUILDER_CONFIG.cameraDistance * 0.22, BUILDER_CONFIG.cameraDistance * 0.4);

    const builderViewEl = document.getElementById('builder-view') || this.renderer.domElement;
    this.builderControls = new OrbitControls(this.builderCamera, builderViewEl);
    this.builderControls.enableDamping = true;
    this.builderControls.dampingFactor = 0.05;
    this.builderControls.minDistance = 0.5;
    this.builderControls.maxDistance = 5.0;
    this.builderControls.target.set(0, 0, 0);

    // Studio Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    this.builderScene.add(ambient);

    // Front-top-left key light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 10, 5);
    this.builderScene.add(keyLight);

    // Behind rim light
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
    rimLight.position.set(-5, 5, -5);
    this.builderScene.add(rimLight);

    // Dedicated drone highlight lights (illuminating the drone assembly at the center)
    const topPointLight = new THREE.PointLight(0xffffff, 4.0, 8);
    topPointLight.position.set(0, 3.0, 0.5);
    this.builderScene.add(topPointLight);

    const frontPointLight = new THREE.PointLight(0xffffff, 3.0, 6);
    frontPointLight.position.set(0, 1.0, 2.0);
    this.builderScene.add(frontPointLight);

    this.builderFrameGroup = new THREE.Group();
    
    // Rectangular flat carbon black deck (Task 2)
    // Deconstructed initial frame: ONLY contains the Bottom Deck plate.
    const deckGeom = new THREE.BoxGeometry(BUILDER_CONFIG.deckWidth, BUILDER_CONFIG.deckHeight, BUILDER_CONFIG.deckDepth);
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.95,
      metalness: 0.1
    });
    const deckMesh = new THREE.Mesh(deckGeom, deckMat);
    deckMesh.position.set(0, BUILDER_CONFIG.deckYOffset, 0);
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;

    this.builderFrameGroup.add(deckMesh);
    this.builderScene.add(this.builderFrameGroup);

    const slotGeom = new THREE.SphereGeometry(0.045, 16, 16);
    
    GameConfig.builder.slots.forEach(slotData => {
      const slotColor = this.getSlotColor(slotData.type);

      const slotMat = new THREE.MeshBasicMaterial({
        color: slotColor,
        transparent: true,
        opacity: 0.3,
        wireframe: true
      });
      const slotMesh = new THREE.Mesh(slotGeom, slotMat);
      let x = slotData.position[0];
      let y = slotData.position[1];
      let z = slotData.position[2];

      // Dynamically override slot spacing based on BUILDER_CONFIG (Phase 23)
      if (slotData.id.startsWith('arm_') || slotData.id.startsWith('motor_') || slotData.id.startsWith('propeller_')) {
        const suffix = slotData.id.split('_')[1]; // fr, fl, br, bl
        const sx = suffix.includes('r') ? 1 : -1;
        const sz = suffix.includes('b') ? 1 : -1;
        const zShift = 0.040;

        if (slotData.id.startsWith('arm_')) {
          x = sx * (BUILDER_CONFIG.deckWidth / 2 + 0.022);
          y = BUILDER_CONFIG.deckYOffset;
          z = sz * (BUILDER_CONFIG.deckDepth / 3) + sz * zShift;
        } else if (slotData.id.startsWith('motor_')) {
          x = sx * 0.1498;
          y = 0.0378; // Sit on top of the arm
          z = sz * 0.1945 + sz * zShift;
        } else {
          x = sx * 0.1498;
          y = 0.073; // Sit on top of the motor
          z = sz * 0.1945 + sz * zShift;
        }
      } else if (slotData.id === 'camera_front') {
        x = 0;
        y = BUILDER_CONFIG.deckYOffset + BUILDER_CONFIG.deckHeight / 2 + 0.025;
        z = -BUILDER_CONFIG.deckDepth / 2 - 0.015;
      } else if (slotData.id === 'fc_top') {
        x = 0;
        y = BUILDER_CONFIG.deckYOffset + BUILDER_CONFIG.deckHeight / 2 + 0.024;
        z = 0;
      } else if (slotData.id === 'esc_bottom') {
        x = 0;
        y = BUILDER_CONFIG.deckYOffset + BUILDER_CONFIG.deckHeight / 2 + 0.004;
        z = 0;
      } else if (slotData.id === 'vtx_slot') {
        x = 0;
        y = BUILDER_CONFIG.deckYOffset + BUILDER_CONFIG.deckHeight / 2 + 0.004;
        z = -BUILDER_CONFIG.deckDepth * 0.25;
      } else if (slotData.id === 'rx_slot') {
        x = 0;
        y = BUILDER_CONFIG.deckYOffset + BUILDER_CONFIG.deckHeight / 2 + 0.003;
        z = BUILDER_CONFIG.deckDepth * 0.43;
      } else if (slotData.id === 'top_deck_slot') {
        x = 0;
        y = BUILDER_CONFIG.deckYOffset + BUILDER_CONFIG.deckHeight / 2 + 0.045;
        z = 0;
      } else if (slotData.id === 'battery_center') {
        x = 0;
        y = BUILDER_CONFIG.deckYOffset + BUILDER_CONFIG.deckHeight / 2 + 0.075;
        z = 0;
      }

      slotMesh.position.set(x, y, z);
      slotMesh.userData = {
        id: slotData.id,
        type: slotData.type,
        occupied: false
      };
      slotMesh.visible = false;
      this.builderFrameGroup.add(slotMesh);
      this.builderSlots.push(slotMesh);
    });

    window.addEventListener('pointermove', (e) => {
      if (this.viewMode === 'builder' && this.draggedItem) {
        this.updateDragPosition(e.clientX, e.clientY);
      }
    });

    window.addEventListener('pointerup', () => {
      if (this.viewMode === 'builder' && this.draggedItem) {
        this.handlePointerUp();
      }
    });
  }

  public setViewMode(mode: 'simulator' | 'builder') {
    this.viewMode = mode;
    if (mode === 'builder') {
      this.renderer.setClearColor(0x000000, 0); // Transparent black clear color
      this.canvas.style.zIndex = '4'; // Lift canvas above builder-view gradient background
      this.builderCamera.aspect = window.innerWidth / window.innerHeight;
      this.builderCamera.updateProjectionMatrix();
      this.updateAssemblyProgressTracker();
    } else {
      this.renderer.setClearColor(GameConfig.environment.fogColor, 1); // Solid clear color
      this.canvas.style.zIndex = '0'; // Restore canvas z-index
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }
  }

  public startDragging(type: 'motor' | 'battery' | 'camera' | 'esc' | 'fc' | 'propeller' | 'arm' | 'vtx' | 'rx' | 'top_deck', clientX: number, clientY: number) {
    if (this.draggedItem) {
      this.builderScene.remove(this.draggedItem);
      this.disposeObject3D(this.draggedItem);
    }

    if (this.builderControls) {
      this.builderControls.enabled = false;
    }

    let itemObject: THREE.Object3D;

    if (type === 'arm') {
      const armGeom = new THREE.BoxGeometry(0.035, 0.015, 0.22);
      const armMat = new THREE.MeshStandardMaterial({
        color: 0x111111, // Carbon fiber black
        roughness: 0.95,
        metalness: 0.1
      });
      const mesh = new THREE.Mesh(armGeom, armMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      itemObject = mesh;
    } else if (type === 'motor') {
      const geom = new THREE.CylinderGeometry(0.046, 0.046, 0.0385, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        roughness: 0.3,
        metalness: 0.8
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      itemObject = mesh;
    } else if (type === 'battery') {
      const geom = new THREE.BoxGeometry(0.08, 0.05, 0.15);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xe84118,
        roughness: 0.5,
        metalness: 0.2
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      itemObject = mesh;
    } else if (type === 'camera') {
      const cameraGroup = new THREE.Group();
      // Casing
      const casingGeom = new THREE.BoxGeometry(0.05, 0.05, 0.05);
      const casingMat = new THREE.MeshStandardMaterial({ color: 0x34495e, roughness: 0.4 });
      const casingMesh = new THREE.Mesh(casingGeom, casingMat);
      casingMesh.castShadow = true;
      casingMesh.receiveShadow = true;
      cameraGroup.add(casingMesh);
      // Lens
      const lensGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.03, 16);
      const lensMat = new THREE.MeshStandardMaterial({ color: 0x0984e3, roughness: 0.1, metalness: 0.9 });
      const lensMesh = new THREE.Mesh(lensGeom, lensMat);
      lensMesh.rotation.x = Math.PI / 2; // Point forward
      lensMesh.position.set(0, 0, -0.035);
      lensMesh.castShadow = true;
      lensMesh.receiveShadow = true;
      cameraGroup.add(lensMesh);
      itemObject = cameraGroup;
    } else if (type === 'esc') {
      const geom = new THREE.BoxGeometry(0.07, 0.008, 0.07);
      const mat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.8, metalness: 0.1 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      itemObject = mesh;
    } else if (type === 'fc') {
      const fcGroup = new THREE.Group();
      const fcGeom = new THREE.BoxGeometry(0.07, 0.008, 0.07);
      const fcMat = new THREE.MeshStandardMaterial({ color: 0x2980b9, roughness: 0.7, metalness: 0.2 });
      const fcMesh = new THREE.Mesh(fcGeom, fcMat);
      fcMesh.castShadow = true;
      fcMesh.receiveShadow = true;
      fcGroup.add(fcMesh);
      // Tiny pins
      const pinGeom = new THREE.CylinderGeometry(0.003, 0.003, 0.015, 8);
      const pinMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.3, metalness: 0.9 });
      const pinOffsets = [
        [-0.025, 0.01, -0.025],
        [0.025, 0.01, -0.025],
        [-0.025, 0.01, 0.025],
        [0.025, 0.01, 0.025]
      ];
      pinOffsets.forEach(offset => {
        const pin = new THREE.Mesh(pinGeom, pinMat);
        pin.position.set(offset[0], offset[1], offset[2]);
        pin.castShadow = true;
        pin.receiveShadow = true;
        fcGroup.add(pin);
      });
      itemObject = fcGroup;
    } else if (type === 'vtx') {
      const vtxGroup = new THREE.Group();
      const vtxGeom = new THREE.BoxGeometry(0.05, 0.008, 0.05);
      const vtxMat = new THREE.MeshStandardMaterial({ color: 0x8e44ad, roughness: 0.6 }); // Purple board
      const vtxMesh = new THREE.Mesh(vtxGeom, vtxMat);
      vtxMesh.castShadow = true;
      vtxMesh.receiveShadow = true;
      vtxGroup.add(vtxMesh);
      // connector
      const connGeom = new THREE.CylinderGeometry(0.005, 0.005, 0.015, 8);
      const connMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.2, metalness: 0.8 }); // Copper
      const connMesh = new THREE.Mesh(connGeom, connMat);
      connMesh.rotation.x = Math.PI / 2;
      connMesh.position.set(0, 0.005, 0.025);
      vtxGroup.add(connMesh);
      itemObject = vtxGroup;
    } else if (type === 'rx') {
      const rxGroup = new THREE.Group();
      const rxGeom = new THREE.BoxGeometry(0.04, 0.006, 0.04);
      const rxMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.7 }); // Orange board
      const rxMesh = new THREE.Mesh(rxGeom, rxMat);
      rxMesh.castShadow = true;
      rxMesh.receiveShadow = true;
      rxGroup.add(rxMesh);

      // Antenna base assembly
      const antennaGroup = new THREE.Group();

      // Thin cylinder antenna
      const antGeom = new THREE.CylinderGeometry(0.002, 0.002, 0.08, 8);
      const antMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.9 });
      const antMesh = new THREE.Mesh(antGeom, antMat);
      antMesh.castShadow = true;
      antMesh.receiveShadow = true;
      antMesh.position.set(0, 0.04, 0);
      antennaGroup.add(antMesh);

      // Lollipop Sphere at the very tip (Task 2)
      const bulbGeom = new THREE.SphereGeometry(0.012, 16, 16);
      const bulbMat = new THREE.MeshStandardMaterial({ color: 0xd30808, roughness: 0.2, metalness: 0.8 }); // Red cherry
      const bulbMesh = new THREE.Mesh(bulbGeom, bulbMat);
      bulbMesh.castShadow = true;
      bulbMesh.receiveShadow = true;
      bulbMesh.position.set(0, 0.08, 0);
      antennaGroup.add(bulbMesh);

      // Angle 50 degrees backward locally (towards local +Z, so rotation.x is negative)
      // When the board is rotated 180 degrees (Math.PI) globally, local +Z points towards global +Z (backward, away from drone)
      antennaGroup.rotation.x = Math.PI * -0.27; // 50 degrees backwards
      antennaGroup.position.set(0, 0.003, 0.015);
      rxGroup.add(antennaGroup);

      // Rotate entire board 180 degrees
      rxGroup.rotation.y = Math.PI;

      itemObject = rxGroup;
    } else if (type === 'top_deck') {
      const topGeom = new THREE.BoxGeometry(BUILDER_CONFIG.deckWidth, BUILDER_CONFIG.deckHeight, BUILDER_CONFIG.deckDepth * 0.9);
      const topMat = new THREE.MeshStandardMaterial({
        color: 0x111111, // Carbon fiber black
        roughness: 0.95,
        metalness: 0.1
      });
      const topMesh = new THREE.Mesh(topGeom, topMat);
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;
      itemObject = topMesh;
    } else {
      // type === 'propeller'
      const propGroup = new THREE.Group();
      // Hub
      const hubGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.012, 16);
      const hubMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.3, metalness: 0.8 });
      const hubMesh = new THREE.Mesh(hubGeom, hubMat);
      hubMesh.castShadow = true;
      hubMesh.receiveShadow = true;
      propGroup.add(hubMesh);
      // 3 Blades (spaced at 120 degrees)
      const bladeGeom = new THREE.BoxGeometry(0.02, 0.002, 0.12);
      const bladeMat = new THREE.MeshStandardMaterial({
        color: 0xff7675,
        transparent: true,
        opacity: 0.8,
        roughness: 0.2
      });
      for (let i = 0; i < 3; i++) {
        const blade = new THREE.Mesh(bladeGeom, bladeMat);
        blade.position.set(0, 0, 0.06);
        
        const bladeWrapper = new THREE.Group();
        bladeWrapper.rotation.y = (i * 2 * Math.PI) / 3;
        bladeWrapper.add(blade);
        propGroup.add(bladeWrapper);
      }
      itemObject = propGroup;
    }

    this.builderScene.add(itemObject);
    this.draggedItem = itemObject;
    this.draggedItemType = type;

    // Show matching, unoccupied slots and color-code them
    this.builderSlots.forEach(slot => {
      if (slot.userData.type === type && !slot.userData.occupied) {
        slot.visible = true;
        const slotColor = this.getSlotColor(slot.userData.type);
        (slot.material as THREE.MeshBasicMaterial).color.setHex(slotColor);
        (slot.material as THREE.MeshBasicMaterial).opacity = 0.3;
      }
    });

    this.updateDragPosition(clientX, clientY);
  }


  private updateDragPosition(clientX: number, clientY: number) {
    if (!this.draggedItem) return;

    const mouse = new THREE.Vector2(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );

    const cameraDirection = new THREE.Vector3();
    this.builderCamera.getWorldDirection(cameraDirection);
    cameraDirection.negate();
    this.dragPlane.setFromNormalAndCoplanarPoint(cameraDirection, new THREE.Vector3(0, 0, 0));

    this.raycaster.setFromCamera(mouse, this.builderCamera);
    const intersection = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
      this.draggedItem.position.copy(intersection);
    }

    let closestSlot: THREE.Mesh | null = null;
    let minDistance = GameConfig.builder.snapThreshold;

    for (const slot of this.builderSlots) {
      if (slot.visible && slot.userData.type === this.draggedItemType && !slot.userData.occupied) {
        const slotWorldPos = new THREE.Vector3();
        slot.getWorldPosition(slotWorldPos);

        const distance = this.draggedItem!.position.distanceTo(slotWorldPos);
        if (distance < minDistance) {
          minDistance = distance;
          closestSlot = slot;
        }

        const slotColor = this.getSlotColor(slot.userData.type);
        (slot.material as THREE.MeshBasicMaterial).color.setHex(slotColor);
        (slot.material as THREE.MeshBasicMaterial).opacity = 0.3;
      }
    }

    if (closestSlot) {
      this.snappedSlot = closestSlot;
      const slotWorldPos = new THREE.Vector3();
      (closestSlot as THREE.Mesh).getWorldPosition(slotWorldPos);
      this.draggedItem.position.copy(slotWorldPos);

      // Rotate arm properly when snapped!
      if (this.draggedItemType === 'arm') {
        const slotId = closestSlot.userData.id;
        if (slotId === 'arm_fr' || slotId === 'arm_bl') {
          this.draggedItem.rotation.y = -Math.PI / 4;
        } else {
          this.draggedItem.rotation.y = Math.PI / 4;
        }
      }

      ((closestSlot as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(0x00ffff);
      ((closestSlot as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.8;
    } else {
      this.snappedSlot = null;
      if (this.draggedItemType === 'arm') {
        this.draggedItem.rotation.y = 0;
      }
    }
  }

  private handlePointerUp() {
    if (!this.draggedItem) return;

    if (this.builderControls) {
      this.builderControls.enabled = true;
    }

    if (this.snappedSlot) {
      const localPos = this.snappedSlot.position.clone();
      this.builderScene.remove(this.draggedItem);
      this.draggedItem.position.copy(localPos);

      // Rotate arm properly when snapped!
      if (this.draggedItemType === 'arm') {
        const slotId = this.snappedSlot.userData.id;
        if (slotId === 'arm_fr' || slotId === 'arm_bl') {
          this.draggedItem.rotation.y = -Math.PI / 4;
        } else {
          this.draggedItem.rotation.y = Math.PI / 4;
        }
      }
      
      // Update mesh colors when dropped (Task 2)
      this.draggedItem.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (this.draggedItemType === 'propeller') {
            mat.color.setHex(0x88ff00); // Bright Lime Green
            mat.opacity = 1.0;
            mat.transparent = false;
          } else if (this.draggedItemType === 'motor') {
            mat.color.setHex(0x00008b); // Dark Blue
          } else if (this.draggedItemType === 'arm') {
            mat.color.setHex(0x333333); // Carbon Dark Gray
          } else if (this.draggedItemType === 'top_deck') {
            mat.color.setHex(0x222222); // Matte Carbon Black
          } else if (
            this.draggedItemType === 'fc' ||
            this.draggedItemType === 'esc' ||
            this.draggedItemType === 'vtx' ||
            this.draggedItemType === 'rx'
          ) {
            mat.color.setHex(0x008000); // PCB Green
          }
        }
      });

      this.builderFrameGroup.add(this.draggedItem);

      this.assembledParts.push({
        slotId: this.snappedSlot.userData.id,
        mesh: this.draggedItem
      });

      this.snappedSlot.userData.occupied = true;

      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(20);
      }

      this.updateAssemblyProgressTracker();

      // Check if current step index needs to be incremented (Phase 23)
      const steps = ['arm', 'esc', 'fc', 'camera', 'vtx', 'rx', 'motor', 'top_deck', 'battery', 'propeller'];
      const currentType = steps[this.currentStepIndex];
      const requiredCount = (currentType === 'arm' || currentType === 'motor' || currentType === 'propeller') ? 4 : 1;

      const occupiedCount = this.builderSlots.filter(s => s.userData.type === currentType && s.userData.occupied).length;
      if (occupiedCount >= requiredCount) {
        this.currentStepIndex++;
        this.updateAssemblyProgressTracker();
        if (this.onStepChange) {
          this.onStepChange(this.currentStepIndex);
        }
      }

      // Check if completely assembled
      if (this.currentStepIndex >= 10 || this.builderSlots.every(slot => slot.userData.occupied)) {
        this.celebrateBuild();
      }
    } else {
      this.builderScene.remove(this.draggedItem);
      this.disposeObject3D(this.draggedItem);
    }

    this.builderSlots.forEach(slot => {
      slot.visible = false;
    });

    this.draggedItem = null;
    this.draggedItemType = null;
    this.snappedSlot = null;
  }

  private disposeObject3D(obj: THREE.Object3D) {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });
  }

  public resetBuilder() {
    this.assembledParts.forEach(part => {
      this.builderFrameGroup.remove(part.mesh);
      this.disposeObject3D(part.mesh);
    });
    this.assembledParts = [];
    this.hasCelebrated = false;
    this.isCelebratingRotation = false;
    this.currentStepIndex = 0;

    if (this.builderControls) {
      this.builderControls.autoRotate = false;
      this.builderControls.reset();
    }

    this.builderSlots.forEach(slot => {
      slot.userData.occupied = false;
      slot.visible = false;
    });

    this.updateAssemblyProgressTracker();

    if (this.onStepChange) {
      this.onStepChange(this.currentStepIndex);
    }
  }

  private showToast(message: string) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove('hidden-toast');
    toast.classList.add('visible-toast');

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.toastTimeout = window.setTimeout(() => {
      toast.classList.remove('visible-toast');
      this.toastTimeout = window.setTimeout(() => {
        toast.classList.add('hidden-toast');
      }, 300);
    }, 2000);
  }

  private updateAssemblyProgressTracker() {
    const counts = {
      arm: 0,
      motor: 0,
      esc: 0,
      fc: 0,
      vtx: 0,
      rx: 0,
      camera: 0,
      top_deck: 0,
      propeller: 0,
      battery: 0
    };

    this.builderSlots.forEach(slot => {
      if (slot.userData.occupied) {
        const type = slot.userData.type as keyof typeof counts;
        if (counts[type] !== undefined) {
          counts[type]++;
        }
      }
    });

    const loc = GameConfig.localization;
    const armsEl = document.getElementById('tracker-arms');
    const motorsEl = document.getElementById('tracker-motors');
    const escEl = document.getElementById('tracker-esc');
    const fcEl = document.getElementById('tracker-fc');
    const vtxEl = document.getElementById('tracker-vtx');
    const rxEl = document.getElementById('tracker-rx');
    const cameraEl = document.getElementById('tracker-camera');
    const topDeckEl = document.getElementById('tracker-topdeck');
    const propsEl = document.getElementById('tracker-propellers');
    const batteryEl = document.getElementById('tracker-battery');

    if (armsEl) armsEl.textContent = `${loc.trackerArms}: ${counts.arm}/4`;
    if (motorsEl) motorsEl.textContent = `${loc.trackerMotors}: ${counts.motor}/4`;
    if (escEl) escEl.textContent = `${loc.trackerESC}: ${counts.esc}/1`;
    if (fcEl) fcEl.textContent = `${loc.trackerFC}: ${counts.fc}/1`;
    if (vtxEl) vtxEl.textContent = `${loc.trackerVTX}: ${counts.vtx}/1`;
    if (rxEl) rxEl.textContent = `${loc.trackerRX}: ${counts.rx}/1`;
    if (cameraEl) cameraEl.textContent = `${loc.trackerCamera}: ${counts.camera}/1`;
    if (topDeckEl) topDeckEl.textContent = `${loc.trackerTopDeck}: ${counts.top_deck}/1`;
    if (propsEl) propsEl.textContent = `${loc.trackerPropellers}: ${counts.propeller}/4`;
    if (batteryEl) batteryEl.textContent = `${loc.trackerBattery}: ${counts.battery}/1`;

    // Apply active-build-step class dynamically to current step (Phase 23)
    const spans = [armsEl, escEl, fcEl, cameraEl, vtxEl, rxEl, motorsEl, topDeckEl, batteryEl, propsEl];
    spans.forEach((span, idx) => {
      if (span) {
        if (idx === this.currentStepIndex) {
          span.classList.add('active-build-step');
        } else {
          span.classList.remove('active-build-step');
        }
      }
    });
  }

  private getSlotColor(type: string): number {
    switch (type) {
      case 'arm': return 0xffd700; // Gold
      case 'motor': return 0x3498db; // Sky Blue
      case 'camera': return 0x0984e3; // Blue
      case 'esc': return 0x6c5ce7; // Purple
      case 'fc': return 0xe17055; // Orange-Red
      case 'vtx': return 0x9b59b6; // Amethyst Purple
      case 'rx': return 0xe67e22; // Carrot Orange
      case 'top_deck': return 0x95a5a6; // Silver/Gray
      case 'propeller': return 0x00d2d3; // Cyan
      case 'battery': return 0xe74c3c; // Alizarin Red
      default: return 0x00ff00;
    }
  }

  private playESCTones() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playBeep = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        
        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(start);
        osc.stop(start + duration);
      };
      
      let now = ctx.currentTime;
      playBeep(800, now + 0.1, 0.12);
      playBeep(800, now + 0.3, 0.12);
      playBeep(800, now + 0.5, 0.12);
      playBeep(400, now + 0.75, 0.25);
      playBeep(1200, now + 1.05, 0.40);
    } catch (err) {
      console.error("Web Audio ESC startup tones failed:", err);
    }
  }

  private celebrateBuild() {
    if (this.hasCelebrated) return;
    this.hasCelebrated = true;

    // 1. Play synthesized BLHeli tones
    this.playESCTones();

    // 2. Confetti Upward Sparkle FX
    const particleGroup = new THREE.Group();
    const particleCount = 120;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];

    const colorPalette = [
      new THREE.Color(0xff7675), // soft red
      new THREE.Color(0x74b9ff), // soft blue
      new THREE.Color(0x55efc4), // soft green
      new THREE.Color(0xffeaa7), // soft yellow
      new THREE.Color(0xa29bfe), // soft purple
      new THREE.Color(0xfd79a8)  // pink
    ];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0.090; // center of drone / battery height
      positions[i * 3 + 2] = 0;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 1.8;
      const ySpeed = 1.2 + Math.random() * 2.5;

      velocities.push(new THREE.Vector3(
        Math.cos(angle) * speed,
        ySpeed,
        Math.sin(angle) * speed
      ));

      const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = randomColor.r;
      colors[i * 3 + 1] = randomColor.g;
      colors[i * 3 + 2] = randomColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Dynamic clean round particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 16);
    }
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      map: texture,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    particleGroup.add(points);
    this.builderScene.add(particleGroup);

    let elapsed = 0;
    const duration = 3.0;
    const clock = new THREE.Clock();

    const animateConfetti = () => {
      const dt = clock.getDelta();
      elapsed += dt;

      if (elapsed >= duration) {
        this.builderScene.remove(particleGroup);
        points.geometry.dispose();
        material.dispose();
        texture.dispose();
        return;
      }

      const posAttr = points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const vel = velocities[i];
        vel.y -= 2.2 * dt; // Gravity
        posArr[i * 3] += vel.x * dt;
        posArr[i * 3 + 1] += vel.y * dt;
        posArr[i * 3 + 2] += vel.z * dt;
      }

      posAttr.needsUpdate = true;
      material.opacity = Math.max(0, 1.0 - (elapsed / duration));

      requestAnimationFrame(animateConfetti);
    };

    clock.start();
    requestAnimationFrame(animateConfetti);

    // 3. Cinematic Auto-Rotate Win State (Phase 23)
    this.isCelebratingRotation = true;
    if (this.builderControls) {
      this.builderControls.autoRotate = true;
      this.builderControls.autoRotateSpeed = 3.0;
    }

    const stopAutoRotate = () => {
      if (this.builderControls) {
        this.builderControls.autoRotate = false;
      }
      this.canvas.removeEventListener('pointerdown', stopAutoRotate);
      this.canvas.removeEventListener('touchstart', stopAutoRotate);
    };
    this.canvas.addEventListener('pointerdown', stopAutoRotate);
    this.canvas.addEventListener('touchstart', stopAutoRotate);

    this.showToast("Збірка дрона успішно завершена! 🚀✨");
  }
}

