// config numbers so i can balance this later
const CONFIG = {
    TOTAL_TIME: 30,
    MAX_STRESS: 100,
    STRESS_GAIN_IDLE: 0.15, // ambient anxiety gain
    STRESS_GAIN_HIT: 15, // ouch
    STRESS_HEAL_CLICK: 8, // dopamine hit
    FOCUS_GAIN: 0.2, // slow charge
    FOCUS_LOSS: 0.3, // fast drain, because adhd
    BRAIN_SPEED: 2.5,
    SPAWN_RATE: 1200
};

// global state object to track everything
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

// grab all the dom elements we need. organized by group so i dont lose my mind
const els = {
    nav: document.getElementById('main-nav'),
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

// setup listeners
document.getElementById('start-button').addEventListener('click', startGame);

// make all restart buttons work
document.querySelectorAll('.restart-btn').forEach(btn => {
    btn.addEventListener('click', startGame);
});

// quit game if escape is pressed
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && STATE.running) {
        endGame();
    }
});

// global mouse tracking for the physics
document.addEventListener('mousemove', (e) => {
    STATE.mouseX = e.clientX;
    STATE.mouseY = e.clientY;
});

// checking if user is actually focusing on the brain
els.brain.container.addEventListener('mouseenter', () => STATE.isHoveringBrain = true);
els.brain.container.addEventListener('mouseleave', () => STATE.isHoveringBrain = false);

// spa navigation logic. toggles hidden classes.
window.navigateTo = function(targetId) {
    // hide everything first
    Object.values(els.sections).forEach(sec => {
        sec.classList.add('hidden');
        sec.classList.remove('fade-active');
    });

    // show the one we want
    const target = document.getElementById(targetId);
    if (target) {
        target.classList.remove('hidden');
        setTimeout(() => target.classList.add('fade-active'), 10);
    }
}

// timer references
let gameLoopId, spawnLoopId;

// reset everything and start the chaos
function startGame() {
    STATE.running = true;
    STATE.timeLeft = CONFIG.TOTAL_TIME;
    STATE.stress = 0;
    STATE.focusLevel = 50; 
    STATE.combo = 0;
    STATE.distractionsCleared = 0;
    
    // hide nav while playing
    els.nav.classList.add('hidden');
    
    // reset brain position to center roughly
    STATE.brainPos = { 
        x: window.innerWidth/2 - 75,
        y: window.innerHeight/2 - 75,
        vx: Math.random() < 0.5 ? 2 : -2,
        vy: Math.random() < 0.5 ? 2 : -2
    };

    navigateTo('simulation-section');
    els.layer.innerHTML = ''; 

    // stop old loops if they exist
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    if (spawnLoopId) clearInterval(spawnLoopId);
    
    // go
    gameLoopId = requestAnimationFrame(update);
    spawnLoopId = setInterval(spawnDistraction, CONFIG.SPAWN_RATE);
}

// main game loop. runs every frame.
function update() {
    if (!STATE.running) return;

    // time ticks down
    STATE.timeLeft -= 0.016;
    els.hud.timer.innerText = STATE.timeLeft.toFixed(2);

    // handle movement
    moveBrain();
    updateTether();

    // handle mechanics
    if (STATE.isHoveringBrain) {
        // good: charging focus
        STATE.focusLevel = Math.min(100, STATE.focusLevel + CONFIG.FOCUS_GAIN);
        STATE.stress = Math.max(0, STATE.stress - 0.05);
        els.brain.status.innerText = "SIGNAL_LOCK";
        els.brain.status.style.color = "var(--neon-green)";
    } else {
        // bad: losing focus
        STATE.focusLevel = Math.max(0, STATE.focusLevel - CONFIG.FOCUS_LOSS);
        STATE.stress = Math.min(100, STATE.stress + CONFIG.STRESS_GAIN_IDLE);
        els.brain.status.innerText = "SIGNAL_LOST";
        els.brain.status.style.color = "var(--neon-red)";
    }

    updateVisuals();

    // check win/loss state
    if (STATE.timeLeft <= 0 || STATE.stress >= 100) {
        endGame();
    } else {
        requestAnimationFrame(update);
    }
}

// physics for the brain movement. bouncing dvd logo style basically.
function moveBrain() {
    // add some jitter to make it annoying
    if (Math.random() < 0.05) STATE.brainPos.vx += (Math.random() - 0.5) * 2;
    if (Math.random() < 0.05) STATE.brainPos.vy += (Math.random() - 0.5) * 2;

    // cap speed
    STATE.brainPos.vx = Math.max(-CONFIG.BRAIN_SPEED, Math.min(CONFIG.BRAIN_SPEED, STATE.brainPos.vx));
    STATE.brainPos.vy = Math.max(-CONFIG.BRAIN_SPEED, Math.min(CONFIG.BRAIN_SPEED, STATE.brainPos.vy));

    // apply velocity
    STATE.brainPos.x += STATE.brainPos.vx;
    STATE.brainPos.y += STATE.brainPos.vy;

    // wall bouncing
    if (STATE.brainPos.x <= 0 || STATE.brainPos.x >= window.innerWidth - 150) {
        STATE.brainPos.vx *= -1;
    }
    if (STATE.brainPos.y <= 0 || STATE.brainPos.y >= window.innerHeight - 150) {
        STATE.brainPos.vy *= -1;
    }

    els.brain.container.style.left = `${STATE.brainPos.x}px`;
    els.brain.container.style.top = `${STATE.brainPos.y}px`;
}

