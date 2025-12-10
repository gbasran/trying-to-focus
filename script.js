// ==================== CONFIGURATION ====================
const CONFIG = {
    TOTAL_TIME: 30,
    MAX_STRESS: 100,
    // ADHD SIMULATION VALUES:
    STRESS_GAIN_IDLE: 0.15,    // Stress rises naturally (anxiety)
    STRESS_GAIN_HIT: 15,       // Penalty for missing mechanics
    STRESS_HEAL_CLICK: 8,      // Relief from clearing thoughts
    FOCUS_GAIN: 0.2,           // Speed of focus charging
    FOCUS_LOSS: 0.3,           // Speed of focus decay
    BRAIN_SPEED: 2.5,          // How fast the focus target moves
    SPAWN_RATE: 1200           // Milliseconds between thoughts
};

const STATE = {
    running: false,
    timeLeft: CONFIG.TOTAL_TIME,
    stress: 0,
    focusLevel: 0,
    mouseX: 0,
    mouseY: 0,
    brainPos: { x: window.innerWidth/2, y: window.innerHeight/2, vx: 1, vy: 1 },
    isHoveringBrain: false,
    combo: 0,
    distractionsCleared: 0
};

// ==================== DOM ELEMENTS ====================
const els = {
    nav: document.getElementById('main-nav'),
    // Group all content sections for navigation
    sections: {
        intro: document.getElementById('intro-section'),
        sim: document.getElementById('simulation-section'),
        summary: document.getElementById('summary-section'),
        drift: document.getElementById('edu-drift'),
        myth: document.getElementById('edu-myth'),
        coping: document.getElementById('edu-coping')
    },
    brain: { 
        container: document.getElementById('brain-container'),
        svg: document.getElementById('brian-the-brain'),
        body: document.getElementById('brain-body'),
        status: document.getElementById('focus-status'),
        tether: document.getElementById('tether-line')
    },
    hud: {
        timer: document.getElementById('timer'),
        stressFill: document.getElementById('stress-fill'),
        combo: document.getElementById('combo-display'),
        comboCount: document.getElementById('combo-count')
    },
    layer: document.getElementById('distraction-layer'),
    glitch: document.getElementById('screen-glitch'),
    root: document.documentElement
};

// ==================== INITIALIZATION ====================
document.getElementById('start-button').addEventListener('click', startGame);

// Bind all restart buttons (intro, summary, and nav bar)
document.querySelectorAll('.restart-btn').forEach(btn => {
    btn.addEventListener('click', startGame);
});

// ESCAPE KEY LISTENER
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && STATE.running) {
        endGame();
    }
});

// Capture global mouse movement for physics
document.addEventListener('mousemove', (e) => {
    STATE.mouseX = e.clientX;
    STATE.mouseY = e.clientY;
});

// Brain interaction listeners
els.brain.container.addEventListener('mouseenter', () => STATE.isHoveringBrain = true);
els.brain.container.addEventListener('mouseleave', () => STATE.isHoveringBrain = false);

// ==================== NAVIGATION SYSTEM ====================
// This function handles the SPA (Single Page Application) switching logic
window.navigateTo = function(targetId) {
    // 1. Hide all sections
    Object.values(els.sections).forEach(sec => {
        sec.classList.add('hidden');
        sec.classList.remove('fade-active');
    });

    // 2. Show target section
    const target = document.getElementById(targetId);
    if (target) {
        target.classList.remove('hidden');
        // Small delay to trigger CSS transition
        setTimeout(() => target.classList.add('fade-active'), 10);
    }
}

// ==================== GAME LOOP ====================
let gameLoopId, spawnLoopId;

function startGame() {
    STATE.running = true;
    STATE.timeLeft = CONFIG.TOTAL_TIME;
    STATE.stress = 0;
    STATE.focusLevel = 50; // Start at 50%
    STATE.combo = 0;
    STATE.distractionsCleared = 0;
    
    // Hide Nav during game
    els.nav.classList.add('hidden');
    
    // Reset Physics Position
    STATE.brainPos = { x: window.innerWidth/2 - 75, y: window.innerHeight/2 - 75, vx: Math.random() < 0.5 ? 2 : -2, vy: Math.random() < 0.5 ? 2 : -2 };

    // Switch to Sim View
    navigateTo('simulation-section');
    els.layer.innerHTML = ''; 

    // Start loops
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    if (spawnLoopId) clearInterval(spawnLoopId);
    
    gameLoopId = requestAnimationFrame(update);
    spawnLoopId = setInterval(spawnDistraction, CONFIG.SPAWN_RATE);
}

