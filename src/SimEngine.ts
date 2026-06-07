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

  // State & loop
  private animationFrameId: number | null = null;
  private lastTime = 0;
  private throttleInput = -1.0; // range: -1.0 to 1.0
  private yawInput = 0.0;
  private pitchInput = 0.0;
  private rollInput = 0.0;
  private isActive = false;

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

    // Grid Helper: size 2000, divisions 200, color 0x888888, 0x444444
    this.gridHelper = new THREE.GridHelper(2000, 200, 0x888888, 0x444444);
    this.gridHelper.position.y = 0;
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
    droneGroup.add(arm1);

    const arm2 = new THREE.Mesh(armGeom, armMat);
    arm2.rotation.y = -Math.PI / 4;
    arm2.castShadow = true;
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
      droneGroup.add(rotor);
      this.droneRotors.push(rotor);
    });

    this.scene.add(droneGroup);
    this.droneMesh = droneGroup;

    this.syncMeshWithPhysics();
  }

  private createEnvironment() {
    const obstacleCount = 75;
    const boxGeom = new THREE.BoxGeometry(1.2, 1, 1.2);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x34495e,
      roughness: 0.4,
      metalness: 0.6
    });

    for (let i = 0; i < obstacleCount; i++) {
      const height = 5 + Math.random() * 15;
      let x = -200 + Math.random() * 400;
      let z = -200 + Math.random() * 400;

      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < 12) {
        x += x > 0 ? 12 : -12;
        z += z > 0 ? 12 : -12;
      }

      const mesh = new THREE.Mesh(boxGeom, boxMat);
      mesh.scale.set(1, height, 1);
      mesh.position.set(x, height / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.obstacleMeshes.push(mesh);

      const shape = new CANNON.Box(new CANNON.Vec3(0.6, height / 2, 0.6));
      const body = new CANNON.Body({
        mass: 0,
        shape: shape
      });
      body.position.set(x, height / 2, z);
      this.world.addBody(body);
      this.obstacleBodies.push(body);
    }
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

    this.throttleInput = -1.0;
    this.yawInput = 0.0;
    this.pitchInput = 0.0;
    this.rollInput = 0.0;

    this.pitchController.reset();
    this.rollController.reset();

    this.syncMeshWithPhysics();
    this.updateCameraFollow(true);
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

  private updateCameraFollow(snap: boolean = false) {
    const cameraSettings = GameConfig.flight.camera;
    const targetPosition = new THREE.Vector3(
      this.droneMesh.position.x,
      this.droneMesh.position.y + cameraSettings.offsetY,
      this.droneMesh.position.z + cameraSettings.offsetZ
    );
    if (snap) {
      this.camera.position.copy(targetPosition);
    } else {
      this.camera.position.lerp(targetPosition, cameraSettings.lerpFactor);
    }
    this.camera.lookAt(this.droneMesh.position);
  }

  private loop = () => {
    if (!this.isActive) return;

    this.animationFrameId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // --- PROPELLER ROTATION ANIMATION ---
    const normalizedThrottle = Math.max(0, (this.throttleInput + 1.0) / 2.0);
    const rotorSpeed = 0.08 + normalizedThrottle * 0.8;
    this.droneRotors.forEach((rotor, index) => {
      const dir = (index % 2 === 0) ? 1 : -1;
      rotor.rotation.y += dir * rotorSpeed;
    });

    // --- FLIGHT CONTROLLER LOGIC ---
    const isOnGround = this.droneBody.position.y <= 0.35;

    // 1. Target angles and rates from inputs
    const targetPitch = -this.pitchInput * GameConfig.flight.maxPitchAngle;
    const targetRoll = -this.rollInput * GameConfig.flight.maxRollAngle;
    const targetYawRate = -this.yawInput * GameConfig.flight.maxYawRate;

    // 2. Current orientation (Euler angles)
    const euler = new THREE.Euler().setFromQuaternion(this.droneMesh.quaternion, 'YXZ');
    const currentPitch = euler.x;
    const currentRoll = euler.z;

    // 3. Pitch and Roll PID Torques (Ignored if grounded)
    let pitchTorque = 0;
    let rollTorque = 0;

    if (!isOnGround) {
      pitchTorque = this.pitchController.calculate(targetPitch, currentPitch, dt);
      rollTorque = this.rollController.calculate(targetRoll, currentRoll, dt);
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

    // Physics step
    this.world.step(1 / 60, dt);

    // Sync mesh with physics
    this.syncMeshWithPhysics();

    // Camera follow drone
    this.updateCameraFollow(false);

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  };
}
