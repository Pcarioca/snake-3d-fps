/*
 * 3D Snake FPS Game
 *
 * This script implements a simple first‑person version of the classic snake game using Three.js.
 * The player moves forward continuously and steers with the mouse. Collecting coins extends the
 * tail, while colliding with your own tail, the walls or enemies ends the game. You can also
 * shoot enemies with left click to remove them. The game logic is intentionally simple but
 * demonstrates collision detection, basic AI, pointer lock controls and rendering in 3D.
 */

(() => {
  // Grab DOM elements
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');
  const hud = document.getElementById('hud');

  // Three.js essentials
  let scene, camera, renderer, clock;

  // Game world parameters
  const worldSize = 50;     // half‑width/length of square play area
  const floorY = 0;         // height of floor
  const snakeHeight = 1.6;  // eye height for camera and tail segments
  const recordStep = 0.5;   // distance traveled before recording tail position
  let moveSpeed = 5;        // units per second (will increase as snake grows)
  const bulletSpeed = 25;   // bullet velocity units per second
  const enemySpeed = 1;     // enemy wandering speed (very slow)

  // Game state variables
  let yaw = 0;    // horizontal rotation (around Y)
  let pitch = 0;  // vertical rotation
  let lastRecordPos; // last recorded position for tail
  let tailLength = 5; // starting tail length (number of segments)
  const tailSegments = [];
  const tailPositions = []; // recorded path positions
  const foods = [];
  const enemies = [];
  const bullets = [];
  let score = 0;
  let gameActive = false;

  // Utility function: random position within world bounds (avoids edges by margin)
  function randomPosition(margin = 2) {
    const range = worldSize - margin;
    const x = (Math.random() * 2 - 1) * range;
    const z = (Math.random() * 2 - 1) * range;
    return new THREE.Vector3(x, floorY + 0.5, z);
  }

  // Setup Three.js scene, camera, renderer and static world objects
  function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, snakeHeight, 0);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    clock = new THREE.Clock();

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1, 2, 1);
    scene.add(dirLight);

    // Floor
    const floorGeo = new THREE.PlaneGeometry(worldSize * 2, worldSize * 2);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY;
    scene.add(floor);

    // Walls: four bounding boxes
    const wallHeight = 3;
    const wallThickness = 0.5;
    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
    // North wall (positive z)
    const northGeo = new THREE.BoxGeometry(worldSize * 2, wallHeight, wallThickness);
    const north = new THREE.Mesh(northGeo, wallMaterial);
    north.position.set(0, wallHeight / 2, worldSize + wallThickness / 2);
    scene.add(north);
    // South wall (negative z)
    const south = north.clone();
    south.position.set(0, wallHeight / 2, -worldSize - wallThickness / 2);
    scene.add(south);
    // East wall (positive x)
    const eastGeo = new THREE.BoxGeometry(wallThickness, wallHeight, worldSize * 2);
    const east = new THREE.Mesh(eastGeo, wallMaterial);
    east.position.set(worldSize + wallThickness / 2, wallHeight / 2, 0);
    scene.add(east);
    // West wall (negative x)
    const west = east.clone();
    west.position.set(-worldSize - wallThickness / 2, wallHeight / 2, 0);
    scene.add(west);

    // Create initial tail segments
    const segmentGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const segmentMat = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    for (let i = 0; i < tailLength; i++) {
      const seg = new THREE.Mesh(segmentGeo, segmentMat);
      seg.position.set(0, 0.2, -i * recordStep);
      scene.add(seg);
      tailSegments.push(seg);
    }

    // Spawn initial food and enemies
    spawnFood();
    spawnFood();
    spawnEnemy();
    spawnEnemy();

    // Set initial last record position for tail
    lastRecordPos = camera.position.clone();
  }

  // Spawn a food item (coin or apple) at a random free position
  function spawnFood() {
    const foodGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const foodMat = new THREE.MeshPhongMaterial({ color: 0xffdd00 });
    const food = new THREE.Mesh(foodGeo, foodMat);
    let pos;
    let tries = 0;
    do {
      pos = randomPosition();
      tries++;
    } while (isPointNearSnake(pos) && tries < 10);
    food.position.copy(pos);
    scene.add(food);
    foods.push(food);
  }

  // Spawn an enemy at random position
  function spawnEnemy() {
    const enemyGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const enemyMat = new THREE.MeshPhongMaterial({ color: 0xff3333 });
    const enemy = new THREE.Mesh(enemyGeo, enemyMat);
    let pos;
    let tries = 0;
    do {
      pos = randomPosition();
      tries++;
    } while (isPointNearSnake(pos) && tries < 10);
    enemy.position.copy(pos);
    enemy.userData = { dir: new THREE.Vector3((Math.random() * 2 - 1), 0, (Math.random() * 2 - 1)).normalize() };
    scene.add(enemy);
    enemies.push(enemy);
  }

  // Helper: check if a point is near the snake or walls
  function isPointNearSnake(pos) {
    // Avoid spawn near camera (within 5 units) or outside bounds
    const dx = pos.x - camera.position.x;
    const dz = pos.z - camera.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return dist < 5;
  }

  // Start the game: hide overlay, request pointer lock and begin animation loop
  function startGame() {
    if (gameActive) return;
    overlay.style.display = 'none';
    document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
    document.body.requestPointerLock();
    // Reset game state
    yaw = 0;
    pitch = 0;
    camera.position.set(0, snakeHeight, 0);
    lastRecordPos.copy(camera.position);
    tailLength = 5;
    moveSpeed = 5;
    score = 0;
    // Remove old objects
    foods.forEach(f => scene.remove(f));
    enemies.forEach(e => scene.remove(e));
    bullets.forEach(b => scene.remove(b.mesh));
    foods.length = 0;
    enemies.length = 0;
    bullets.length = 0;
    tailPositions.length = 0;
    // Reset tail segments
    while (tailSegments.length > 0) {
      scene.remove(tailSegments.pop());
    }
    const segmentGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const segmentMat = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    for (let i = 0; i < tailLength; i++) {
      const seg = new THREE.Mesh(segmentGeo, segmentMat);
      seg.position.set(0, 0.2, -i * recordStep);
      scene.add(seg);
      tailSegments.push(seg);
    }
    spawnFood();
    spawnFood();
    spawnEnemy();
    spawnEnemy();
    gameActive = true;
    // Reset clock
    clock.getDelta();
    animate();
  }

  // Pointer lock and mouse look handling
  function setupPointerLock() {
    const sensitivity = 0.0025;
    function onMouseMove(event) {
      if (!gameActive || document.pointerLockElement !== document.body) return;
      yaw -= event.movementX * sensitivity;
      pitch -= event.movementY * sensitivity;
      const maxPitch = Math.PI / 2 - 0.05;
      if (pitch > maxPitch) pitch = maxPitch;
      if (pitch < -maxPitch) pitch = -maxPitch;
    }
    document.addEventListener('mousemove', onMouseMove, false);
    // Fire bullets on click
    document.addEventListener('mousedown', event => {
      if (!gameActive) return;
      if (document.pointerLockElement !== document.body) {
        // Acquire pointer lock on first click
        document.body.requestPointerLock();
        return;
      }
      // Left click spawns a bullet
      if (event.button === 0) {
        shoot();
      }
    });
    // Exit pointer lock resets gameActive? We'll handle on pointerlockchange
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === document.body) {
        // locked
      } else {
        // unlocked: pause game if active
      }
    });
  }

  // Spawn a bullet from the camera's position and orientation
  function shoot() {
    // bullet geometry and material
    const bulletGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(bulletGeo, bulletMat);
    const startPos = new THREE.Vector3().copy(camera.position);
    mesh.position.copy(startPos);
    scene.add(mesh);
    // compute direction based on yaw and pitch
    const dir = new THREE.Vector3();
    dir.x = Math.sin(yaw) * Math.cos(pitch);
    dir.y = Math.sin(pitch);
    dir.z = Math.cos(yaw) * Math.cos(pitch);
    dir.normalize();
    bullets.push({ mesh, dir });
  }

  // Main animation loop
  function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    // Update orientation of camera from yaw/pitch
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    // Compute forward direction on XZ plane
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    forward.normalize();
    // Move camera forward continuously
    camera.position.addScaledVector(forward, moveSpeed * dt);
    // Maintain constant height
    camera.position.y = snakeHeight;
    // Record tail positions when traveled enough distance
    if (camera.position.distanceTo(lastRecordPos) > recordStep) {
      tailPositions.push(camera.position.clone());
      lastRecordPos.copy(camera.position);
    }
    // Update tail segment positions
    for (let i = 0; i < tailSegments.length; i++) {
      const idx = tailPositions.length - 1 - i;
      if (idx >= 0) {
        const p = tailPositions[idx];
        tailSegments[i].position.set(p.x, 0.2, p.z);
      }
    }
    // Update bullets positions and check collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.mesh.position.addScaledVector(b.dir, bulletSpeed * dt);
      // Remove bullet if out of world bounds
      if (Math.abs(b.mesh.position.x) > worldSize + 5 || Math.abs(b.mesh.position.z) > worldSize + 5) {
        scene.remove(b.mesh);
        bullets.splice(i, 1);
        continue;
      }
      // Check collision with enemies
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        const dist = b.mesh.position.distanceTo(e.position);
        if (dist < 0.6) {
          // remove enemy and bullet
          scene.remove(e);
          enemies.splice(j, 1);
          scene.remove(b.mesh);
          bullets.splice(i, 1);
          score += 5;
          break;
        }
      }
    }
    // Update enemies (simple wandering)
    enemies.forEach(e => {
      // small random perturbation
      const dir = e.userData.dir;
      e.position.addScaledVector(dir, enemySpeed * dt);
      // Bounce off walls
      if (e.position.x > worldSize - 1 || e.position.x < -worldSize + 1) dir.x *= -1;
      if (e.position.z > worldSize - 1 || e.position.z < -worldSize + 1) dir.z *= -1;
      // Adjust y constant
      e.position.y = floorY + 0.5;
    });
    // Check player collisions with food
    for (let i = foods.length - 1; i >= 0; i--) {
      const f = foods[i];
      const dist = camera.position.distanceTo(f.position);
      if (dist < 1) {
        // collect food
        scene.remove(f);
        foods.splice(i, 1);
        tailLength += 2; // grow by 2 segments
        moveSpeed += 0.2; // increase speed slightly
        score += 1;
        // add new tail segments immediately
        const segmentGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const segmentMat = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        for (let j = 0; j < 2; j++) {
          const seg = new THREE.Mesh(segmentGeo, segmentMat);
          seg.position.set(camera.position.x, 0.2, camera.position.z);
          scene.add(seg);
          tailSegments.push(seg);
        }
        // spawn new food
        spawnFood();
        // occasionally spawn enemy
        if (enemies.length < 5 && Math.random() < 0.3) spawnEnemy();
      }
    }
    // Check player collision with enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const dist = camera.position.distanceTo(e.position);
      if (dist < 1.0) {
        // hit enemy: game over
        return endGame('You were eaten by an enemy!');
      }
    }
    // Check player collision with tail
    for (let i = 4; i < tailPositions.length; i++) { // skip first few positions to avoid immediate self collision
      const p = tailPositions[i];
      const dist = camera.position.distanceTo(p);
      if (dist < 0.5) {
        return endGame('You ran into yourself!');
      }
    }
    // Check out of bounds
    if (camera.position.x > worldSize - 0.5 || camera.position.x < -worldSize + 0.5 ||
        camera.position.z > worldSize - 0.5 || camera.position.z < -worldSize + 0.5) {
      return endGame('You hit the wall!');
    }
    // Update HUD
    hud.textContent = `Score: ${score} | Length: ${tailSegments.length}`;
    // Render
    renderer.render(scene, camera);
  }

  // End the game, show overlay with message
  function endGame(msg) {
    gameActive = false;
    document.exitPointerLock();
    overlay.querySelector('h1').textContent = 'Game Over';
    overlay.querySelector('p').textContent = `${msg} Your score: ${score}. Click start to play again.`;
    overlay.style.display = 'flex';
  }

  // Handle window resize
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onWindowResize);

  // Initialize
  initScene();
  setupPointerLock();
  startBtn.addEventListener('click', startGame);
})();