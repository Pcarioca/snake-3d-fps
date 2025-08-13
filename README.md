# 3D Snake FPS – A First‑Person Snake Game

This repository contains **3D Snake FPS**, a first‑person 3D interpretation of the classic snake game.  Instead of watching your snake from above, you navigate the world from the snake’s own perspective.  Collect coins to grow longer, avoid colliding with your own tail or the walls, and fend off roaming enemies by shooting them.

## Features

- **First‑person perspective:**  Steer the snake by moving your mouse.  The game uses pointer‑lock controls to capture your mouse and translates movement into yaw and pitch.
 - **Dynamic 3D world:**  A simple arena with textured floors and walls, rendered using [Three.js](https://threejs.org/) and WebGL.  
   Instead of sprinting endlessly, the snake now advances in discrete steps.  Every half second it moves one
   unit in the direction you are currently facing.  This slower, more deliberate pace makes the game
   playable for first‑time FPS snake players and lets you think ahead as you steer.
- **Grow by collecting coins:**  Golden coins spawn randomly around the arena.  Each coin increases your tail length by two segments and slightly increases your speed.
- **Tail collisions:**  Your previous path is rendered as a green tail following behind you.  Colliding with any part of your tail ends the game.
- **Enemies and shooting:**  Enemies wander the arena.  Shoot them with left click to earn points.  If you run into an enemy, it’s game over.
- **Responsive HUD and overlay:**  A heads‑up display shows your current score and snake length.  An overlay provides instructions and displays a game over message when you lose.
- **Runs entirely in the browser:**  No backend or build tools required.  Open `index.html` in a modern browser to play.  Works offline thanks to simple static assets.

## Controls

 - **Click “Start Game”** to begin.  The browser will request pointer lock – move your mouse to steer.  
   The snake will move forward in a straight line every half second.  Turn your view with the mouse before
   the next step to change direction.
- **Collect coins** to grow your snake and increase your score.
- **Avoid your own tail**, the walls and the enemies.  Colliding with any of these ends the game.
- **Left click** while in pointer lock to shoot a bullet.  Hitting an enemy removes it and awards bonus points.

## Technology

This game is built with vanilla JavaScript and [Three.js](https://threejs.org/).  It uses basic physics and collision detection without any external dependencies.  All rendering, input handling and game logic live in the client.

## How to run locally

1. Clone this repository or download the files.
2. Serve the folder using a simple HTTP server (pointer lock requires an HTTP or HTTPS origin).  For example, using Python:

   ```bash
   cd snake3d
   python3 -m http.server
   ```

3. Open `http://localhost:8000` in a WebGL‑enabled browser.  Click “Start Game” and follow the prompts.

## Deployment

To make this game publicly accessible, you can host it as a static site (e.g. GitHub Pages, Netlify).  Simply point your hosting service to the contents of this repository’s root directory.  No build step is required.

## Origin

This project was generated end‑to‑end by **ChatGPT**, OpenAI’s large language model, via Andrei’s GitHub account.  The AI wrote all code, assets and documentation autonomously for demonstration purposes.  No human coded any part of this game.

## License

This project is released under the MIT License.  See the [LICENSE](LICENSE) file for details.