function update() {
    if (!STATE.running) return;

    // 1. Time Management
    STATE.timeLeft -= 0.016;
    els.hud.timer.innerText = STATE.timeLeft.toFixed(2);

    // 2. Physics & Mechanics
    moveBrain();
    updateTether();

    if (STATE.isHoveringBrain) {
        // Charging Focus
        STATE.focusLevel = Math.min(100, STATE.focusLevel + CONFIG.FOCUS_GAIN);
        STATE.stress = Math.max(0, STATE.stress - 0.05); // Focus reduces stress
        els.brain.status.innerText = "SIGNAL_LOCK";
        els.brain.status.style.color = "var(--neon-green)";
    } else {
        // Losing Focus / Distracted
        STATE.focusLevel = Math.max(0, STATE.focusLevel - CONFIG.FOCUS_LOSS);
        STATE.stress = Math.min(100, STATE.stress + CONFIG.STRESS_GAIN_IDLE);
        els.brain.status.innerText = "SIGNAL_LOST";
        els.brain.status.style.color = "var(--neon-red)";
    }

    // 3. Visual Updates
    updateVisuals();

    // 4. End Condition
    if (STATE.timeLeft <= 0 || STATE.stress >= 100) {
        endGame();
    } else {
        requestAnimationFrame(update);
    }
}

// ==================== PHYSICS ENGINE: THE DRIFT ====================
function moveBrain() {
    // Add randomness to velocity (simulating wandering attention)
    if (Math.random() < 0.05) STATE.brainPos.vx += (Math.random() - 0.5) * 2;
    if (Math.random() < 0.05) STATE.brainPos.vy += (Math.random() - 0.5) * 2;

    // Cap velocity
    STATE.brainPos.vx = Math.max(-CONFIG.BRAIN_SPEED, Math.min(CONFIG.BRAIN_SPEED, STATE.brainPos.vx));
    STATE.brainPos.vy = Math.max(-CONFIG.BRAIN_SPEED, Math.min(CONFIG.BRAIN_SPEED, STATE.brainPos.vy));

    // Apply Velocity
    STATE.brainPos.x += STATE.brainPos.vx;
    STATE.brainPos.y += STATE.brainPos.vy;

    // Bounce off walls
    if (STATE.brainPos.x <= 0 || STATE.brainPos.x >= window.innerWidth - 150) STATE.brainPos.vx *= -1;
    if (STATE.brainPos.y <= 0 || STATE.brainPos.y >= window.innerHeight - 150) STATE.brainPos.vy *= -1;

    // Apply to DOM
    els.brain.container.style.left = `${STATE.brainPos.x}px`;
    els.brain.container.style.top = `${STATE.brainPos.y}px`;
}

function updateTether() {
    const brainCx = STATE.brainPos.x + 75; // +75 is half width
    const brainCy = STATE.brainPos.y + 75;

    els.brain.tether.setAttribute('x1', STATE.mouseX);
    els.brain.tether.setAttribute('y1', STATE.mouseY);
    els.brain.tether.setAttribute('x2', brainCx);
    els.brain.tether.setAttribute('y2', brainCy);
    
    // Tether snaps color based on connection status
    els.brain.tether.setAttribute('stroke', STATE.isHoveringBrain ? '#33ff33' : '#3b82f6');
    els.brain.tether.setAttribute('stroke-dasharray', STATE.isHoveringBrain ? '0' : '10,10');
}

