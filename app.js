const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Load the background image
const backgroundImage = new Image();
backgroundImage.src = './assets/background.jpg'; // Ensure this path is correct

const PLAYER_WIDTH = 75;
const PLAYER_HEIGHT = 75;
const TOY_RADIUS = 20;
const GAME_SPEED_DEFAULT = 5;
const ZOOM_EFFECT_DURATION = 7000; // Increased duration for slower animations

const backgroundMusic = document.getElementById('backgroundMusic');
const collectSound = document.getElementById('collectSound');
const missSound = document.getElementById('missSound');
const winningSound = document.getElementById('winningSound');

let player = {
    x: canvas.width / 2 - PLAYER_WIDTH / 2,
    y: canvas.height - 100,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    speed: GAME_SPEED_DEFAULT,
    image: new Image()
};

player.image.src = './assets/player.png'; // Ensure this path is correct

let toys = []; // Array to hold multiple toys
const TOY_COUNT = 3; // Number of toys to spawn at a time

let score = 0;
let highScore = 0;
let isGameRunning = false;
let isPaused = false;
let timer;
let remainingTime;
let keys = {};
let collectKey = ' ';

let isCtrlPressed = false;
const SPEED_BOOST_DURATION = 5000; // 5 seconds speed boost duration


function initializeToys() {
    toys = []; // Clear the toys array
    for (let i = 0; i < TOY_COUNT; i++) {
        toys.push(createToy());
    }
}

function createToy() {
    const color = getRandomNonBlueColor(); // Get a non-blue color
    const toy = {
        x: Math.random() * (canvas.width - TOY_RADIUS * 2) + TOY_RADIUS,
        y: Math.random() * (canvas.height - TOY_RADIUS * 2) + TOY_RADIUS,
        radius: TOY_RADIUS,
        color: color,
        isVisible: true,
        isMovingBack: false,
        startTime: Date.now(),
        scale: 1
    };
    return toy;
}


function drawBackground() {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
}

function drawPlayer() {
    if (!isGameRunning) return;
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.scale(keys['ArrowRight'] ? -1 : 1, 1);
    ctx.drawImage(player.image, -player.width / 2, -player.height / 2, player.width, player.height);
    ctx.restore();
}