// draws the line between mouse and brain
function updateTether() {
    const brainCx = STATE.brainPos.x + 75; 
    const brainCy = STATE.brainPos.y + 75;

    els.brain.tether.setAttribute('x1', STATE.mouseX);
    els.brain.tether.setAttribute('y1', STATE.mouseY);
    els.brain.tether.setAttribute('x2', brainCx);
    els.brain.tether.setAttribute('y2', brainCy);
    
    // change line style if connected
    if (STATE.isHoveringBrain) {
        els.brain.tether.setAttribute('stroke', '#33ff33');
        els.brain.tether.setAttribute('stroke-dasharray', '0');
    } else {
        els.brain.tether.setAttribute('stroke', '#3b82f6');
        els.brain.tether.setAttribute('stroke-dasharray', '10,10');
    }
}

// updates the hud and visual effects (blur, saturation)
function updateVisuals() {
    els.hud.stressFill.style.width = `${STATE.stress}%`;

    // make screen blurry and grey when stressed
    const blurAmount = (STATE.stress / 100) * 8;
    const satAmount = 100 - (STATE.stress / 2);
    
    els.root.style.setProperty('--stress-blur', `${blurAmount}px`);
    els.root.style.setProperty('--stress-sat', `${satAmount}%`);

    // glitch overlay if you're dying
    if (STATE.stress > 80) {
        els.glitch.classList.remove('hidden');
    } else {
        els.glitch.classList.add('hidden');
    }

    // brain turns red if stressed
    const brainColor = STATE.stress > 60 ? '#ff3333' : '#3b82f6';
    els.brain.body.setAttribute('fill', brainColor);
}

// distraction thoughts pool
const THOUGHTS = [
    "DID_I_LOCK_DOOR?", "CHECK_DISCORD", "HUNGER_LEVEL_LOW", 
    "LEG_SHAKING", "EARWORM_DETECTED", "TASK_ABORT?", 
    "TEXT_MSG", "ITCH_DETECTED", "AUDIO_TOO_LOUD", 
    "BOREDOM", "HOMEWORK_MISSING", "SOCIAL_ANXIETY", 
    "FOCUS_ERROR", "EXECUTE_TASK"
];

// creates a red box you have to click
function spawnDistraction() {
    if (!STATE.running) return;
    
    // prevents crashing if too many pile up
    if (els.layer.children.length > 15) return;

    const el = document.createElement('div');
    el.className = 'distraction';
    el.innerText = THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)];
    
    const x = Math.random() * (window.innerWidth - 150);
    const y = Math.random() * (window.innerHeight - 50);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    // random chance to be a "sticky" one
    if (Math.random() > 0.8) el.classList.add('sticky');

    el.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        spawnParticles(e.clientX, e.clientY);
        el.remove();
        
        // reward for clicking
        STATE.stress = Math.max(0, STATE.stress - CONFIG.STRESS_HEAL_CLICK);
        STATE.distractionsCleared++;
        triggerCombo();
    });

    els.layer.appendChild(el);
}

// handles the combo counter ui
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

// visual pop when clicking a thought
function spawnParticles(x, y) {
    for (let i = 0; i < 8; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        p.style.backgroundColor = `hsl(${Math.random()*360}, 100%, 50%)`;
        document.body.appendChild(p);

        const destX = (Math.random() - 0.5) * 100;
        const destY = (Math.random() - 0.5) * 100;

        const animation = p.animate([
            { transform: 'translate(0,0) scale(1)', opacity: 1 },
            { transform: `translate(${destX}px, ${destY}px) scale(0)`, opacity: 0 }
        ], { 
            duration: 500, 
            easing: 'ease-out'
        });
        
        animation.onfinish = () => p.remove();
    }
}

// kill everything and show results
function endGame() {
    STATE.running = false;
    cancelAnimationFrame(gameLoopId);
    clearInterval(spawnLoopId);
    
    els.nav.classList.remove('hidden');

    navigateTo('summary-section');
    
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

    // fix the screen filters
    els.root.style.setProperty('--stress-blur', `0px`);
    els.root.style.setProperty('--stress-sat', `100%`);
    els.glitch.classList.add('hidden');
}