// ==================== VISUAL FX ENGINE ====================
function updateVisuals() {
    // Stress Bar
    els.hud.stressFill.style.width = `${STATE.stress}%`;

    // Dynamic Visual Noise (Blur/Desaturate based on stress)
    const blurAmount = (STATE.stress / 100) * 8; // Max 8px blur
    const satAmount = 100 - (STATE.stress / 2); // Drops saturation
    
    els.root.style.setProperty('--stress-blur', `${blurAmount}px`);
    els.root.style.setProperty('--stress-sat', `${satAmount}%`);

    // Glitch Overlay at high stress
    if (STATE.stress > 80) els.glitch.classList.remove('hidden');
    else els.glitch.classList.add('hidden');

    // Brain Color Shift
    const brainColor = STATE.stress > 60 ? '#ff3333' : '#3b82f6';
    els.brain.body.setAttribute('fill', brainColor);
}

// ==================== DISTRACTION SYSTEM ====================
// No emojis, system style text
const THOUGHTS = ["DID_I_LOCK_DOOR?", "CHECK_DISCORD", "HUNGER_LEVEL_LOW", "LEG_SHAKING", "EARWORM_DETECTED", "TASK_ABORT?", "TEXT_MSG", "ITCH_DETECTED", "AUDIO_TOO_LOUD", "BOREDOM", "HOMEWORK_MISSING", "SOCIAL_ANXIETY", "FOCUS_ERROR", "EXECUTE_TASK"];

function spawnDistraction() {
    if (!STATE.running) return;
    
    // Limit max distractions to prevent crash
    if (els.layer.children.length > 15) return;

    const el = document.createElement('div');
    el.className = 'distraction';
    el.innerText = THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)];
    
    // Random Position (avoiding edges)
    const x = Math.random() * (window.innerWidth - 150);
    const y = Math.random() * (window.innerHeight - 50);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    // Randomly make some "Sticky" (Harder to process)
    if (Math.random() > 0.8) el.classList.add('sticky');

    el.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        spawnParticles(e.clientX, e.clientY);
        el.remove();
        
        // Mechanic: Clearing thoughts heals stress
        STATE.stress = Math.max(0, STATE.stress - CONFIG.STRESS_HEAL_CLICK);
        STATE.distractionsCleared++;
        triggerCombo();
    });

    els.layer.appendChild(el);
}

function triggerCombo() {
    STATE.combo++;
    els.hud.combo.classList.remove('hidden');
    els.hud.comboCount.innerText = STATE.combo;
    
    clearTimeout(STATE.comboTimer);
    STATE.comboTimer = setTimeout(() => {
        STATE.combo = 0;
        els.hud.combo.classList.add('hidden');
    }, 1500);
}

// ==================== PARTICLE SYSTEM ====================
function spawnParticles(x, y) {
    for (let i = 0; i < 8; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        // Random neon colors
        p.style.backgroundColor = `hsl(${Math.random()*360}, 100%, 50%)`;
        document.body.appendChild(p);

        const destX = (Math.random() - 0.5) * 100;
        const destY = (Math.random() - 0.5) * 100;

        // Animate and remove
        p.animate([
            { transform: 'translate(0,0) scale(1)', opacity: 1 },
            { transform: `translate(${destX}px, ${destY}px) scale(0)`, opacity: 0 }
        ], { duration: 500, easing: 'ease-out' }).onfinish = () => p.remove();
    }
}

// ==================== END GAME LOGIC ====================
function endGame() {
    STATE.running = false;
    cancelAnimationFrame(gameLoopId);
    clearInterval(spawnLoopId);
    
    // REVEAL NAVIGATION BAR
    els.nav.classList.remove('hidden');

    // Show Summary Section
    navigateTo('summary-section');
    
    // Calculate & Display Stats
    const finalFocus = Math.floor(STATE.focusLevel);
    document.getElementById('final-focus').innerText = finalFocus + "%";
    document.getElementById('final-distractions').innerText = STATE.distractionsCleared;
    
    const msg = document.getElementById('end-message');
    if (STATE.stress >= 100) {
        msg.innerText = "STATUS: SENSORY_OVERLOAD";
        msg.style.color = "var(--neon-red)";
    } else {
        msg.innerText = "STATUS: COMPLETE";
        msg.style.color = "var(--neon-green)";
    }

    // Reset Visual Filters
    els.root.style.setProperty('--stress-blur', `0px`);
    els.root.style.setProperty('--stress-sat', `100%`);
    els.glitch.classList.add('hidden');
}