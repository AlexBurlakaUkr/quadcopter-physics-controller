import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GameConfig } from './GameConfig';
import { PIDController } from './PIDController';

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

  // Clock for frame delta
  private clock!: THREE.Clock;

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
    // Initialize Clock
    this.clock = new THREE.Clock();

    // Renderer - using window sizes directly
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
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

    // Directional light: intensity 1.0, position (50, 100, 50)
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
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
    const groundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: groundMaterial,
    });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(groundBody);
  }

  private createDrone() {
    // 1. Create Cannon.js Physical Body - Spherical Collider (radius ~0.3)
    const mass = GameConfig.physics.droneMass;
    const sphereShape = new CANNON.Sphere(0.3);

    const startPos = GameConfig.physics.resetPosition;
    this.droneBody = new CANNON.Body({
      mass: mass,
      shape: sphereShape,
      linearDamping: 0.3,
      angularDamping: 0.3,
    });
    this.droneBody.position.set(startPos[0], startPos[1], startPos[2]);
    this.world.addBody(this.droneBody);

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
      { x: 0.177, y: 0.03, z: -0.177 },
      { x: -0.177, y: 0.03, z: -0.177 },
      { x: -0.177, y: 0.03, z: 0.177 },
      { x: 0.177, y: 0.03, z: 0.177 }
    ];

    rotorPositions.forEach((pos) => {
      const rotor = new THREE.Mesh(rotorGeom, rotorMat);
      rotor.position.set(pos.x, pos.y, pos.z);
      rotor.castShadow = true;
      rotor.receiveShadow = true;
      droneGroup.add(rotor);
      this.droneRotors.push(rotor);
    });

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
    this.updateCameraFollow();
    return this.cameraMode;
  }

  public start() {
    if (this.isActive) return;
    this.isActive = true;
    this.canvas.classList.add('active');
    this.handleResize();
    this.clock.getDelta(); // Reset clock delta on start
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
    this.updateCameraFollow();
  }

  private handleResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private syncMeshWithPhysics() {
    this.droneMesh.position.copy(this.droneBody.position as any);
    this.droneMesh.quaternion.copy(this.droneBody.quaternion as any);
  }

  private updateCameraFollow() {
    const cameraSettings = GameConfig.flight.camera;

    if (this.cameraMode === 'FPV') {
      const offset = new THREE.Vector3(
        cameraSettings.fpvOffset[0],
        cameraSettings.fpvOffset[1],
        cameraSettings.fpvOffset[2]
      );
      offset.applyQuaternion(this.droneMesh.quaternion);
      const targetPosition = this.droneMesh.position.clone().add(offset);
      this.camera.position.copy(targetPosition);
      this.camera.quaternion.copy(this.droneMesh.quaternion);
    } else if (this.cameraMode === 'CHASE') {
      const offset = new THREE.Vector3(
        cameraSettings.chaseOffset[0],
        cameraSettings.chaseOffset[1],
        cameraSettings.chaseOffset[2]
      );
      offset.applyQuaternion(this.droneMesh.quaternion);
      const targetPosition = this.droneMesh.position.clone().add(offset);
      this.camera.position.copy(targetPosition);
      this.camera.quaternion.copy(this.droneMesh.quaternion);
    } else if (this.cameraMode === 'LOS') {
      const offset = new THREE.Vector3(
        cameraSettings.losOffset[0],
        cameraSettings.losOffset[1],
        cameraSettings.losOffset[2]
      );
      const targetPosition = this.droneMesh.position.clone().add(offset);
      this.camera.position.copy(targetPosition);
      this.camera.lookAt(this.droneMesh.position);
    }
  }

  private loop = () => {
    if (!this.isActive) return;

    this.animationFrameId = requestAnimationFrame(this.loop);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    // --- PROPELLER ROTATION ANIMATION ---
    const normalizedThrottle = Math.max(0, (this.throttleInput + 1.0) / 2.0);
    const rotorSpeed = (0.08 + normalizedThrottle * 0.8) * (deltaTime * 60);
    this.droneRotors.forEach((rotor, index) => {
      const dir = (index % 2 === 0) ? 1 : -1;
      rotor.rotation.y += dir * rotorSpeed;
    });

    // --- FLIGHT CONTROLLER & PHYSICS STEP (Fixed Timestep Accumulator) ---
    const fixedTimeStep = GameConfig.physics.fixedTimeStep;
    this.timeAccumulator += deltaTime;

    // Prevent spiral of death from large lags
    if (this.timeAccumulator > 0.1) {
      this.timeAccumulator = 0.1;
    }

    while (this.timeAccumulator >= fixedTimeStep) {
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
      } else {
        this.droneBody.linearDamping = 0.3;
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
      const forceMagnitude = normalizedThrottle * GameConfig.physics.maxThrust;

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
    this.updateCameraFollow();

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  };
}