function drawToys() {
    toys.forEach(toy => {
        if (toy.isVisible) {
            ctx.fillStyle = toy.color;
            const scaledRadius = toy.radius * toy.scale;
            ctx.beginPath();
            ctx.arc(toy.x, toy.y, scaledRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function clearCanvas() {
    drawBackground();
}

function update() {
    clearCanvas();
    drawPlayer();
    if (isPaused) return;
    drawToys();
    movePlayer();
    
    // Check if the collect key is pressed
    if (keys[collectKey]) {
        collectToys();
    }
    
    toys.forEach(toy => {
        if (toy.isVisible) {
            const currentTime = Date.now();
            const elapsed = currentTime - toy.startTime;
            if (toy.isMovingBack) {
                updateToyMovementBack(toy, elapsed);
            } else {
                updateToyMovementForward(toy, elapsed);
            }
        }
    });
    checkCollision();
    checkGameStatus();
}

let isTimerRunning = false; // Add this variable to your global scope

function collectToys() {
    toys.forEach((toy, index) => {
        if (toy.isVisible) {
            const dx = player.x + player.width / 2 - toy.x;
            const dy = player.y + player.height / 2 - toy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < (player.width / 2 + toy.radius)) {
                score++;
                document.getElementById('scoreboard').innerText = `Score: ${score}`;
                toy.isVisible = false;

                // Play the collecting sound effect
                if (collectSound) {
                    collectSound.currentTime = 0; // Reset sound to the beginning
                    collectSound.play().catch(error => console.error("Sound playback error:", error)); // Catch any errors
                }

                // Instead of calling spawnToy() here, just set the toy to invisible and manage respawning
                setTimeout(() => spawnToy(toy), 1000); // Respawn after a brief delay
            }
        }
    });
}

function displayInstructions() {
    const instructions = document.getElementById('instructions');
    instructions.innerText = "Use arrow keys to move the player. Press 'ctrl' for speedboost!";
}

function updateToyMovementForward(toy, elapsed) {
    const fraction = Math.min(elapsed / ZOOM_EFFECT_DURATION, 1);
    const easing = fraction * fraction * (3 - 2 * fraction); // Easing function for smooth acceleration
    toy.x += (toy.targetX - toy.x) * easing;
    toy.y += (toy.targetY - toy.y) * easing;
    toy.scale = 1 - (0.5 - 1) * easing;
    if (fraction === 1) {
        toy.isMovingBack = true;
        toy.startTime = Date.now();
        toy.targetX = Math.random() < 0.5 ? 0 : canvas.width;
        toy.targetY = Math.random() * (canvas.height - toy.radius * 2) + toy.radius;
    }
}

function updateToyMovementBack(toy, elapsed) {
    const fraction = Math.min(elapsed / ZOOM_EFFECT_DURATION, 1);
    const easing = fraction * fraction * (3 - 2 * fraction); // Easing function for smooth deceleration
    toy.x += (toy.targetX - toy.x) * easing;
    toy.y += (toy.targetY - toy.y) * easing;
    toy.scale = 1 + (0.5 - 1) * easing;
    
    if (fraction === 1) {
        toy.isVisible = false;
        spawnToy(toy);
        
        // Play the miss sound effect when the toy goes out of bounds
        if (missSound) {
            missSound.currentTime = 0; // Reset sound to the beginning
            missSound.play().catch(error => console.error("Sound playback error:", error)); // Catch any errors
        }
    }
}



function checkCollision() {
    toys.forEach(toy => {
        const dx = player.x + player.width / 2 - toy.x;
        const dy = player.y + player.height / 2 - toy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < (player.width / 2 + toy.radius) && toy.isVisible) {
            collectToys(); // Call the collect function to handle collection logic
        }
    });
}
function movePlayer() {
    if (isPaused) return;
    player.speed = parseInt(document.getElementById('speedControl').value, 10);

    // Apply speed boost if "Ctrl" is pressed
    if (isCtrlPressed) {
        player.speed *= 2; // Double the player's speed
    }

    if (keys['ArrowUp'] && player.y > 0) player.y -= player.speed;
    if (keys['ArrowDown'] && player.y < canvas.height - player.height) player.y += player.speed;
    if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
    if (keys['ArrowRight'] && player.x < canvas.width - player.width) player.x += player.speed;
}

function applySpeedBoost() {
    // Reset player's speed after the duration
    setTimeout(() => {
        player.speed = GAME_SPEED_DEFAULT; // Reset to default speed
    }, SPEED_BOOST_DURATION);
}


function gameLoop() {
    if (isGameRunning) {
        update();
        requestAnimationFrame(gameLoop);
    }
}

function spawnToy(toy) {
    const edge = Math.floor(Math.random() * 4);
    switch (edge) {
        case 0:
            toy.x = Math.random() * canvas.width;
            toy.y = 0;
            break;
        case 1:
            toy.x = canvas.width;
            toy.y = Math.random() * canvas.height;
            break;
        case 2:
            toy.x = Math.random() * canvas.width;
            toy.y = canvas.height;
            break;
        case 3:
            toy.x = 0;
            toy.y = Math.random() * canvas.height;
            break;
    }
    toy.targetX = Math.random() * (canvas.width - toy.radius * 2) + toy.radius;
    toy.targetY = Math.random() * (canvas.height - toy.radius * 2) + toy.radius;
    toy.isVisible = true;
    toy.isMovingBack = false;
    toy.startTime = Date.now();
    toy.scale = 1;

    toy.color = getRandomNonBlueColor();
    
}

function getRandomNonBlueColor() {
    const colors = ['red', 'green', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'magenta'];
    return colors[Math.floor(Math.random() * colors.length)];
}



function playAgain() {
    // Hide the message box
    document.getElementById('messageBox').style.display = 'none';

    // Reset the game state
    score = 0;
    remainingTime = parseInt(document.getElementById('timeSelector').value, 10);  // Reset time based on initial value

    // Update displays for score and time
    document.getElementById('scoreboard').innerText = `Score: ${score}`;
    document.getElementById('timer').innerText = `Time: ${remainingTime}`;

    // Reset player position
    player.x = canvas.width / 2 - PLAYER_WIDTH / 2;
    player.y = canvas.height - 100;

    // Hide and show relevant buttons
    document.getElementById('startButton').style.display = 'block';
    document.getElementById('pauseButton').style.display = 'none';
    document.getElementById('restartButton').style.display = 'none';

    // Reset toy visibility
    toys.forEach(toy => toy.isVisible = false);

    // Clear timer
    clearInterval(timer);
    timer = null; // Set timer to null

    // Optional: clear the canvas to reset visuals
    clearCanvas();
    drawPlayer();
}
function changeVolume(volume) {
    backgroundMusic.volume = volume / 100;
}

function startTimer() {
    if (timer) return; // Prevent starting a new timer if it already exists

    timer = setInterval(() => {
        if (remainingTime > 0) {
            remainingTime--;
            document.getElementById('timer').innerText = `Time: ${remainingTime}`;
        } else {
            clearInterval(timer); // Clear the timer once time is up
            timer = null; // Set timer to null
            checkGameStatus(); // Call to check game status
        }
    }, 1000); // Update every second
}

function togglePause() {
    if (isPaused) {
        isPaused = false;
        backgroundMusic.play(); // Resume music
        gameLoop(); // Restart the game loop
        document.getElementById('pauseButton').innerText = 'Pause';
    } else {
        isPaused = true;
        backgroundMusic.pause(); // Pause music
        clearInterval(timer); // Stop the timer
        document.getElementById('pauseButton').innerText = 'Resume';
    }
}   

function pauseGame() {
    console.log("Game Paused");
    
    // Clear the existing timer
    clearInterval(timer);
    timer = null; // Set timer to null

    // Pause the background music
    if (backgroundMusic) {
        backgroundMusic.pause(); // Pause the music
    }

    // Update UI to indicate the game is paused
    document.getElementById('pauseButton').style.display = 'none'; // Hide pause button
    document.getElementById('restartButton').style.display = 'block'; // Show restart button
    document.getElementById('startButton').style.display = 'block'; // Show start button

    // Set game running state to false
    isGameRunning = false;
}

function resumeGame() {
    isPaused = false;
    document.getElementById('pauseButton').innerText = 'Pause';
}


// Event Listeners
document.getElementById('startButton').addEventListener('click', startGame);
document.getElementById('pauseButton').addEventListener('click', () => {
    isPaused ? resumeGame() : pauseGame();
});
document.getElementById('restartButton').addEventListener('click', restartGame);
document.getElementById('playAgainButton').addEventListener('click', playAgain);

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === 'Control') {
        isCtrlPressed = true;
        applySpeedBoost();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    if (e.key === 'Control') {
        isCtrlPressed = false; // Reset when Ctrl is released
    }
});



const volumeControl = document.getElementById('volumeControl');
backgroundMusic.volume = volumeControl.value / 100; // Set volume on load

// Listen for volume slider changes
volumeControl.addEventListener('input', (event) => {
    backgroundMusic.volume = event.target.value / 100;
});


function startGame() {
    document.getElementById('startButton').style.display = 'none';
    document.getElementById('pauseButton').style.display = 'block';
    document.getElementById('restartButton').style.display = 'block';

    // Start background music when the game starts

    // Game initialization code
    score = 0;
    remainingTime = parseInt(document.getElementById('timeSelector').value, 10);
    isGameRunning = true;
    isPaused = false;
    
    // Resetting the timer
    clearInterval(timer); // Clear any existing timer
    timer = null; // Set timer to null
    startTimer(); // Start the timer

    document.getElementById('scoreboard').innerText = `Score: ${score}`;
    document.getElementById('timer').innerText = `Time: ${remainingTime}`;

    if (backgroundMusic) {
        backgroundMusic.muted = false; // Unmute the music
        backgroundMusic.play();
    }

    initializeToys();
    toys.forEach(toy => spawnToy(toy));
    gameLoop();
}



// Restart game function
function restartGame() {
    // Reset game state variables
    
    score = 0;
    remainingTime = parseInt(document.getElementById('timeSelector').value, 10); // Reset time

    // Update displays for score and time
    document.getElementById('scoreboard').innerText = `Score: ${score}`;
    document.getElementById('timer').innerText = `Time: ${remainingTime}`;

    // Reset player position
    player.x = canvas.width / 2 - PLAYER_WIDTH / 2;
    player.y = canvas.height - 100;

    // Clear the canvas
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Reset or hide all toys or elements on the canvas
    toys.forEach(toy => {
        toy.isVisible = false; // Or remove toys if you have a removal method
    });

    // Hide pause and restart buttons, show start button
    document.getElementById('pauseButton').style.display = 'none';
    document.getElementById('restartButton').style.display = 'none';
    document.getElementById('startButton').style.display = 'block';

    if (backgroundMusic) {
        backgroundMusic.muted = true; // Mute the music
        backgroundMusic.currentTime = 0; // Reset music to the start
    }


    // Clear the existing timer
    clearInterval(timer);
    timer = null; // Set timer to null

    // Game is no longer running
    isGameRunning = false;
}




// Check game status function
function checkGameStatus() {
    if (remainingTime <= 0) {
        // Game over logic
        isGameRunning = false;
        backgroundMusic.pause(); // Stop background music

        // Play the winning sound if a winning condition is met
        if (score > highScore) {
            highScore = score; // Update high score
            if (winningSound) {
                winningSound.currentTime = 0; // Reset sound to the beginning
                winningSound.play().catch(error => console.error("Sound playback error:", error));
            }
        }
        
        // Show the game over message box
        document.getElementById('messageBox').style.display = 'block';
        document.getElementById('messageText').innerText = `Game Over! Your Score: ${score}`;
        
        // Show the Play Again button
        document.getElementById('playAgainButton').style.display = 'block';
    }
}



// Function to start background music
function startBackgroundMusic() {
    backgroundMusic.volume = 0.5; // Set volume to 50% (adjust as needed)
    backgroundMusic.play(); // Play the background music
}

// Function to play collect sound
function playCollectSound() {
    collectSound.currentTime = 0; // Rewind to start
    collectSound.play(); // Play the collect sound
}

// Function to play miss sound
function playMissSound() {
    missSound.currentTime = 0; // Rewind to start
    missSound.play(); // Play the miss sound
}

// Example function to check toy collection
function checkToyCollection(player, toy) {
    if (!player.collectsToy(toy)) { // Replace with your actual condition
        playMissSound(); // Play the miss sound when the player misses the toy
    } else {
        playCollectSound(); // Play the collect sound if the toy is collected
    }
}

// Start the background music when the game begins
startBackgroundMusic();

