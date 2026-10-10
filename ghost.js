const game = document.getElementById("game");
const ghost = document.getElementById("ghost");
const player = document.getElementById("player");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const timerText = document.getElementById("timer");
const finalScore = document.getElementById("finalScore");

// Shotgun parts
const gunEl = document.getElementById("gun");           // the gun the player holds
const gunInner = document.getElementById("gunInner");
const pickup = document.getElementById("pickup");       // the gun lying on the map
const pickupInner = document.getElementById("pickupInner");
const ghostHpBar = document.getElementById("ghostHp");
const ghostHpFill = document.getElementById("ghostHpFill");
const hud = document.getElementById("hud");
const ammoEl = document.getElementById("ammo");
const reloadText = document.getElementById("reloadText");
const toastEl = document.getElementById("toast");
const fireBtn = document.getElementById("fire");
const reloadBtn = document.getElementById("reload");

// If the HTML is missing any gun part (old ghost.html), the game still runs, just without the gun
const GUN_OK = [gunEl, gunInner, pickup, pickupInner, ghostHpBar, ghostHpFill,
                hud, ammoEl, reloadText, toastEl, fireBtn, reloadBtn, overlayTitle].every(Boolean);

// ---------- Pixel art characters (2D sprites) ----------
// Each letter is a colour and "." is empty. Change the letters or the colours to redraw a character!
function pixelArt(rows, colors) {
    let rects = "";
    rows.forEach((row, y) => {
        let x = 0;
        while (x < row.length) {
            const ch = row[x];
            if (ch === ".") { x++; continue; }
            let end = x;
            while (end + 1 < row.length && row[end + 1] === ch) end++;      // join same-colour pixels in a row
            rects += `<rect x="${x}" y="${y}" width="${end - x + 1}" height="1" fill="${colors[ch]}"/>`;
            x = end + 1;
        }
    });
    return `<svg viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges">${rects}</svg>`;
}

const GHOST_ART = pixelArt([
    "....KKKKKKK....",
    "...KHHHHHHHK...",
    "..KHHHHHHHHHK..",
    ".SKHSHHHHHSHKS.",
    ".SKSSSHHHSSSKS.",
    "..KSHHSSSHHSK..",
    "..KSRRSSSRRSK..",
    "..KSSSSsSSSSK..",
    "..KSSKKKKKSSK..",
    "...KSWKKKWSK...",
    "....KBSSSBSK...",
    "..KCCcWWWWWcCK.",
    ".KCCCcWGWcCCCK.",
    ".KCCCDcWcDCCCK.",
    "KCCKCCDDDCCKCCK",
], { K: "#0b0710", H: "#2b2140", S: "#e8e0ee", s: "#b9aec8", R: "#ff2020", W: "#ffffff", B: "#d00020", C: "#b3142f", D: "#5a0a1c", c: "#1b0610", G: "#ffd23f" });   // the vampire lord

const PLAYER_ART = pixelArt([
    "......KKK......",
    ".....KGGGK.....",
    "....KGGGGGK....",
    "...KGBBBBBGK...",
    "..KGBBBBBBBGK..",
    "..KGBEEBEEBGK..",
    "..KGBBBBBBBGK..",
    "..KGBTBTBTBGK..",
    "..KGGBBBBBGGK..",
    ".KGGGGGXGGGGGKW",
    ".KGgGGXXXGGgGKW",
    ".KGGGGGXGGGGGKW",
    ".KGGGGGXGGGGGKW",
    "KGGGGGGXGGGGGKP",
    "KKKKKKKKKKKKKKK",
], { K: "#0b0710", G: "#3a4152", g: "#59627a", B: "#05060a", E: "#c9fbff", T: "#dcdcea", X: "#dfe2ee", W: "#a0693a", P: "#ead6ac" });   // the hooded vampire hunter

const DEAD_ART = pixelArt([
    "...............",
    "...............",
    "....KKKKKKK....",
    "..KKWWWWWWWKK..",
    ".KWWWWWWWWWWWK.",
    ".KWWWWWWWWWWWK.",
    ".KWKKKWWWKKKWK.",
    ".KWKKKWWWKKKWK.",
    ".KWWKKWWWKKWWK.",
    "..KWWWWKWWWWK..",
    "...KWWWWWWWK...",
    "....KWKWKWKWK..",
    "....KKKKKKKKK..",
    "...............",
    "...............",
], { K: "#0b0710", W: "#f0f0f0", w: "#c8c8d4" });   // the hunter after he dies

const BAT_ART = pixelArt([
    "K.............K",
    "KK....K.K....KK",
    "KPK..KPPPK..KPK",
    "KPPKKKPPPKKKPPK",
    "KPPPPKRPRKPPPPK",
    ".KPPPKWPWKPPPK.",
    "..KKPPKKKPPKK..",
    "....KK.K.KK....",
], { K: "#0b0710", P: "#4a2a7a", R: "#ff2a2a", W: "#ffffff" });   // bats

ghost.innerHTML = GHOST_ART;
player.innerHTML = PLAYER_ART;

const SIZE = 45;                              // emoji size
const MAX = game.clientWidth - SIZE;          // keep everything inside the box
const PLAYER_SPEED = 220;                     // pixels per second
const GHOST_START = 55;                       // ghost speed at the start (pixels per second)
const GHOST_MAX = 150;                        // ghost never gets faster than this (you can still outrun it)
const SPEED_UP = 2.5;                         // ghost gets this much faster every second
const DASH_EVERY = 8;                         // seconds between dashes

// After 20 seconds the ghost gets ANGRY (harder)
const HARD_TIME = 20;
// BOSS FIGHT: the boss bar shows (immune) from BOSS_BAR_TIME. At PHASE2_TIME the VAMPIRE LORD wakes up: 500 HP, slow walk, patterned fire attacks, bat form
const BOSS_BAR_TIME = 30;                     // the (greyed out, immune) boss bar appears
const PHASE2_TIME = 40;                       // seconds until phase 2
const BOSS_NAME = "GHOST, LORD OF THE GRAVEYARD";
const BOSS_HP = 500;                          // boss health
const BOSS_SPEED = 55;                        // boss walk speed (slow, like a big Elden Ring boss)
const BOSS_REST = 1.1;                        // seconds the boss walks between attacks (your chance to shoot)
const BOSS_REST_RAGE = 0.6;                   // ...shorter once enraged
const BOSS_RAGE_AT = 0.5;                     // enraged below 50% HP: faster, bigger attacks
const BOSS_P3_AT = 0.15;                      // PHASE 3 "final form" below 15% HP (75 HP)
const BOSS_REST_P3 = 0.4;                     // in the final form he barely rests...
const BOSS_REST_BLOOD = 1.8;                  // ...except after Blood Moon: a breather to shoot him
const FIRE_SPEED = 170;                       // base speed of fire balls
const METEOR_RADIUS = 46;                     // explosion size
const BEAM_LEN = 400;                         // fire beam length
const BEAM_SPEED = 1.7;                       // (single beam sweep speed)
const CROSS_SPEED = 1.0;                      // how fast the 4-arm cross spins
const BEAM_HALF = 24;                         // beam width for hit checks
const SLAM_RADIUS = 110;                      // fire slam size
const SLAM_IF_CLOSER = 85;                    // if you hug the boss it slams you away

// Boss attack list. wind = warning time, dur = how long the boss is busy, still = stands still while attacking
const ATK = {
    spiral:  { wind: 0.8, dur: 2.7, still: true  },
    rings:   { wind: 0.7, dur: 2.6, still: true  },
    wall:    { wind: 0.7, dur: 3.2, still: false },
    meteors: { wind: 0.6, dur: 3.2, still: false },
    cross:   { wind: 1.0, dur: 3.0, still: true  },
    slam:    { wind: 1.0, dur: 1.0, still: true  },
    blood:   { wind: 1.1, dur: 4.2, still: true  }          // phase 3 only
};
const PATTERN      = ["spiral", "rings", "wall", "meteors", "cross"];            // the boss ALWAYS attacks in this order: learn it!
const PATTERN_RAGE = ["rings", "wall", "spiral", "cross", "meteors", "wall"];    // enraged order
const PATTERN_P3 = ["blood", "wall", "cross", "meteors", "spiral", "blood"];     // final form order

// Bat form: at these HP fractions the boss turns into bats. Shoot them all to bring him back (and stagger him)
const BAT_FORM_AT = [0.7, 0.35];
const BAT_FORM_COUNT = 5;                     // bats you must shoot
const BAT_FORM_TIME = 14;                     // if you are too slow he turns back, heals and punishes you
const BAT_FORM_SPEED = 190;                   // bats flutter speed
const BAT_DIVE_SPEED = 340;                   // bat dive speed
const BAT_HEAL = 40;                          // HP he heals if you are too slow
const BAT_STAGGER = 2.5;                      // seconds he is stunned when you kill all bats
const STAGGER_MULT = 1.5;                     // damage bonus while he is stunned
const BOSS_REACH = 22.5;                       // the boss is BIGGER: it catches you from further away
const HARD_SPEED_BONUS = 30;                  // extra speed at the moment it turns angry
const HARD_RAMP = 4;                          // gets this much faster every second after 20s
const HARD_MAX = 260;                         // top speed. You run at 220, so it WILL catch you
const HARD_DASH_EVERY = 3;                    // dashes very often
const HARD_WARN_TIME = 0.35;                  // very little warning before a dash
const HARD_DASH_TIME = 0.5;                   // longer dash
const HARD_STUN_TIME = 0.5;                   // shotgun freezes it for less time

// Angry ghost special skills (it picks one every few seconds)
const HARD_SKILL_EVERY = 2.5;                 // seconds between skills
const SKILLS = ["teleport", "fireballs", "pulse", "obstacles", "decoys", "lightning", "pull"];
const CAST_TIME = { teleport: 0.8, fireballs: 0.55, pulse: 0.8, obstacles: 0.9, bats: 0.5,
                    decoys: 0.6, lightning: 0.9, pull: 1.4 };   // warning time before each skill
const ORB_COUNT = 3;                          // fireballs per cast
const ORB_SPEED = 170;                        // fireball speed (pixels per second)
const SLOW_TIME = 1.5;                        // a fireball slows you for this long
const SLOW_FACTOR = 0.45;                     // ...to this fraction of your speed
const PULSE_RADIUS = 170;                     // scare pulse size (pixels)
const CONFUSE_TIME = 2.5;                     // reversed controls for this long

// New skills
const DECOY_COUNT = 3;                        // DECOYS: fake ghosts that chase you...
const DECOY_SPEED = 125;                      // ...at this speed (pixels per second)...
const DECOY_LIFE = 3;                         // ...for this many seconds. Touching one slows you
const BOLT_COUNT = 4;                         // LIGHTNING: strikes per cast (one lands near where you are heading)
const BOLT_RADIUS = 36;                       // size of each strike circle (pixels)
const PULL_RADIUS = 260;                      // VORTEX: the ghost pulls you in if you are inside this circle
const PULL_SPEED = 130;                       // pull strength (pixels per second). Walking away is faster, a dash breaks free

// Bats skill: the ghost calls bats that chase you. It has its own timer (not part of the random skills)
const BAT_EVERY = 10;                         // seconds between bat attacks
const BAT_LIFE = 2;                           // bats disappear after this many seconds
const BAT_SPEED = 190;                        // bat speed (pixels per second)
const BAT_COUNT = 3;                          // bats per attack...
const BAT_COUNT_ANGRY = 6;                    // ...and after 20 seconds
const BAT_DEADLY = false;                     // true = a bat touching you is game over (false = it slows you)

// Obstacles skill: tombstones appear and block you. Every time it is used the level goes up:
// easy -> medium -> hard (and stays hard). It can happen at any time, even before 20 seconds.
const EARLY_SKILL_EVERY = 10;                 // before 20s the ghost only uses obstacles, this often
const OB = 40;                                // tombstone size (pixels)
const OB_COLS = 8;                            // tombstones snap to an 8 x 8 grid
const OBSTACLE_LEVELS = [
    { name: "EASY",   color: "#4dffb8", count: 3,  near: 0, minDist: 100, life: 7 },
    { name: "MEDIUM", color: "#ffe14d", count: 6,  near: 2, minDist: 75,  life: 8 },
    { name: "HARD",   color: "#ff4d4d", count: 10, near: 5, minDist: 62,  life: 10 }
];                                            // near = how many are placed close around you

// Player hearts + dodge roll (hearts are used in phase 2, the boss fight)
const HEARTS = 3;                             // hits you can take
const HURT_INVINCIBLE = 1.4;                  // seconds you can't be hurt after a hit (you blink)
const ROLL_TIME = 0.4;                        // DASH: how long you can't be hurt
const FLASH_DISTANCE = 120;                   // DASH: how far you dash (pixels)
const DASH_TIME = 0.28;                       // DASH: how long the dash movement takes (seconds)
const ROLL_COOLDOWN = 0.9;                    // wait before you can roll again (boss fight: phase 2 + 3)
const ROLL_COOLDOWN_P1 = 3;                   // phase 1: the roll is slower to recharge

// Shotgun settings
const GUN_TIME = 30;                          // shotgun drops at this many seconds
const MAG = 2;                                // shells in the gun
const RELOAD_PER_SHELL = 0.7;                 // seconds to load one shell
const SHOT_COOLDOWN = 0.35;                   // seconds between shots
const RANGE = 190;                            // how far the shot reaches (pixels)
const PELLETS = 6;                            // little balls flying out of the gun
const DMG_CLOSE = 28, DMG_MID = 20, DMG_FAR = 12;   // boss damage per shot: closer = more pellets hit (under 90px / under 150px / farther)
const STUN_TIME = 1;                          // ghost freezes this long when hit

let playerX = 200, playerY = 200;
let ghostX = 0, ghostY = 0;
let gameOver = false;
let elapsed = 0;                              // seconds survived
let playerVX = 0, playerVY = 0;               // which way the player is moving (-1 to 1)
let mode = "chase";                           // "chase", "warn" (about to dash) or "dash"
let modeTime = 0;
let dashTimer = DASH_EVERY;

let gunSpawned = false;                       // has the shotgun dropped yet?
let pickupActive = false;                     // is it lying on the map?
let pickX = 0, pickY = 0;
let hasGun = false;                           // does the player have it?
let ammo = MAG;
let reloading = false;
let reloadTimer = 0;
let cooldown = 0;
let aim = 0;                                  // angle from player to ghost
let ghostHp = BOSS_HP;
let angry = false;                            // true after 20 seconds
let skillTimer = 8;                           // countdown to the ghost's next skill
let lastSkill = "", castSkill = "";
let tpX = 0, tpY = 0;                         // where the ghost will teleport to
let slowTime = 0, confusedTime = 0;           // player debuffs
const orbs = [];                              // fireballs flying around
const obstacles = [];                         // tombstones on the map
let obstacleWarns = [];                       // purple boxes showing where they will appear
let obstaclePlaces = [];
let obstacleUses = 0;                         // how many times the skill was used
let obstacleLevel = 0;
const bats = [];                              // bats chasing the player
let batTimer = BAT_EVERY;                     // countdown to the next bat attack
let phase2 = false;
let roarTime = 0;                             // ghost roars (frozen) when phase 2 starts
const timers = [];                            // things that happen a little later ({t, fn})
const fx = [];                                // temporary fire effects on screen
let beam = null, beamWarns = [], beamArms = 1, beamLock = 0, slamWarn = null;
// Phase 2 boss brain
let bossState = "walk";                       // "walk", "wind" (warning), "act" (attacking), "bats" (bat form), "stagger"
let bossTime = 0, bossAtk = "", bossStep = 0, wallCount = 0;
let bossRage = false, bossPhase3 = false;
let batForm = false, batFormTime = 0, batStage = 0;
let lastBat = { x: 200, y: 200 };
const fbats = [];                             // the boss's bat form
let hearts = HEARTS, invincible = 0;
let rollTime = 0, rollCool = 0, rollDX = 0, rollDY = 1, lastDX = 0, lastDY = 1;
let dashT = 99, dashFX = 0, dashFY = 0, dashTX = 0, dashTY = 0, dashTrailTimer = 0;   // dash in progress
const heartsEl = document.createElement("div");   // hearts on screen (only shown in phase 2)
heartsEl.id = "hearts";
heartsEl.className = "hidden";
game.appendChild(heartsEl);
const rollBtn = document.getElementById("roll");  // (the ROLL button, if the HTML has it)
let stunTime = 0;
let knockX = 0, knockY = 0;                   // ghost slides back when shot
let lastTime = performance.now();

// ---------- Sound (made with the browser's Web Audio, so no sound files are needed) ----------
// Press M to turn the sound on/off.
let audioCtx = null;
let muted = false;
try { muted = localStorage.getItem("ghostMuted") === "1"; } catch (e) { /* ok */ }

function unlockAudio() {                       // browsers only allow sound after a key press or tap
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (e) { /* no sound available, that's ok */ }
}
document.addEventListener("keydown", unlockAudio);
document.addEventListener("pointerdown", unlockAudio);

// One beep: freq = pitch, dur = seconds, slideTo = pitch it slides to, delay = wait before playing
function tone(freq, dur, type, vol, slideTo, delay) {
    if (!audioCtx || muted) return;
    const t = audioCtx.currentTime + (delay || 0);
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + dur + 0.02);
}

// A burst of noise (gunshots, explosions, whooshes). The filter sweeps from one pitch to another
function noise(dur, vol, fromHz, toHz, delay) {
    if (!audioCtx || muted) return;
    const t = audioCtx.currentTime + (delay || 0);
    const len = Math.floor(audioCtx.sampleRate * dur);
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const f = audioCtx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(fromHz, t);
    f.frequency.exponentialRampToValueAtTime(toHz, t + dur);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(audioCtx.destination);
    src.start(t);
}

const SFX = {
    // gun
    shoot:    () => { noise(0.25, 0.35, 3500, 250); tone(150, 0.16, "sawtooth", 0.16, 40); },
    empty:    () => tone(180, 0.05, "square", 0.07),
    shell:    () => { tone(900, 0.04, "square", 0.06); tone(520, 0.05, "square", 0.06, 0, 0.05); },
    pickup:   () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, "square", 0.09, 0, i * 0.07)),
    // hits
    immune:   () => tone(300, 0.15, "triangle", 0.12, 150),
    hit:      () => { tone(220, 0.12, "sawtooth", 0.13, 90); noise(0.08, 0.15, 1500, 400); },
    crit:     () => { tone(330, 0.2, "sawtooth", 0.16, 70); noise(0.15, 0.25, 2500, 300); tone(1200, 0.1, "square", 0.06, 600); },
    batdie:   () => tone(1300, 0.14, "square", 0.09, 250),
    // boss
    warn:     () => { tone(440, 0.1, "square", 0.07); tone(440, 0.1, "square", 0.07, 0, 0.16); },
    whoosh:   () => noise(0.5, 0.18, 300, 2800),
    fireball: () => noise(0.25, 0.14, 2500, 400),
    boom:     () => { noise(0.45, 0.35, 1800, 100); tone(90, 0.4, "sine", 0.28, 35); },
    slam:     () => { noise(0.7, 0.45, 1500, 60); tone(70, 0.7, "sine", 0.35, 28); },
    beam:     () => { tone(110, 0.9, "sawtooth", 0.1, 230); noise(0.9, 0.08, 800, 2000); },
    roar:     () => { tone(90, 1.2, "sawtooth", 0.18, 45); tone(135, 1.2, "square", 0.06, 70); noise(1, 0.14, 700, 120); },
    bats:     () => { for (let i = 0; i < 8; i++) tone(1400 + Math.random() * 900, 0.07, "square", 0.05, 0, i * 0.06); noise(0.6, 0.1, 3000, 500); },
    screech:  () => tone(1800, 0.2, "sawtooth", 0.06, 2700),
    spit:     () => tone(650, 0.15, "sawtooth", 0.09, 200),
    bite:     () => { tone(220, 0.1, "square", 0.11, 90); noise(0.06, 0.12, 2000, 500); },
    stagger:  () => { tone(320, 0.45, "triangle", 0.15, 70); noise(0.25, 0.2, 1200, 150); },
    heal:     () => tone(300, 0.6, "sine", 0.14, 700),
    // normal ghost skills
    cast:     () => tone(500, 0.3, "sine", 0.09, 900),
    teleport: () => tone(1000, 0.2, "sine", 0.09, 180),
    tomb:     () => noise(0.2, 0.2, 600, 120),
    zap:      () => { noise(0.25, 0.32, 7000, 400); tone(1900, 0.14, "sawtooth", 0.09, 160); tone(90, 0.3, "sine", 0.2, 40, 0.04); },
    decoy:    () => { tone(520, 0.18, "triangle", 0.08, 980); tone(520, 0.18, "triangle", 0.06, 780, 0.07); },
    ouch:     () => { tone(240, 0.25, "sawtooth", 0.15, 60); noise(0.12, 0.2, 1500, 300); },
    roll:     () => { noise(0.28, 0.3, 1800, 150); tone(110, 0.22, "sawtooth", 0.14, 45); noise(0.12, 0.2, 900, 120, 0.26); tone(70, 0.15, "sine", 0.2, 35, 0.27); },
    // game over
    die:      () => [440, 330, 262, 196].forEach((f, i) => tone(f, 0.25, "sawtooth", 0.13, 0, i * 0.18)),
    win:      () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, "square", 0.11, 0, i * 0.12))
};

function sfx(name) {
    try { if (SFX[name]) SFX[name](); } catch (e) { /* sound must never break the game */ }
}

// The speaker button on the top of the machine (for phones, which have no M key)
const muteBtn = document.getElementById("mute");
function setMuted(value) {
    muted = value;
    try { localStorage.setItem("ghostMuted", muted ? "1" : "0"); } catch (e) { /* ok */ }
    if (muteBtn) muteBtn.textContent = muted ? "\uD83D\uDD07" : "\uD83D\uDD0A";
}
setMuted(muted);

// ---------- Boss music (a little song made of beeps and drums, played live) ----------
// level 1 = phase 2, level 2 = enraged (faster + more notes), level 3 = final form (fastest)
const MUSIC = { on: false, step: 0, nextTime: 0, timer: null, level: 1, intense: false };   // level 0 = the normal chase (before the boss)
const BASS_ROOTS = [33, 29, 31, 28];                           // the 4 chords of the loop: A, F, G, E (as piano key numbers)
const BASS_RIFF  = [0, 0, 12, 0, 3, 0, 7, 5];                  // bass notes of each bar (steps above the chord)
const ARP_RIFF   = [0, 3, 7, 12, 7, 3, 7, 10];                 // the fast "spooky" notes
const noteHz = (n) => 440 * Math.pow(2, (n - 69) / 12);        // piano key number -> pitch

function musicTempo() {
    if (MUSIC.level === 0) return MUSIC.intense ? 118 : 98;       // calm and creepy, then faster when the ghost is angry
    return MUSIC.level === 1 ? 116 : MUSIC.level === 2 ? 140 : 160;
}

// The normal-chase song: slow heartbeat, soft bass, a music-box melody. It gets busier when the ghost is angry.
const CHASE_ROOTS = [33, 33, 29, 31];                            // A, A, F, G
const CHASE_MELODY = [                                           // which step of the bar gets a note, and how high it is
    { 2: 12, 6: 7, 10: 10, 14: 7 },
    { 2: 12, 5: 15, 10: 14, 13: 10 },
    { 2: 17, 6: 12, 10: 9, 14: 12 },
    { 2: 14, 6: 11, 10: 7, 13: 11 }
];
function playChaseStep(step, t) {
    const d = t - audioCtx.currentTime;
    const s = step % 16, bar = Math.floor(step / 16) % 4, root = CHASE_ROOTS[bar], hot = MUSIC.intense;
    if (s % 8 === 0) tone(120, 0.14, "sine", 0.14, 45, d);                       // slow heartbeat
    if (hot && s % 8 === 3) tone(120, 0.12, "sine", 0.09, 45, d);                // second beat of the heartbeat
    if (s % 4 === 0) tone(noteHz(root + (s === 8 ? 7 : 0)), 0.32, "triangle", 0.07, 0, d);   // soft bass
    if (s === 0) {                                                               // long pad
        tone(noteHz(root + 24), 2.3, "triangle", 0.03, 0, d);
        tone(noteHz(root + 27), 2.3, "triangle", 0.02, 0, d);
    }
    const m = CHASE_MELODY[bar][s];
    if (m !== undefined) tone(noteHz(root + 36 + m), 0.4, "sine", 0.04, 0, d);   // music-box note
    if (hot) {
        if (s === 4 || s === 12) noise(0.08, 0.05, 5000, 1500, d);               // soft snare
        if (s % 2 === 0) noise(0.025, 0.02, 9000, 6000, d);                      // hi-hat
        if (s % 4 === 2) tone(noteHz(root + 48 + ARP_RIFF[(s >> 1) % 8]), 0.07, "square", 0.015, 0, d);   // quiet sparkle
    }
}

// Plays one 16th-note step of the song at time t
function playMusicStep(step, t) {
    if (MUSIC.level === 0) { playChaseStep(step, t); return; }
    const d = t - audioCtx.currentTime;
    const s = step % 16, root = BASS_ROOTS[Math.floor(step / 16) % 4], lv = MUSIC.level;

    // heartbeat kick
    if (s % 4 === 0 || (lv === 3 && s === 14)) tone(130, 0.13, "sine", 0.2, 40, d);
    // snare
    if (s === 4 || s === 12) { noise(0.12, 0.1, 5500, 1500, d); tone(190, 0.06, "triangle", 0.05, 0, d); }
    // hi-hat (when he is enraged)
    if (lv >= 2 && s % 2 === 0) noise(0.03, 0.035, 9000, 6000, d);
    // bass
    const lowStep = lv === 1 ? (s % 4 === 0 || s === 10) : s % 2 === 0;
    if (lowStep) tone(noteHz(root + BASS_RIFF[(s >> 1) % 8]), 0.2, "sawtooth", 0.05, 0, d);
    // long creepy chord at the start of each bar
    if (s === 0) {
        tone(noteHz(root + 24), 1.7, "triangle", 0.045, 0, d);
        tone(noteHz(root + 27), 1.7, "triangle", 0.03, 0, d);
    }
    // fast spooky notes
    if ((lv === 2 && s % 2 === 0) || lv === 3) tone(noteHz(root + 36 + ARP_RIFF[s % 8]), 0.09, "square", 0.028, 0, d);
    // final form: scary stab
    if (lv === 3 && s % 8 === 6) tone(noteHz(root + 30), 0.2, "sawtooth", 0.04, noteHz(root + 29), d);
}

// Runs every 40 ms: schedules the next few notes a little ahead of time so the beat stays steady
function musicTick() {
    if (!audioCtx || !MUSIC.on) return;
    if (MUSIC.nextTime < audioCtx.currentTime - 0.3) MUSIC.nextTime = audioCtx.currentTime + 0.05;   // the tab was asleep: catch up
    while (MUSIC.nextTime < audioCtx.currentTime + 0.15) {
        if (!muted) playMusicStep(MUSIC.step, MUSIC.nextTime);
        MUSIC.nextTime += 60 / musicTempo() / 4;
        MUSIC.step = (MUSIC.step + 1) % 64;
    }
}

function startMusic(level) {
    const wasChase = MUSIC.on && MUSIC.level === 0;
    MUSIC.level = level;
    if (MUSIC.on) {
        if (wasChase && level >= 1) { MUSIC.step = 0; MUSIC.nextTime = audioCtx.currentTime + 0.05; }   // boss song starts clean
        return;
    }
    unlockAudio();
    if (!audioCtx) return;
    MUSIC.intense = false;
    MUSIC.on = true;
    MUSIC.step = 0;
    MUSIC.nextTime = audioCtx.currentTime + 0.1;
    MUSIC.timer = setInterval(musicTick, 40);
}

function stopMusic() {
    MUSIC.on = false;
    if (MUSIC.timer) clearInterval(MUSIC.timer);
    MUSIC.timer = null;
}

function setMusicLevel(level) { if (level > MUSIC.level) MUSIC.level = level; }

// Start the chase music with the first key press or tap (browsers don't allow sound before that)
function startChaseMusic() {
    if (!MUSIC.on && !phase2 && !gameOver) { startMusic(0); MUSIC.intense = angry; }
}
document.addEventListener("keydown", startChaseMusic);
document.addEventListener("pointerdown", startChaseMusic);

if (muteBtn) muteBtn.addEventListener("click", () => { unlockAudio(); setMuted(!muted); });

// Which directions are being held right now
const held = { up: false, down: false, left: false, right: false };

function clamp(n) {
    return Math.max(0, Math.min(MAX, n));
}

// ---------- Drawing ----------

const GUN_SVG = `
<svg viewBox="0 0 48 16">
    <path d="M0 6 L13 6 L13 12 L2 14 Z" fill="#8b5a2b"/>
    <rect x="12" y="5" width="11" height="8" fill="#555"/>
    <rect x="14" y="4" width="34" height="3.5" fill="#bbb"/>
    <rect x="14" y="7.5" width="34" height="3.5" fill="#999"/>
    <rect class="pump" x="24" y="10" width="9" height="5" rx="1" fill="#8b5a2b"/>
</svg>`;
if (GUN_OK) {
    gunInner.innerHTML = GUN_SVG;
    pickupInner.innerHTML = GUN_SVG;
}

function draw() {
    player.classList.toggle("face-left", lastDX < 0);        // the hunter turns around
    player.style.transform = `translate(${playerX}px, ${playerY}px)`;
    ghost.style.transform = `translate(${ghostX}px, ${ghostY}px)`;

    if (hasGun) {
        const pcx = playerX + SIZE / 2, pcy = playerY + SIZE / 2;
        let tx = ghostX + SIZE / 2, ty = ghostY + SIZE / 2;
        if (batForm && fbats.length) {                  // bat form: the gun aims at the nearest bat
            let best = Infinity;
            for (const b of fbats) {
                const d = Math.hypot(b.x + 18 - pcx, b.y + 18 - pcy);
                if (d < best) { best = d; tx = b.x + 18; ty = b.y + 18; }
            }
        }
        aim = Math.atan2(ty - pcy, tx - pcx);
        const flip = Math.cos(aim) < 0 ? -1 : 1;   // keep the gun right side up
        gunEl.style.transform = `translate(${pcx}px, ${pcy}px) rotate(${aim}rad) scaleY(${flip})`;
        ghostHpBar.style.transform = `translate(${ghostX}px, ${ghostY - 8}px)`;
    }
}

function updateAmmoUI() {
    let html = "";
    for (let i = 0; i < MAG; i++) {
        let cls = "shell";
        if (i >= ammo) cls += (reloading && i === ammo) ? " loading" : " empty";
        html += `<i class="${cls}"></i>`;
    }
    ammoEl.innerHTML = html;
    reloadText.textContent = reloading ? "RELOADING" : "";
}

function setLocked(locked) {
    fireBtn.classList.toggle("locked", locked);
    reloadBtn.classList.toggle("locked", locked);
}

let toastTimer;
function showToast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 3000);
}

// Small text that floats up and fades (like "HIT!")
function popup(text, x, y, color) {
    const el = document.createElement("div");
    el.className = "popup";
    el.textContent = text;
    el.style.color = color;
    game.appendChild(el);
    const a = el.animate([
        { transform: `translate(${x - 20}px, ${y}px)`, opacity: 1 },
        { transform: `translate(${x - 20}px, ${y - 35}px)`, opacity: 0 }
    ], { duration: 700, easing: "ease-out" });
    a.onfinish = () => el.remove();
}

// ---------- Sparks and embers (little particles) ----------
const particles = [];
const MAX_PARTICLES = 150;

// x, y = where, count = how many, speed = how fast they fly out, life = seconds, rise = how fast they float up
function spark(x, y, count, color, speed, life, size, rise) {
    for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
        const el = document.createElement("div");
        el.className = "spark";
        const sz = size || 4;
        el.style.width = el.style.height = sz + "px";
        el.style.background = color;
        el.style.boxShadow = "0 0 6px " + color;
        game.appendChild(el);
        const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.6);
        particles.push({ el, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                         life: life * (0.6 + Math.random() * 0.6), rise: rise || 0 });
    }
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { p.el.remove(); particles.splice(i, 1); continue; }
        p.vy -= p.rise * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
        p.el.style.opacity = Math.min(1, p.life / 0.25);
    }
}

// ---------- Hearts and dodge roll ----------

function updateHearts() {
    let html = "";
    for (let i = 0; i < HEARTS; i++) html += i < hearts ? "\u2764\uFE0F" : "\uD83D\uDDA4";
    heartsEl.innerHTML = html;
}

function canBeHurt() {
    return !gameOver && invincible <= 0 && rollTime <= 0;     // rolling or just hit = fire goes through you
}

function shake(px) {
    game.animate([
        { transform: "translate(0, 0)" }, { transform: `translate(${-px}px, ${px / 2}px)` },
        { transform: `translate(${px}px, ${-px / 2}px)` }, { transform: "translate(0, 0)" }
    ], { duration: 220 });
}

// Take damage. Returns true if it really hurt you
function hurt(dmg) {
    if (!canBeHurt()) return false;
    hearts -= dmg;
    sfx("ouch");
    shake(6);
    spark(playerX + SIZE / 2, playerY + SIZE / 2, 16, "#ff2d55", 240, 0.5, 4);
    game.animate([                                            // red flash around the screen
        { boxShadow: "inset 0 0 70px 26px rgba(255, 0, 40, 0.85)" },
        { boxShadow: "inset 0 0 70px 26px rgba(255, 0, 40, 0)" }
    ], { duration: 420 });
    if (navigator.vibrate) navigator.vibrate(60);
    popup("-" + dmg + " \u2764", playerX + SIZE / 2, playerY, "#ff4d6d");
    if (hearts <= 0) {
        hearts = 0;
        updateHearts();
        lose("YOU DIED");
        return true;
    }
    invincible = HURT_INVINCIBLE;
    updateHearts();
    return true;
}

// ---- Heavy dash visuals: tinted trail copies, dust kicked up, a ground ring and a thump ----

function dashTrailCopy(x, y, sx, sy) {
    const el = player.cloneNode(true);
    el.removeAttribute("id");
    el.className = "dash-ghost" + (player.classList.contains("face-left") ? " face-left" : "");
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.scale = `${sx} ${sy}`;
    game.appendChild(el);
    const a = el.animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: 340, easing: "ease-out" });
    a.onfinish = () => el.remove();
}

// thick streaks that stay behind you, pointing back along the way you came
function dashStreaks(cx, cy) {
    const ang = Math.atan2(rollDY, rollDX), deg = ang * 180 / Math.PI;
    for (let i = -1; i <= 1; i++) {
        const el = document.createElement("div");
        el.className = "dash-streak";
        const ox = -Math.sin(ang) * i * 12, oy = Math.cos(ang) * i * 12;
        const L = 50 + Math.random() * 40;
        el.style.width = L + "px";
        const base = `translate(${cx + ox}px, ${cy + oy}px) rotate(${deg + 180}deg)`;   // points backwards
        el.style.transform = base;
        game.appendChild(el);
        const a = el.animate([
            { transform: base + " scaleX(0.4)", opacity: 0.95 },
            { transform: base + " scaleX(1.2)", opacity: 0 }
        ], { duration: 260, easing: "ease-out" });
        a.onfinish = () => el.remove();
    }
}

function dashRing(x, y) {                                      // ring of force on the ground
    const el = document.createElement("div");
    el.className = "dash-ring";
    const base = `translate(${x - 28}px, ${y - 10}px)`;
    el.style.transform = base;
    game.appendChild(el);
    const a = el.animate([
        { transform: base + " scale(0.4)", opacity: 0.8 },
        { transform: base + " scale(2.2)", opacity: 0 }
    ], { duration: 340, easing: "ease-out" });
    a.onfinish = () => el.remove();
}

// DASH: a short, heavy burst of movement. Stops in front of tombstones.
function startRoll() {
    if (gameOver || rollTime > 0 || rollCool > 0) return;
    let dx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    let dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
    if (stick.x || stick.y) { dx = stick.x; dy = stick.y; }       // phone joystick
    if (confusedTime > 0) { dx = -dx; dy = -dy; }
    if (!dx && !dy) { dx = lastDX; dy = lastDY; }               // not pressing anything: dash the way you last moved
    const len = Math.hypot(dx, dy) || 1;
    rollDX = dx / len; rollDY = dy / len;

    // find the end point: walk along the path and stop before a wall or tombstone
    dashFX = playerX; dashFY = playerY;
    dashTX = playerX; dashTY = playerY;
    for (let d = 5; d <= FLASH_DISTANCE; d += 5) {
        const nx = clamp(dashFX + rollDX * d), ny = clamp(dashFY + rollDY * d);
        if (hitsObstacle(nx, ny)) break;
        dashTX = nx; dashTY = ny;
    }
    dashT = 0;
    dashTrailTimer = 0;

    spark(playerX + SIZE / 2, playerY + SIZE - 4, 14, "#b8b2a4", 190, 0.55, 7, 22);   // push-off dust
    dashRing(playerX + SIZE / 2, playerY + SIZE - 2);                                 // ring at your feet
    game.animate([{ boxShadow: "inset 0 0 0 200px rgba(190,255,230,0.22)" },
                  { boxShadow: "inset 0 0 0 200px rgba(190,255,230,0)" }], { duration: 160 });  // quick mint flash
    rollTime = ROLL_TIME;                                        // short window where nothing can hurt you
    rollCool = phase2 ? ROLL_COOLDOWN : ROLL_COOLDOWN_P1;      // phase 1: 3 seconds, boss fight: 0.9 seconds
    sfx("roll");
    if (navigator.vibrate) navigator.vibrate(15);               // little buzz on phones
}

// Moves you along the dash path (called every frame while dashing)
function updateDash(dt) {
    dashT = Math.min(DASH_TIME, dashT + dt);
    const p = dashT / DASH_TIME;
    const e = 1 - Math.pow(1 - p, 4);                            // starts very fast, then brakes hard = heavy
    playerX = dashFX + (dashTX - dashFX) * e;
    playerY = dashFY + (dashTY - dashFY) * e;

    // squash & stretch: long and thin while fast, back to normal as it brakes
    const k = (1 - p) * 0.55;
    const sx = 1 + k * Math.abs(rollDX) - k * 0.35 * Math.abs(rollDY);
    const sy = 1 + k * Math.abs(rollDY) - k * 0.35 * Math.abs(rollDX);
    player.style.scale = `${sx} ${sy}`;

    dashTrailTimer -= dt;
    if (dashTrailTimer <= 0 && p < 1) {                         // a trail copy every 35 ms
        dashTrailCopy(playerX, playerY, sx, sy);
        dashStreaks(playerX + SIZE / 2, playerY + SIZE / 2);
        spark(playerX + SIZE / 2, playerY + SIZE - 4, 3, "#b8b2a4", 90, 0.45, 6, 15);
        dashTrailTimer = 0.035;
    }
    if (p >= 1) {                                                // landing: thump
        dashT = 99;
        player.style.scale = "";
        spark(playerX + SIZE / 2, playerY + SIZE / 2, 8, "#4dffb8", 220, 0.4, 4);       // mint energy burst
        dashRing(playerX + SIZE / 2, playerY + SIZE - 2);
        spark(playerX + SIZE / 2, playerY + SIZE - 4, 16, "#b8b2a4", 210, 0.6, 7, 22);
    }
}

// ---------- Input ----------

// Press / release a direction (keyboard and buttons both use this)
function setDir(dir, isDown) {
    held[dir] = isDown;
    document.getElementById(dir).classList.toggle("pressed", isDown);
}

// Keyboard: arrow keys + W A S D
const KEYS = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", s: "down", a: "left", d: "right"
};

function keyName(e) {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
}

document.addEventListener("keydown", (e) => {
    const key = keyName(e);
    const dir = KEYS[key];
    if (dir) {
        e.preventDefault();                   // stop the page from scrolling
        setDir(dir, true);
    } else if (key === " " || key === "j") {
        e.preventDefault();
        if (!e.repeat) fire();                // one shot per key press
    } else if (key === "r") {
        startReload();
    } else if (key === "Shift" || key === "k") {
        if (!e.repeat) startRoll();           // SHIFT or K = dodge roll
    } else if (key === "m") {                 // M = sound on/off
        setMuted(!muted);
        showToast(muted ? "SOUND OFF" : "SOUND ON");
    }
});

document.addEventListener("keyup", (e) => {
    const key = keyName(e);
    if (KEYS[key]) setDir(KEYS[key], false);
    if (key === " ") e.preventDefault();
});

// If the tab loses focus, stop moving
window.addEventListener("blur", () => {
    stickReset();
    for (const dir in held) setDir(dir, false);
});

// On-screen D-pad (phone): hold a finger on it, and slide to another arrow to change direction.
// Each finger remembers which arrow it is on, so you can move AND tap FIRE at the same time.
const pad = document.getElementById("pad");
const padTouches = new Map();                   // finger id -> direction

function dirAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const btn = el && el.closest ? el.closest("#pad button") : null;
    return btn ? btn.dataset.dir : null;
}

function updatePad(e) {
    const dir = dirAt(e.clientX, e.clientY);
    const old = padTouches.get(e.pointerId);
    if (dir === old) return;
    if (old) setDir(old, false);
    if (dir) padTouches.set(e.pointerId, dir);
    else padTouches.delete(e.pointerId);
    if (dir) setDir(dir, true);
}

function releasePad(e) {
    const old = padTouches.get(e.pointerId);
    if (old) setDir(old, false);
    padTouches.delete(e.pointerId);
}

pad.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    pad.setPointerCapture(e.pointerId);         // keep following the finger even if it slides off
    updatePad(e);
});
pad.addEventListener("pointermove", (e) => { if (padTouches.has(e.pointerId) || e.buttons) updatePad(e); });
pad.addEventListener("pointerup", releasePad);
pad.addEventListener("pointercancel", releasePad);
pad.addEventListener("contextmenu", (e) => e.preventDefault());   // no long-press menu

// Touch joystick (phone): put your thumb anywhere in the left area and drag. The farther you drag, the faster you run.
const stick = { x: 0, y: 0 };                 // -1 to 1 (0 = not touching)
const stickZone = document.getElementById("stickZone");
const stickBase = document.getElementById("stickBase");
const stickKnob = document.getElementById("stickKnob");
const STICK_R = 44;                           // how far the knob can move (pixels)
const STICK_DEAD = 0.12;                      // drag less than this much and nothing happens
const STICK_FULL = 0.5;                       // drag this much (half way) and you already run at full speed
let stickId = null, stickOX = 0, stickOY = 0;

function stickReset() {
    stickId = null;
    stick.x = 0; stick.y = 0;
    if (stickBase) { stickBase.classList.remove("active"); stickBase.style.left = ""; stickBase.style.top = ""; }
    if (stickKnob) stickKnob.style.transform = "translate(0, 0)";
}

function stickMove(e) {
    let dx = e.clientX - stickOX, dy = e.clientY - stickOY;
    let len = Math.hypot(dx, dy);

    // Dragged past the edge: the stick follows your thumb, so turning around is quick
    if (len > STICK_R) {
        const r = stickZone.getBoundingClientRect();
        const edge = STICK_R + 14;
        const over = len - STICK_R;
        stickOX = Math.max(r.left + edge, Math.min(r.right - edge, stickOX + dx / len * over));
        stickOY = Math.max(r.top + edge, Math.min(r.bottom - edge, stickOY + dy / len * over));
        stickBase.style.left = (stickOX - r.left) + "px";
        stickBase.style.top = (stickOY - r.top) + "px";
        dx = e.clientX - stickOX; dy = e.clientY - stickOY;
        len = Math.hypot(dx, dy);
    }
    if (len > STICK_R) { dx = dx / len * STICK_R; dy = dy / len * STICK_R; len = STICK_R; }
    stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;

    const pull = len / STICK_R;                                // 0 to 1
    if (pull < STICK_DEAD) { stick.x = 0; stick.y = 0; return; }   // tiny wiggles do nothing
    const power = Math.min(1, pull / STICK_FULL);              // full running speed already at about half a drag
    stick.x = dx / len * power;
    stick.y = dy / len * power;
}

if (stickZone) {
    stickZone.addEventListener("pointerdown", (e) => {
        if (stickId !== null && stickId !== e.pointerId) stickReset();      // a lost finger must never lock the stick
        e.preventDefault();
        stickId = e.pointerId;
        stickZone.setPointerCapture(e.pointerId);
        const r = stickZone.getBoundingClientRect();
        const m = STICK_R + 14;                                // keep the whole stick inside the area
        stickOX = Math.max(r.left + m, Math.min(r.right - m, e.clientX));
        stickOY = Math.max(r.top + m, Math.min(r.bottom - m, e.clientY));
        stickBase.style.left = (stickOX - r.left) + "px";
        stickBase.style.top = (stickOY - r.top) + "px";
        stickBase.classList.add("active");
        stickMove(e);
    });
    stickZone.addEventListener("pointermove", (e) => { if (e.pointerId === stickId) stickMove(e); });
    stickZone.addEventListener("pointerup", (e) => { if (e.pointerId === stickId) stickReset(); });
    stickZone.addEventListener("pointercancel", (e) => { if (e.pointerId === stickId) stickReset(); });
    stickZone.addEventListener("contextmenu", (e) => e.preventDefault());
    stickZone.addEventListener("lostpointercapture", (e) => { if (e.pointerId === stickId) stickReset(); });
    window.addEventListener("blur", stickReset);
    document.addEventListener("visibilitychange", () => { if (document.hidden) stickReset(); });
}

if (rollBtn) {
    rollBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); startRoll(); });
}

if (GUN_OK) {
    fireBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); fire(); });
    reloadBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); startReload(); });
}

// ---------- Player ----------

function movePlayer(dt) {
    let dx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    let dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
    const analog = stick.x !== 0 || stick.y !== 0;               // phone joystick
    if (analog) {
        dx = stick.x; dy = stick.y;
        const m = Math.hypot(dx, dy);
        if (m > 1) { dx /= m; dy /= m; }
    }
    if (confusedTime > 0) { dx = -dx; dy = -dy; }               // controls reversed!
    if (!analog && dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }   // same speed on diagonals
    playerVX = dx;
    playerVY = dy;

    if (dx || dy) { lastDX = dx; lastDY = dy; }
    let speed = slowTime > 0 ? PLAYER_SPEED * SLOW_FACTOR : PLAYER_SPEED;
    if (dashT < DASH_TIME) {
        updateDash(dt);                                  // dashing: the dash moves you
    } else {
        // VORTEX: while the ghost casts it, it pulls you towards it
        let pvx = 0, pvy = 0;
        if (mode === "cast" && castSkill === "pull") {
            const ddx = ghostX - playerX, ddy = ghostY - playerY, dd = Math.hypot(ddx, ddy);
            if (dd < PULL_RADIUS && dd > 40) { pvx = ddx / dd * PULL_SPEED; pvy = ddy / dd * PULL_SPEED; }
        }
        const stuck = hitsObstacle(playerX, playerY);       // (safety: never trap you inside one)
        const nx = clamp(playerX + (dx * speed + pvx) * dt);
        if (stuck || !hitsObstacle(nx, playerY)) playerX = nx;
        const ny = clamp(playerY + (dy * speed + pvy) * dt);
        if (stuck || !hitsObstacle(playerX, ny)) playerY = ny;
    }

    slowTime = Math.max(0, slowTime - dt);
    confusedTime = Math.max(0, confusedTime - dt);
    rollTime = Math.max(0, rollTime - dt);
    rollCool = Math.max(0, rollCool - dt);
    invincible = Math.max(0, invincible - dt);
    player.classList.toggle("rolling", rollTime > 0);
    player.classList.toggle("dashing", dashT < DASH_TIME);
    player.classList.toggle("hurt", invincible > 0);
    if (rollBtn) rollBtn.classList.toggle("cooling", rollCool > 0);
    player.classList.toggle("slowed", slowTime > 0);
    player.classList.toggle("confused", confusedTime > 0);
}

// ---------- Ghost ----------

function moveGhost(dt) {
    // Slide back after being shot (the push fades out quickly)
    ghostX = clamp(ghostX + knockX * dt);
    ghostY = clamp(ghostY + knockY * dt);
    const fade = Math.pow(0.0005, dt);
    knockX *= fade;
    knockY *= fade;

    if (roarTime > 0) { roarTime -= dt; return; }       // roaring at the start of phase 2

    // Frozen after a hit
    if (stunTime > 0) {
        stunTime -= dt;
        ghost.classList.toggle("stunned", stunTime > 0);
        return;
    }

    // Phase 2: the vampire lord has its own brain
    if (phase2) { moveBoss(dt); return; }

    // 1. Gets faster the longer you survive (and a lot faster once angry)
    const baseSpeed = angry
        ? Math.min(HARD_MAX, GHOST_START + HARD_TIME * SPEED_UP + HARD_SPEED_BONUS
                              + (elapsed - HARD_TIME) * HARD_RAMP)
        : Math.min(GHOST_MAX, GHOST_START + elapsed * SPEED_UP);
    let speed = baseSpeed;

    // 2. Dash: freeze and glow red (warning), then zoom forward
    dashTimer -= dt;
    if (mode === "chase" && dashTimer <= 0) {
        mode = "warn"; modeTime = angry ? HARD_WARN_TIME : 0.6;
        ghost.classList.add("warning");
    } else if (mode === "warn") {
        speed = 0;
        modeTime -= dt;
        if (modeTime <= 0) { mode = "dash"; modeTime = angry ? HARD_DASH_TIME : 0.4; ghost.classList.remove("warning"); }
    } else if (mode === "dash") {
        speed = baseSpeed * 3;
        modeTime -= dt;
        if (modeTime <= 0) {
            mode = "chase";
            dashTimer = angry ? HARD_DASH_EVERY : DASH_EVERY;
            skillTimer = Math.max(skillTimer, 1.2);           // no instant skill after a dash
        }
    } else if (mode === "cast") {
        speed = 0;                                            // stands still while casting
        modeTime -= dt;
        if (modeTime <= 0) finishCast();
    }

    // Special skills. Bats come every 10 seconds; the others are picked at random.
    batTimer -= dt;
    if (mode === "chase") {
        if (batTimer <= 0) {
            startCast("bats"); speed = 0;
        } else {
            skillTimer -= dt;
            if (skillTimer <= 0) { startCast(); speed = 0; }
        }
    }

    // 3. Predict where you will be, not where you are now
    const dist = Math.hypot(playerX - ghostX, playerY - ghostY);
    const lead = Math.min(dist / baseSpeed, angry ? 1 : 0.8);   // seconds to look ahead
    const targetX = clamp(playerX + playerVX * PLAYER_SPEED * lead);
    const targetY = clamp(playerY + playerVY * PLAYER_SPEED * lead);

    // 4. Fly straight at that spot (diagonals included)
    const tx = targetX - ghostX;
    const ty = targetY - ghostY;
    const d = Math.hypot(tx, ty);
    if (d > 0) {
        const step = Math.min(speed * dt, d);
        ghostX += (tx / d) * step;
        ghostY += (ty / d) * step;
    }
}

// ---------- Ghost special skills (only when angry) ----------

function makeEl(cls, text) {
    const el = document.createElement("div");
    el.className = cls + " hidden";
    el.textContent = text;
    game.appendChild(el);
    return el;
}
const markerEl = makeEl("tp-marker", "\u2715");     // shows where the ghost will teleport
const ringEl = makeEl("pulse-ring", "");              // shows how big the scare pulse is
ringEl.style.width = ringEl.style.height = (PULSE_RADIUS * 2) + "px";
const pullEl = makeEl("pull-ring", "");                // shows the vortex (shrinks while it pulls)
pullEl.style.width = pullEl.style.height = (PULL_RADIUS * 2) + "px";
const decoys = [];                                      // fake ghosts
let boltPlaces = [], boltWarns = [];                    // lightning strikes about to land

// Step 1: pick a skill and show a warning (you have a moment to react)
function startCast(forced) {
    let skill = forced;                                // "bats" is forced by its own timer
    if (!skill) {
        const pool = angry ? SKILLS : ["obstacles"];   // before 20s only obstacles
        do { skill = pool[Math.floor(Math.random() * pool.length)]; }
        while (pool.length > 1 && skill === lastSkill);
        lastSkill = skill;
    }
    castSkill = skill;
    mode = "cast";
    modeTime = CAST_TIME[skill];
    ghost.classList.add("casting");
    sfx("cast");

    const gcx = ghostX + SIZE / 2, gcy = ghostY + SIZE / 2;

    if (skill === "teleport") {
        // It will pop up about 100px from where you are heading
        const bx = playerX + playerVX * PLAYER_SPEED * 0.5;
        const by = playerY + playerVY * PLAYER_SPEED * 0.5;
        for (let i = 0; i < 20; i++) {
            const a = Math.random() * Math.PI * 2;
            tpX = clamp(bx + Math.cos(a) * 100);
            tpY = clamp(by + Math.sin(a) * 100);
            if (Math.hypot(tpX - playerX, tpY - playerY) > 70) break;
        }
        markerEl.style.left = tpX + "px";
        markerEl.style.top = tpY + "px";
        markerEl.classList.remove("hidden");
        popup("TELEPORT!", gcx, ghostY, "#c04dff");
    } else if (skill === "pulse") {
        ringEl.style.left = (gcx - PULSE_RADIUS) + "px";
        ringEl.style.top = (gcy - PULSE_RADIUS) + "px";
        ringEl.classList.remove("hidden");
        popup("SCARE PULSE!", gcx, ghostY, "#c04dff");
    } else if (skill === "bats") {
        batTimer = BAT_EVERY;                                 // time until the next bats
        popup("BATS!", gcx, ghostY, "#b36bff");
    } else if (skill === "obstacles") {
        obstacleLevel = Math.min(obstacleUses, OBSTACLE_LEVELS.length - 1);   // easy, then medium, then hard
        obstacleUses++;
        const lv = OBSTACLE_LEVELS[obstacleLevel];
        obstaclePlaces = pickObstaclePlaces(lv);
        obstacleWarns = obstaclePlaces.map((p) => {
            const w = makeEl("ob-warn", "");
            w.style.left = p.x + "px";
            w.style.top = p.y + "px";
            w.style.borderColor = lv.color;
            w.classList.remove("hidden");
            return w;
        });
        popup("OBSTACLES: " + lv.name, gcx, ghostY, lv.color);
    } else if (skill === "decoys") {
        popup("DECOYS!", gcx, ghostY, "#c04dff");
    } else if (skill === "lightning") {
        boltPlaces = pickBoltPlaces();
        boltWarns = boltPlaces.map((p) => {
            const w = makeEl("bolt-warn", "");
            w.style.left = (p.x - BOLT_RADIUS) + "px";
            w.style.top = (p.y - BOLT_RADIUS) + "px";
            w.classList.remove("hidden");
            return w;
        });
        popup("LIGHTNING!", gcx, ghostY, "#ffe14d");
    } else if (skill === "pull") {
        pullEl.style.left = (gcx - PULL_RADIUS) + "px";
        pullEl.style.top = (gcy - PULL_RADIUS) + "px";
        pullEl.classList.remove("hidden");
        pullEl.animate([{ transform: "scale(1)", opacity: 0.9 }, { transform: "scale(0.2)", opacity: 0.3 }],
                       { duration: CAST_TIME.pull * 1000, easing: "ease-in" });
        popup("VORTEX!", gcx, ghostY, "#c04dff");
    } else {
        popup("FIREBALLS!", gcx, ghostY, "#ff7a00");
    }
}

// Step 2: the warning ends and the skill happens
function finishCast() {
    const skill = castSkill;
    ghost.classList.remove("casting");

    if (skill === "teleport") {
        sfx("teleport");
        ghostX = tpX; ghostY = tpY;
        knockX = 0; knockY = 0;
        markerEl.classList.add("hidden");
        ghost.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
    } else if (skill === "fireballs") {
        spawnOrbs();
    } else if (skill === "pulse") {
        pulseBlast();
    } else if (skill === "obstacles") {
        spawnObstacles();
    } else if (skill === "bats") {
        spawnBats();
    } else if (skill === "decoys") {
        spawnDecoys();
    } else if (skill === "lightning") {
        strikeBolts();
    } else if (skill === "pull") {
        pullEl.classList.add("hidden");
    }

    mode = "chase";
    castSkill = "";
    if (skill === "bats") {
        skillTimer = Math.max(skillTimer, 1.5);
    } else {
        skillTimer = (angry ? HARD_SKILL_EVERY : EARLY_SKILL_EVERY) * (0.8 + Math.random() * 0.4);
    }
    dashTimer = Math.max(dashTimer, 1.2);                     // no instant dash after a skill
}

// Shooting the ghost while it casts cancels the skill
function cancelCast() {
    if (mode === "cast") mode = "chase";
    castSkill = "";
    skillTimer = Math.max(skillTimer, 2);
    batTimer = Math.max(batTimer, 2);
    ghost.classList.remove("casting");
    markerEl.classList.add("hidden");
    ringEl.classList.add("hidden");
    pullEl.classList.add("hidden");
    boltWarns.forEach((w) => w.remove());
    boltWarns = []; boltPlaces = [];
    removeWarns();
    beamWarns.forEach((w) => w.remove());
    beamWarns = [];
}

function pulseBlast() {
    const gcx = ghostX + SIZE / 2, gcy = ghostY + SIZE / 2;
    const pcx = playerX + SIZE / 2, pcy = playerY + SIZE / 2;
    if (Math.hypot(pcx - gcx, pcy - gcy) <= PULSE_RADIUS) {   // caught inside the ring
        confusedTime = CONFUSE_TIME;
        popup("CONFUSED!", pcx, playerY, "#c04dff");
        showToast("CONTROLS REVERSED!");
    }
    const a = ringEl.animate([
        { transform: "scale(1)", opacity: 1 },
        { transform: "scale(1.15)", opacity: 0 }
    ], { duration: 350, easing: "ease-out" });
    a.onfinish = () => ringEl.classList.add("hidden");
}

function spawnOrbs() {
    sfx("fireball");
    const gcx = ghostX + SIZE / 2, gcy = ghostY + SIZE / 2;
    const base = Math.atan2(playerY + SIZE / 2 - gcy, playerX + SIZE / 2 - gcx);
    const count = ORB_COUNT;
    for (let i = 0; i < count; i++) {
        const angle = base + (i - (count - 1) / 2) * 0.4;   // fan out
        const el = document.createElement("div");
        el.className = "orb";
        el.textContent = "\uD83D\uDD25";
        game.appendChild(el);
        orbs.push({ el, x: gcx - 12, y: gcy - 12,
                    vx: Math.cos(angle) * ORB_SPEED, vy: Math.sin(angle) * ORB_SPEED });
    }
}

function updateOrbs(dt) {
    const pcx = playerX + SIZE / 2, pcy = playerY + SIZE / 2;
    for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i];
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        o.el.style.transform = `translate(${o.x}px, ${o.y}px)`;
        if (o.deadly && particles.length < 70 && Math.random() < 2.2 * dt) spark(o.x + 12, o.y + 12, 1, "#ff9d00", 25, 0.5, 3, 60);   // embers

        const blocked = obstacles.some((t) =>                    // tombstones stop fireballs
            o.x + 12 > t.x && o.x + 12 < t.x + OB && o.y + 12 > t.y && o.y + 12 < t.y + OB);

        if (blocked) {
            o.el.remove();
            orbs.splice(i, 1);
        } else if (Math.hypot(o.x + 12 - pcx, o.y + 12 - pcy) < (o.deadly ? 22 : 28)) {   // hit the player
            if (o.deadly) {                                      // fire hurts (but not while rolling / just hit)
                if (!canBeHurt()) continue;
                hurt(1);
                o.el.remove();
                orbs.splice(i, 1);
                if (gameOver) return;
                continue;
            }
            slowTime = SLOW_TIME;
            popup("SLOWED!", pcx, playerY, "#4dc3ff");
            o.el.remove();
            orbs.splice(i, 1);
        } else if (o.x < -30 || o.y < -30 ||
                   o.x > game.clientWidth + 30 || o.y > game.clientHeight + 30) {
            o.el.remove();                                       // flew off the screen
            orbs.splice(i, 1);
        }
    }
}

// ----- Decoys: fake ghosts that chase you for a few seconds -----

function spawnDecoys() {
    sfx("decoy");
    const gcx = ghostX + SIZE / 2, gcy = ghostY + SIZE / 2;
    const base = Math.atan2(playerY + SIZE / 2 - gcy, playerX + SIZE / 2 - gcx);
    for (let i = 0; i < DECOY_COUNT; i++) {
        const el = document.createElement("div");
        el.className = "decoy";
        el.innerHTML = GHOST_ART;
        game.appendChild(el);
        decoys.push({ el, x: gcx - SIZE / 2, y: gcy - SIZE / 2, life: DECOY_LIFE,
                      ang: base + (i - (DECOY_COUNT - 1) / 2) * 1.0 });      // fan out first, then turn towards you
    }
    spark(gcx, gcy, 12, "#c04dff", 200, 0.4, 4);
}

function updateDecoys(dt) {
    const pcx = playerX + SIZE / 2, pcy = playerY + SIZE / 2;
    for (let i = decoys.length - 1; i >= 0; i--) {
        const d = decoys[i];
        d.life -= dt;
        let diff = Math.atan2(pcy - (d.y + SIZE / 2), pcx - (d.x + SIZE / 2)) - d.ang;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));                  // shortest way to turn
        d.ang += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
        d.x += Math.cos(d.ang) * DECOY_SPEED * dt;
        d.y += Math.sin(d.ang) * DECOY_SPEED * dt;
        d.el.style.transform = `translate(${d.x}px, ${d.y}px)`;
        if (d.life < 0.5) d.el.classList.add("fading");

        const touch = Math.hypot(d.x + SIZE / 2 - pcx, d.y + SIZE / 2 - pcy) < 30;
        if (touch && rollTime <= 0) {                                       // dashing through a decoy is safe
            slowTime = SLOW_TIME;
            sfx("bite");
            popup("FAKE!", pcx, playerY, "#c04dff");
            spark(d.x + SIZE / 2, d.y + SIZE / 2, 10, "#c04dff", 160, 0.35, 4);
            d.el.remove();
            decoys.splice(i, 1);
        } else if (d.life <= 0) {
            spark(d.x + SIZE / 2, d.y + SIZE / 2, 8, "#c04dff", 90, 0.3, 3);
            d.el.remove();
            decoys.splice(i, 1);
        }
    }
}

// ----- Lightning: circles flash yellow, then bolts hit them -----

function pickBoltPlaces() {
    const places = [];
    const W = game.clientWidth, H = game.clientHeight;
    // the first strike lands where you are heading
    places.push({
        x: Math.max(BOLT_RADIUS, Math.min(W - BOLT_RADIUS, playerX + SIZE / 2 + playerVX * PLAYER_SPEED * 0.6)),
        y: Math.max(BOLT_RADIUS, Math.min(H - BOLT_RADIUS, playerY + SIZE / 2 + playerVY * PLAYER_SPEED * 0.6))
    });
    for (let tries = 0; tries < 60 && places.length < BOLT_COUNT; tries++) {
        const p = { x: BOLT_RADIUS + Math.random() * (W - BOLT_RADIUS * 2),
                    y: BOLT_RADIUS + Math.random() * (H - BOLT_RADIUS * 2) };
        if (places.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > BOLT_RADIUS * 2.4)) places.push(p);
    }
    return places;
}

function strikeBolts() {
    sfx("zap");
    const pcx = playerX + SIZE / 2, pcy = playerY + SIZE / 2;
    let shocked = false;
    boltPlaces.forEach((p) => {
        const el = document.createElement("div");                           // the bolt: a bright column from the top
        el.className = "bolt";
        el.style.left = (p.x - 12) + "px";
        el.style.height = p.y + "px";
        game.appendChild(el);
        const a = el.animate([{ opacity: 1 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], { duration: 380 });
        a.onfinish = () => el.remove();
        spark(p.x, p.y, 14, "#ffe14d", 260, 0.45, 4);
        if (Math.hypot(pcx - p.x, pcy - p.y) < BOLT_RADIUS + 12) shocked = true;
    });
    game.animate([{ boxShadow: "inset 0 0 0 200px rgba(255,240,150,0.28)" },
                  { boxShadow: "inset 0 0 0 200px rgba(255,240,150,0)" }], { duration: 220 });
    if (shocked && rollTime <= 0) {                                         // a dash makes you immune
        slowTime = SLOW_TIME + 1;
        popup("SHOCKED!", pcx, playerY, "#ffe14d");
    }
    boltWarns.forEach((w) => w.remove());
    boltWarns = []; boltPlaces = [];
}

// ----- Obstacles -----

// Choose where the tombstones go (never right on top of you)
function pickObstaclePlaces(lv) {
    const pcx = playerX + SIZE / 2, pcy = playerY + SIZE / 2;
    const offset = (game.clientWidth - OB_COLS * SIZE) / 2;      // centers the grid
    const places = [];
    const used = new Set();

    for (let tries = 0; places.length < lv.count && tries < 400; tries++) {
        let col, row;
        if (places.length < lv.near) {
            // close to you: somewhere in a ring around the player
            const a = Math.random() * Math.PI * 2;
            const d = lv.minDist + Math.random() * 60;
            col = Math.round((pcx + Math.cos(a) * d - offset - SIZE / 2) / SIZE);
            row = Math.round((pcy + Math.sin(a) * d - offset - SIZE / 2) / SIZE);
        } else {
            col = Math.floor(Math.random() * OB_COLS);
            row = Math.floor(Math.random() * OB_COLS);
        }
        if (col < 0 || row < 0 || col >= OB_COLS || row >= OB_COLS) continue;
        if (used.has(col + "," + row)) continue;

        const x = offset + col * SIZE + (SIZE - OB) / 2;
        const y = offset + row * SIZE + (SIZE - OB) / 2;
        if (Math.hypot(x + OB / 2 - pcx, y + OB / 2 - pcy) < lv.minDist) continue;

        used.add(col + "," + row);
        places.push({ x, y });
    }
    return places;
}

// Does a player standing at (x, y) touch a tombstone?
function hitsObstacle(x, y) {
    const l = x + 6, t = y + 6, r = x + SIZE - 6, b = y + SIZE - 6;   // slightly smaller than the emoji
    return obstacles.some((o) => l < o.x + OB && r > o.x && t < o.y + OB && b > o.y);
}

function removeWarns() {
    obstacleWarns.forEach((w) => w.remove());
    obstacleWarns = [];
}

// The warning ends: the tombstones rise from the ground
function spawnObstacles() {
    sfx("tomb");
    const lv = OBSTACLE_LEVELS[obstacleLevel];
    removeWarns();
    obstaclePlaces.forEach((p) => {
        // skip any spot you walked into during the warning
        const l = playerX + 6, t = playerY + 6, r = playerX + SIZE - 6, b = playerY + SIZE - 6;
        if (l < p.x + OB && r > p.x && t < p.y + OB && b > p.y) return;

        const el = document.createElement("div");
        el.className = "obstacle";
        el.textContent = "RIP";
        el.style.left = p.x + "px";
        el.style.top = p.y + "px";
        el.style.borderColor = lv.color;
        game.appendChild(el);
        el.animate([
            { transform: "scale(1, 0)" },
            { transform: "scale(1.1, 1.15)", offset: 0.7 },
            { transform: "scale(1, 1)" }
        ], { duration: 260, easing: "ease-out" });
        obstacles.push({ el, x: p.x, y: p.y, life: lv.life });
    });
    obstaclePlaces = [];
}

// Tombstones blink near the end, then disappear
function updateObstacles(dt) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.life -= dt;
        if (o.life < 1.5) o.el.classList.add("fading");
        if (o.life <= 0) {
            o.el.remove();
            obstacles.splice(i, 1);
        }
    }
}

// ----- Phase 2: the vampire lord -----
// He attacks in a FIXED ORDER (see PATTERN). Every attack shows a warning first. All fire kills you in one hit.

function later(seconds, fn) { timers.push({ t: seconds, fn }); }

function runTimers(dt) {
    for (const item of [...timers]) {
        item.t -= dt;
        if (item.t <= 0 && timers.includes(item)) {
            timers.splice(timers.indexOf(item), 1);
            item.fn();
        }
    }
}

function makeOrb(cx, cy, angle, speed, deadly) {
    const el = document.createElement("div");
    el.className = "orb" + (deadly ? " deadly" : "");
    el.textContent = "\uD83D\uDD25";
    game.appendChild(el);
    orbs.push({ el, deadly, x: cx - 12, y: cy - 12,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
}

function angleToPlayer(cx, cy) {
    return Math.atan2(playerY + SIZE / 2 - cy, playerX + SIZE / 2 - cx);
}

function angleDiff(a, b) {
    const d = a - b;
    return Math.atan2(Math.sin(d), Math.cos(d));
}

// A ring of fire with a hole in it (gapAngle = middle of the hole, gapHalf = half of its size in radians)
function ringWave(count, speed, gapAngle, gapHalf) {
    const cx = ghostX + SIZE / 2, cy = ghostY + SIZE / 2;
    for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        if (Math.abs(angleDiff(a, gapAngle)) < gapHalf) continue;
        makeOrb(cx, cy, a, speed, true);
    }
}

// RINGS: waves of fire. Each wave has a hole, and the hole MOVES every wave, so you have to keep sliding through
function ringsAttack() {
    const waves = bossPhase3 ? 6 : bossRage ? 5 : 4;
    const speed = bossRage ? FIRE_SPEED + 25 : FIRE_SPEED;
    for (let w = 0; w < waves; w++) {
        later(w * 0.55, () => {
            const cx = ghostX + SIZE / 2, cy = ghostY + SIZE / 2;
            const side = (w % 2 === 0 ? 1 : -1) * 0.8;             // the hole is NEVER right where you stand
            sfx("whoosh");
            ringWave(24, speed, angleToPlayer(cx, cy) + side, 0.42);
        });
    }
}

// SPIRAL: 3 arms of fire spin out, then suddenly spin the other way. Stay in the gaps and change direction with them
function spiralAttack() {
    const arms = bossRage ? 4 : 3, steps = 26;
    const speed = bossRage ? 165 : 150;
    const dir0 = Math.random() < 0.5 ? 1 : -1;
    let ang = Math.random() * Math.PI * 2;
    for (let i = 0; i < steps; i++) {
        later(i * 0.09, () => {
            const cx = ghostX + SIZE / 2, cy = ghostY + SIZE / 2;
            if (i % 4 === 0) sfx("fireball");
            ang += (i < steps / 2 ? dir0 : -dir0) * 0.14;
            for (let k = 0; k < arms; k++) makeOrb(cx, cy, ang + k * 2 * Math.PI / arms, speed, true);
        });
    }
}

// WALL: a wall of fire sweeps across the arena with a 2-ball hole (shown in green first).
// 3 walls in a row, the hole jumps far each time. The side it comes from rotates: top, left, bottom, right
function wallAttack() {
    const dirs = ["down", "right", "up", "left"];
    const dir = dirs[wallCount % 4];
    wallCount++;
    const W = game.clientWidth, H = game.clientHeight;
    const len = (dir === "down" || dir === "up") ? W : H;
    const GAP = 34;
    const n = Math.floor(len / GAP) + 1;                    // fire balls per wall
    const waves = bossPhase3 ? 5 : bossRage ? 4 : 3;
    const speed = bossPhase3 ? 180 : bossRage ? 165 : 140;
    let prev = -10;
    for (let k = 0; k < waves; k++) {
        let g = 1;
        for (let tries = 0; tries < 30; tries++) {
            g = 1 + Math.floor(Math.random() * (n - 3));
            if (Math.abs(g - prev) >= 3) break;             // the hole jumps at least 3 spots
        }
        prev = g;
        const c = (g + 0.5) * GAP;                          // middle of the hole
        const t0 = k * 0.95;
        let marker = null;
        later(t0, () => {                                   // green box = where the hole will be
            marker = makeEl("gap-warn", "");
            if (dir === "down" || dir === "up") {
                marker.style.left = (c - 45) + "px"; marker.style.width = "90px"; marker.style.height = "14px";
                marker.style.top = (dir === "down" ? 2 : H - 16) + "px";
            } else {
                marker.style.top = (c - 45) + "px"; marker.style.height = "90px"; marker.style.width = "14px";
                marker.style.left = (dir === "right" ? 2 : W - 16) + "px";
            }
            marker.classList.remove("hidden");
            fx.push(marker);
        });
        later(t0 + 0.65, () => {
            if (marker) marker.remove();
            sfx("whoosh");
            for (let j = 0; j < n; j++) {
                if (j === g || j === g + 1) continue;
                const p = j * GAP;
                if (dir === "down")       makeOrb(p, -14, Math.PI / 2, speed, true);
                else if (dir === "up")    makeOrb(p, H + 14, -Math.PI / 2, speed, true);
                else if (dir === "right") makeOrb(-14, p, 0, speed, true);
                else                      makeOrb(W + 14, p, Math.PI, speed, true);
            }
        });
    }
}

// BLOOD MOON (phase 3 only): a slow 4-arm spiral that keeps flipping direction, AND rings with holes. Roll through it!
function bloodMoonAttack() {
    const steps = 32;
    let ang = Math.random() * Math.PI * 2, dir = Math.random() < 0.5 ? 1 : -1;
    for (let i = 0; i < steps; i++) {
        later(i * 0.12, () => {
            const cx = ghostX + SIZE / 2, cy = ghostY + SIZE / 2;
            if (i > 0 && i % 11 === 0) dir = -dir;             // flips direction every ~1.3 seconds
            ang += dir * 0.11;
            if (i % 4 === 0) sfx("fireball");
            for (let k = 0; k < 4; k++) makeOrb(cx, cy, ang + k * Math.PI / 2, 140, true);
        });
    }
    for (let w = 0; w < 3; w++) {
        later(0.9 + w * 1.1, () => {
            const cx = ghostX + SIZE / 2, cy = ghostY + SIZE / 2;
            sfx("whoosh");
            ringWave(24, 165, angleToPlayer(cx, cy) + (w % 2 === 0 ? 0.9 : -0.9), 0.5);
        });
    }
}

// METEORS: a trail of explosions lands where you are HEADING (red circle first). Never run in a straight line
function meteorTrail() {
    const n = bossPhase3 ? 13 : bossRage ? 10 : 7;
    for (let i = 0; i < n; i++) {
        later(i * 0.4, () => {
            const lead = 0.8;
            dropMeteor(playerX + SIZE / 2 + playerVX * PLAYER_SPEED * lead,
                       playerY + SIZE / 2 + playerVY * PLAYER_SPEED * lead);
            if (bossRage && i % 2 === 1) dropMeteor(Math.random() * game.clientWidth, Math.random() * game.clientHeight);
        });
    }
}

function dropMeteor(x, y) {
    x = Math.max(25, Math.min(game.clientWidth - 25, x));
    y = Math.max(25, Math.min(game.clientHeight - 25, y));
    const warn = makeEl("meteor-warn", "");
    warn.style.width = warn.style.height = (METEOR_RADIUS * 2) + "px";
    warn.style.left = (x - METEOR_RADIUS) + "px";
    warn.style.top = (y - METEOR_RADIUS) + "px";
    warn.classList.remove("hidden");
    fx.push(warn);
    later(0.9, () => { warn.remove(); explode(x, y); });
}

function explode(x, y) {
    sfx("boom");
    spark(x, y, 24, "#ff7a00", 280, 0.55, 5);
    spark(x, y, 10, "#ffe27a", 200, 0.4, 3);
    shake(3);
    const boom = makeEl("meteor-boom", "");
    boom.style.width = boom.style.height = (METEOR_RADIUS * 2) + "px";
    boom.style.left = (x - METEOR_RADIUS) + "px";
    boom.style.top = (y - METEOR_RADIUS) + "px";
    boom.classList.remove("hidden");
    fx.push(boom);
    boom.animate([{ transform: "scale(0.3)", opacity: 1 }, { transform: "scale(1.15)", opacity: 0 }],
                 { duration: 450, easing: "ease-out" }).onfinish = () => boom.remove();
    if (Math.hypot(playerX + SIZE / 2 - x, playerY + SIZE / 2 - y) < METEOR_RADIUS + 4) hurt(1);
}

// SLAM: a red circle around the boss, then a deadly blast and a ring of fire (with a hole). He does this when you hug him
function slamBlast() {
    sfx("slam");
    spark(ghostX + SIZE / 2, ghostY + SIZE / 2, 40, "#ff5a00", 320, 0.7, 5);
    const cx = ghostX + SIZE / 2, cy = ghostY + SIZE / 2;
    if (slamWarn) { slamWarn.remove(); slamWarn = null; }
    const boom = makeEl("meteor-boom", "");
    boom.style.width = boom.style.height = (SLAM_RADIUS * 2) + "px";
    boom.style.left = (cx - SLAM_RADIUS) + "px";
    boom.style.top = (cy - SLAM_RADIUS) + "px";
    boom.classList.remove("hidden");
    fx.push(boom);
    boom.animate([{ transform: "scale(0.3)", opacity: 1 }, { transform: "scale(1.1)", opacity: 0 }],
                 { duration: 500, easing: "ease-out" }).onfinish = () => boom.remove();
    shake(8);
    if (Math.hypot(playerX + SIZE / 2 - cx, playerY + SIZE / 2 - cy) < SLAM_RADIUS) {
        hurt(2);                                               // the slam hurts the most
        if (gameOver) return;
    }
    ringWave(18, 160, angleToPlayer(cx, cy) + (Math.random() < 0.5 ? 0.6 : -0.6), 0.42);
}

// CROSS: 4 beams spin around the boss (he aims them first). Enraged: faster, and they suddenly spin the other way
function makeBeamEls(cls, arms, ox, oy) {
    const els = [];
    for (let k = 0; k < arms; k++) {
        const el = makeEl(cls, "");
        el.style.left = ox + "px";
        el.style.top = oy + "px";
        el.classList.remove("hidden");
        fx.push(el);
        els.push(el);
    }
    return els;
}

function rotateBeamEls(els, angle) {
    els.forEach((el, k) => { el.style.transform = `rotate(${angle + k * 2 * Math.PI / els.length}rad)`; });
}

function startBeam() {
    sfx("beam");
    beamWarns.forEach((w) => w.remove());
    beamWarns = [];
    const ox = ghostX + SIZE / 2, oy = ghostY + SIZE / 2;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const cross = beamArms > 1;
    beam = {
        els: makeBeamEls("beam", beamArms, ox, oy), ox, oy, dir,
        a: cross ? beamLock : beamLock - dir * 0.8,
        speed: cross ? (bossRage ? CROSS_SPEED * 1.25 : CROSS_SPEED) : BEAM_SPEED,
        t: cross ? (bossRage ? 3.0 : 2.4) : 1.3,
        flipAt: (cross && bossRage) ? 1.5 : 0
    };
    rotateBeamEls(beam.els, beam.a);
}

function updateBeam(dt) {
    if (!beam) return;
    beam.t -= dt;
    if (beam.flipAt && beam.t <= beam.flipAt) { beam.dir = -beam.dir; beam.flipAt = 0; }   // enraged: surprise reverse
    beam.a += beam.dir * beam.speed * dt;
    rotateBeamEls(beam.els, beam.a);

    const dx = playerX + SIZE / 2 - beam.ox, dy = playerY + SIZE / 2 - beam.oy;
    for (let k = 0; k < beam.els.length; k++) {
        const a = beam.a + k * 2 * Math.PI / beam.els.length;
        const along = dx * Math.cos(a) + dy * Math.sin(a);
        const side = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
        if (along > 0 && along < BEAM_LEN && side < BEAM_HALF) {
            hurt(1);
            if (gameOver) return;
        }
    }
    if (beam.t <= 0) { beam.els.forEach((e) => e.remove()); beam = null; }
}

// ----- The boss brain: walk -> warn -> attack -> walk ... (and bat form at low HP) -----

function bossWalk(dt, speed) {
    const dx = playerX - ghostX, dy = playerY - ghostY;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    const step = Math.min(speed * dt, d);
    ghostX = clamp(ghostX + dx / d * step);
    ghostY = clamp(ghostY + dy / d * step);
}

function checkRage() {
    if (bossRage || ghostHp > BOSS_HP * BOSS_RAGE_AT) return;
    bossRage = true;
    ghost.classList.add("rage");
    banner("ENRAGED", "#ff3b00");
    sfx("roar");
    setMusicLevel(2);
    showToast("HE IS ENRAGED!\nFASTER AND DEADLIER");
}

// PHASE 3: at 15% HP he roars, blows all the fire away, and goes into his FINAL FORM
function checkPhase3() {
    if (bossPhase3 || ghostHp <= 0 || ghostHp > BOSS_HP * BOSS_P3_AT) return;
    bossPhase3 = true;
    bossRage = true;
    clearEffects();                                            // the roar blows his fire away
    ghost.classList.add("rage", "phase3");
    ghost.classList.remove("casting");
    game.classList.add("phase3");
    bossBar.classList.add("final");
    roarTime = 1.6;                                            // he roars: time to reload!
    bossState = "walk";
    bossTime = 0.5;
    setMusicLevel(3);
    banner("FINAL FORM", "#ff0044");
    sfx("roar");
    showToast("FINAL FORM!\nHE ATTACKS NON-STOP");
    shake(8);
    if (hearts < HEARTS) {                                     // a last bit of help: 1 heart back
        hearts++;
        updateHearts();
        popup("+1 \u2764", playerX + SIZE / 2, playerY, "#ff4d6d");
    }
}

function moveBoss(dt) {
    if (bossRage && !batForm && particles.length < 90 && Math.random() < 7 * dt) {      // enraged: the boss burns
        spark(ghostX + SIZE / 2 + (Math.random() - 0.5) * 30, ghostY + SIZE / 2 + (Math.random() - 0.5) * 30, 1, "#ff3b00", 20, 0.8, 4, 70);
    }
    if (batForm) return;                                       // bat form: the bats do the moving
    bossTime -= dt;

    if (bossState === "walk") {
        bossWalk(dt, bossRage ? BOSS_SPEED * 1.3 : BOSS_SPEED);
        if (bossTime <= 0) bossPickNext();
    } else if (bossState === "wind") {                         // standing still and glowing: DODGE IS COMING
        if (bossTime <= 0) bossFire();
    } else if (bossState === "act") {
        if (!ATK[bossAtk].still) bossWalk(dt, BOSS_SPEED * 0.5);
        if (bossTime <= 0) {
            bossState = "walk";
            bossTime = bossAtk === "blood" ? BOSS_REST_BLOOD : bossPhase3 ? BOSS_REST_P3 : bossRage ? BOSS_REST_RAGE : BOSS_REST;
        }
    } else if (bossState === "stagger") {
        if (bossTime <= 0) {
            ghost.classList.remove("stunned");
            bossState = "walk";
            bossTime = 0.6;
        }
    }
}

function bossPickNext() {
    // low HP: time for bat form
    if (batStage < BAT_FORM_AT.length && ghostHp <= BOSS_HP * BAT_FORM_AT[batStage]) { startBatForm(); return; }

    const gcx = ghostX + SIZE / 2, gcy = ghostY + SIZE / 2;
    const close = Math.hypot(playerX + SIZE / 2 - gcx, playerY + SIZE / 2 - gcy) < SLAM_IF_CLOSER;
    let name;
    if (close) {
        name = "slam";                                         // hugging the boss gets you slammed away
    } else {
        const list = bossPhase3 ? PATTERN_P3 : bossRage ? PATTERN_RAGE : PATTERN;
        name = list[bossStep % list.length];
        bossStep++;
    }
    bossAtk = name;
    bossState = "wind";
    bossTime = ATK[name].wind * (bossPhase3 ? 0.7 : bossRage ? 0.8 : 1);
    ghost.classList.add("casting");

    const label = { rings: "FIRE RINGS!", spiral: "FIRE SPIRAL!", wall: "FIRE WALL!",
                    meteors: "METEORS!", cross: "CROSS FIRE!", slam: "FIRE SLAM!", blood: "BLOOD MOON!" };
    popup(label[name], gcx, ghostY, "#ff5a00");
    sfx("warn");
    if (name === "blood") { banner("BLOOD MOON", "#ff0044"); shake(5); }

    if (name === "slam") {
        slamWarn = makeEl("meteor-warn", "");
        slamWarn.style.width = slamWarn.style.height = (SLAM_RADIUS * 2) + "px";
        slamWarn.style.left = (gcx - SLAM_RADIUS) + "px";
        slamWarn.style.top = (gcy - SLAM_RADIUS) + "px";
        slamWarn.classList.remove("hidden");
        fx.push(slamWarn);
    } else if (name === "cross") {
        beamArms = 4;
        beamLock = angleToPlayer(gcx, gcy);                    // he aims at where you are NOW
        beamWarns = makeBeamEls("beam-warn", 4, gcx, gcy);
        rotateBeamEls(beamWarns, beamLock);
    }
}

function bossFire() {
    ghost.classList.remove("casting");
    if (bossAtk === "rings") ringsAttack();
    else if (bossAtk === "spiral") spiralAttack();
    else if (bossAtk === "wall") wallAttack();
    else if (bossAtk === "meteors") meteorTrail();
    else if (bossAtk === "cross") startBeam();
    else if (bossAtk === "slam") slamBlast();
    else if (bossAtk === "blood") bloodMoonAttack();
    if (gameOver) return;
    bossState = "act";
    bossTime = ATK[bossAtk].dur * (bossRage ? 0.9 : 1);
}

// ----- Bat form: he turns into bats. Shoot ALL of them to bring him back (and stagger him) -----

function startBatForm() {
    const gcx = ghostX + SIZE / 2, gcy = ghostY + SIZE / 2;
    batStage++;
    sfx("bats");
    clearEffects();                                            // old fire disappears
    ghost.classList.remove("casting", "stunned");
    ghost.classList.add("batform");                            // the vampire is gone...
    batForm = true;
    batFormTime = BAT_FORM_TIME;
    bossState = "bats";

    for (let i = 0; i < BAT_FORM_COUNT; i++) {                 // ...5 bats fly out of him
        const a = (i / BAT_FORM_COUNT) * Math.PI * 2;
        const el = document.createElement("div");
        el.className = "fbat";
        el.innerHTML = "<span>" + BAT_ART + "</span>";
        game.appendChild(el);
        fbats.push({ el, x: gcx - 18 + Math.cos(a) * 20, y: gcy - 18 + Math.sin(a) * 20,
                     mode: "fly", t: 0.9 + i * 0.45, phase: Math.random() * 6,
                     ang: a, spin: (i % 2 ? 1 : -1) * (0.9 + Math.random() * 0.6),
                     dive: i % 2 === 0, bite: 0, dx: 0, dy: 0 });
    }
    popup("BAT FORM!", gcx, ghostY, "#b36bff");
    banner("HE TURNS INTO BATS", "#b36bff");
    showToast("SHOOT ALL " + BAT_FORM_COUNT + " BATS!\nDODGE THEIR FIRE");
    setBossBar();
}

function updateBossBats(dt) {
    if (!batForm || gameOver) return;
    const W = game.clientWidth, H = game.clientHeight;
    const pcx = playerX + SIZE / 2, pcy = playerY + SIZE / 2;
    batFormTime -= dt;

    for (const b of fbats) {
        b.t -= dt;
        b.phase += dt * 4;
        b.bite = Math.max(0, b.bite - dt);
        const cx = b.x + 18, cy = b.y + 18;

        if (b.mode === "fly") {
            // flutter around the player, in and out
            b.ang += b.spin * dt;
            const R = 125 + Math.sin(b.phase) * 45;
            const dx = pcx + Math.cos(b.ang) * R - cx, dy = pcy + Math.sin(b.ang) * R - cy;
            const d = Math.hypot(dx, dy) || 1;
            const step = Math.min(BAT_FORM_SPEED * dt, d);
            b.x += dx / d * step;
            b.y += dy / d * step;
            if (b.t <= 0) {                                    // red flash = it is about to attack
                b.mode = b.dive ? "aimDive" : "aimSpit";
                b.t = 0.55;
                b.el.classList.add("warn");
                if (b.mode === "aimDive") sfx("screech");
            }
        } else if (b.mode === "aimSpit") {                     // hovers, then spits a fireball at you
            if (b.t <= 0) {
                sfx("spit");
                makeOrb(cx, cy, Math.atan2(pcy - cy, pcx - cx), 175, true);
                b.mode = "fly"; b.t = 1 + Math.random(); b.dive = true;
                b.el.classList.remove("warn");
            }
        } else if (b.mode === "aimDive") {                     // hovers, then dives at where you were
            if (b.t <= 0) {
                const dx = pcx - cx, dy = pcy - cy, d = Math.hypot(dx, dy) || 1;
                b.dx = dx / d; b.dy = dy / d;
                b.mode = "dive"; b.t = 0.65;
            }
        } else if (b.mode === "dive") {
            b.x += b.dx * BAT_DIVE_SPEED * dt;
            b.y += b.dy * BAT_DIVE_SPEED * dt;
            if (b.t <= 0) {
                b.mode = "fly"; b.t = 1.2 + Math.random(); b.dive = false;
                b.el.classList.remove("warn");
            }
        }

        b.x = Math.max(-10, Math.min(W - 26, b.x));            // stay in the arena
        b.y = Math.max(-10, Math.min(H - 26, b.y));
        b.el.style.transform = `translate(${b.x}px, ${b.y}px)`;

        if (b.bite <= 0 && Math.hypot(b.x + 18 - pcx, b.y + 18 - pcy) < 28) {   // a bite slows you (then fire gets you)
            slowTime = SLOW_TIME;
            b.bite = 1.2;
            sfx("bite");
            popup("BITTEN!", pcx, playerY, "#b36bff");
        }
    }

    if (batForm && batFormTime <= 0) endBatForm(false);        // too slow!
}

// The shotgun in bat form: hits every bat in front of you (inside the cone and in range)
function shootBats(pcx, pcy) {
    for (let i = fbats.length - 1; i >= 0; i--) {
        const b = fbats[i];
        const bx = b.x + 18, by = b.y + 18;
        const d = Math.hypot(bx - pcx, by - pcy);
        const off = Math.abs(angleDiff(Math.atan2(by - pcy, bx - pcx), aim));
        if (d <= RANGE && (off < 0.38 || d < 45)) {
            popup("HIT!", bx, b.y, "#e6c97a");
            spark(bx, by, 14, "#b36bff", 200, 0.5, 4);
            sfx("batdie");
            lastBat = { x: bx, y: by };
            b.el.remove();
            fbats.splice(i, 1);
        }
    }
    setBossBar();
    if (batForm && fbats.length === 0) endBatForm(true);
}

function endBatForm(killed) {
    let x = lastBat.x, y = lastBat.y;
    if (!killed) {                                             // he reforms in the middle of his bats
        if (fbats.length) {
            x = fbats.reduce((s, b) => s + b.x + 18, 0) / fbats.length;
            y = fbats.reduce((s, b) => s + b.y + 18, 0) / fbats.length;
        }
        const pcx = playerX + SIZE / 2, pcy = playerY + SIZE / 2;
        const d = Math.hypot(x - pcx, y - pcy);
        if (d < 120) {                                         // never pop up on top of you
            const a = d > 1 ? Math.atan2(y - pcy, x - pcx) : Math.random() * Math.PI * 2;
            x = pcx + Math.cos(a) * 130;
            y = pcy + Math.sin(a) * 130;
        }
    }
    fbats.forEach((b) => b.el.remove());
    fbats.length = 0;
    batForm = false;
    ghostX = clamp(x - SIZE / 2);
    ghostY = clamp(y - SIZE / 2);
    knockX = 0; knockY = 0;
    ghost.classList.remove("batform");
    ghost.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    setBossBar();

    const gcx = ghostX + SIZE / 2;
    if (killed) {                                              // all bats shot: he falls back into a vampire, stunned
        bossState = "stagger";
        bossTime = BAT_STAGGER;
        ghost.classList.add("stunned");
        popup("STAGGERED!", gcx, ghostY, "#ffffff");
        if (hearts < HEARTS) {                                 // reward: you get a heart back
            hearts++;
            updateHearts();
            popup("+1 \u2764", playerX + SIZE / 2, playerY, "#ff4d6d");
        }
        sfx("stagger");
        showToast("HE IS OPEN!\nSHOOT HIM! (BONUS DAMAGE)");
    } else {                                                   // too slow: he heals and punishes you right away
        ghostHp = Math.min(BOSS_HP, ghostHp + BAT_HEAL);
        setBossBar();
        popup("HE REFORMED!", gcx, ghostY, "#b36bff");
        sfx("heal");
        showToast("TOO SLOW! HE HEALED");
        bossAtk = "rings";
        bossState = "wind";
        bossTime = 0.7;
        ghost.classList.add("casting");
    }
}

// ----- Boss bar, banner, phase 2 -----

const bossBar = document.createElement("div");
bossBar.className = "boss-bar hidden";
bossBar.innerHTML = `<div class="boss-name">${BOSS_NAME}</div>
    <div class="boss-track"><div class="boss-chip"></div><div class="boss-fill"></div></div>`;
game.appendChild(bossBar);

function setBossBar() {
    const pct = (Math.max(ghostHp, 0) / BOSS_HP * 100) + "%";
    bossBar.querySelector(".boss-fill").style.width = pct;
    bossBar.querySelector(".boss-chip").style.width = pct;   // the yellow "chip" lags behind
    bossBar.querySelector(".boss-name").textContent = batForm ? BOSS_NAME + "   \uD83E\uDD87 x" + fbats.length : BOSS_NAME;
}

function banner(text, color) {
    const el = document.createElement("div");
    el.className = "banner";
    el.textContent = text;
    el.style.color = color;
    game.appendChild(el);
    el.animate([
        { opacity: 0, letterSpacing: "2px" },
        { opacity: 1, offset: 0.25 },
        { opacity: 1, offset: 0.75 },
        { opacity: 0, letterSpacing: "14px" }
    ], { duration: 2400 }).onfinish = () => el.remove();
}

function enterPhase2() {
    phase2 = true;
    clearEffects();                            // old fireballs, bats and tombstones vanish
    game.classList.add("phase2");
    ghost.classList.add("phase2");
    bossBar.classList.remove("immune");
    ghostHp = BOSS_HP;
    setBossBar();

    mode = "chase"; castSkill = "";
    roarTime = 2;                              // it roars for 2 seconds: time to reload!
    knockX = 0; knockY = 0; stunTime = 0;
    // never wake up right on top of you: move the boss away if it is too close
    const pdx = playerX - ghostX, pdy = playerY - ghostY, pd = Math.hypot(pdx, pdy);
    if (pd < 170) {
        const a = pd > 1 ? Math.atan2(-pdy, -pdx) : Math.random() * Math.PI * 2;
        ghostX = clamp(playerX + Math.cos(a) * 180);
        ghostY = clamp(playerY + Math.sin(a) * 180);
        if (Math.hypot(playerX - ghostX, playerY - ghostY) < 120) {      // cornered: go to the opposite corner instead
            ghostX = clamp(MAX - playerX); ghostY = clamp(MAX - playerY);
        }
    }
    bossState = "walk"; bossTime = 1.5; bossAtk = "";
    bossStep = 0; wallCount = 0; bossRage = false;
    batForm = false; batStage = 0;
    hearts = HEARTS; invincible = 0;                   // hearts appear in the boss fight
    updateHearts();
    heartsEl.classList.remove("hidden");

    banner("PHASE 2", "#e6c97a");
    sfx("roar");
    bossPhase3 = false;
    startMusic(1);
    showToast("THE VAMPIRE LORD AWAKENS!\nFLASH STEP RECHARGES FASTER NOW");
    rollCool = Math.min(rollCool, ROLL_COOLDOWN);      // your roll is ready at the start of the boss fight
    game.animate([
        { transform: "translate(0, 0)" }, { transform: "translate(-6px, 4px)" },
        { transform: "translate(6px, -4px)" }, { transform: "translate(-4px, -3px)" },
        { transform: "translate(0, 0)" }
    ], { duration: 500 });
}

// ----- Bats -----

function spawnBats() {
    const gcx = ghostX + SIZE / 2, gcy = ghostY + SIZE / 2;
    const n = angry ? BAT_COUNT_ANGRY : BAT_COUNT;
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;                       // start in a circle around the ghost
        const el = document.createElement("div");
        el.className = "bat";
        el.innerHTML = "<span>" + BAT_ART + "</span>";
        game.appendChild(el);
        bats.push({ el, x: gcx - 15 + Math.cos(a) * 25, y: gcy - 15 + Math.sin(a) * 25,
                    life: BAT_LIFE, phase: Math.random() * 6 });
    }
}

function updateBats(dt) {
    const pcx = playerX + SIZE / 2, pcy = playerY + SIZE / 2;
    for (let i = bats.length - 1; i >= 0; i--) {
        const b = bats[i];
        b.life -= dt;
        b.phase += dt * 9;

        // fly towards the player, wobbling left and right a little
        const dx = pcx - (b.x + 15), dy = pcy - (b.y + 15);
        const d = Math.hypot(dx, dy) || 1;
        const wobble = Math.sin(b.phase) * 45;
        b.x += (dx / d * BAT_SPEED + (-dy / d) * wobble) * dt;
        b.y += (dy / d * BAT_SPEED + (dx / d) * wobble) * dt;
        b.el.style.transform = `translate(${b.x}px, ${b.y}px)`;
        if (b.life < 0.5) b.el.classList.add("fading");

        if (d < 26) {                                          // the bat bit the player
            if (BAT_DEADLY) { lose("The bats got you!"); return; }
            slowTime = SLOW_TIME;
            sfx("bite");
            popup("BITTEN!", pcx, playerY, "#b36bff");
            b.el.remove();
            bats.splice(i, 1);
        } else if (b.life <= 0) {                              // 2 seconds are over
            b.el.remove();
            bats.splice(i, 1);
        }
    }
}

// Remove everything the skills created (used at game over and restart)
function clearEffects() {
    orbs.forEach((o) => o.el.remove());
    orbs.length = 0;
    obstacles.forEach((o) => o.el.remove());
    obstacles.length = 0;
    bats.forEach((b) => b.el.remove());
    bats.length = 0;
    fbats.forEach((b) => b.el.remove());
    fbats.length = 0;
    particles.forEach((p) => p.el.remove());
    particles.length = 0;
    timers.length = 0;
    fx.forEach((e) => e.remove());
    fx.length = 0;
    beam = null; beamWarns = []; slamWarn = null;
    removeWarns();
    markerEl.classList.add("hidden");
    ringEl.classList.add("hidden");
    pullEl.classList.add("hidden");
    decoys.forEach((d) => d.el.remove());
    decoys.length = 0;
    boltWarns.forEach((w) => w.remove());
    boltWarns = []; boltPlaces = [];
    ghost.classList.remove("casting");
}

// ---------- Shotgun ----------

// At 20 seconds the gun falls from the sky onto a random spot
function spawnGun() {
    gunSpawned = true;
    let x = 0, y = 0;
    for (let i = 0; i < 50; i++) {
        x = Math.random() * MAX;
        y = Math.random() * MAX;
        if (Math.hypot(x - playerX, y - playerY) > 120 &&
            Math.hypot(x - ghostX, y - ghostY) > 80) break;   // not too close to either
    }
    pickX = x; pickY = y;
    pickupActive = true;
    pickup.style.transform = `translate(${x}px, ${y}px)`;
    pickup.classList.remove("hidden", "landed");

    // Drop animation: falls, bounces, lands
    const fall = pickupInner.animate([
        { transform: "translateY(-260px)", opacity: 0 },
        { transform: "translateY(0)", opacity: 1, offset: 0.6 },
        { transform: "translateY(-22px)", offset: 0.78 },
        { transform: "translateY(0)" }
    ], { duration: 900, easing: "ease-in" });
    fall.onfinish = () => pickup.classList.add("landed");

    showToast("THE GHOST IS IMMUNE!\nSURVIVE UNTIL PHASE 2");
}

function collectGun() {
    hasGun = true;
    sfx("pickup");
    pickupActive = false;
    pickup.classList.add("hidden");
    gunEl.classList.remove("hidden");
    hud.classList.remove("invisible");
    setLocked(false);
    updateAmmoUI();
    showToast("SHOTGUN! SPACE = FIRE, R = RELOAD");
}

function spawnPellet(sx, sy, angle, length) {
    const p = document.createElement("div");
    p.className = "pellet";
    game.appendChild(p);
    const ex = sx + Math.cos(angle) * length;
    const ey = sy + Math.sin(angle) * length;
    const a = p.animate([
        { transform: `translate(${sx - 3}px, ${sy - 3}px)`, opacity: 1 },
        { transform: `translate(${ex - 3}px, ${ey - 3}px)`, opacity: 0.2 }
    ], { duration: 170, easing: "ease-out" });
    a.onfinish = () => p.remove();
}

function muzzleFlash(x, y) {
    const f = document.createElement("div");
    f.className = "flash";
    game.appendChild(f);
    const a = f.animate([
        { transform: `translate(${x}px, ${y}px) scale(0.4)`, opacity: 1 },
        { transform: `translate(${x}px, ${y}px) scale(1.7)`, opacity: 0 }
    ], { duration: 130, easing: "ease-out" });
    a.onfinish = () => f.remove();
}

function fire() {
    if (!hasGun || gameOver) return;
    if (ammo <= 0) {                           // out of shells
        popup("EMPTY", playerX + SIZE / 2, playerY, "#ffffff");
        sfx("empty");
        startReload();
        return;
    }
    if (cooldown > 0) return;

    ammo--;
    sfx("shoot");
    if (navigator.vibrate) navigator.vibrate(30);     // phone buzz
    cooldown = SHOT_COOLDOWN;
    reloading = false;                         // shooting stops the reload
    gunInner.classList.remove("reloading");

    const pcx = playerX + SIZE / 2, pcy = playerY + SIZE / 2;
    const gcx = ghostX + SIZE / 2, gcy = ghostY + SIZE / 2;
    const tipX = pcx + Math.cos(aim) * 52;
    const tipY = pcy + Math.sin(aim) * 52;

    // Fire animation: flash + flying pellets + gun kick + screen shake + pump
    muzzleFlash(tipX, tipY);
    spark(tipX, tipY, 9, "#ffd23f", 240, 0.25, 3);
    for (let i = 0; i < PELLETS; i++) {
        const angle = aim + (Math.random() - 0.5) * 0.5;
        spawnPellet(tipX, tipY, angle, RANGE * (0.85 + Math.random() * 0.3));
    }
    gunInner.animate([
        { transform: "translateX(0) rotate(0)" },
        { transform: "translateX(-9px) rotate(-14deg)" },
        { transform: "translateX(0) rotate(0)" }
    ], { duration: 200, easing: "ease-out" });
    gunInner.querySelector(".pump").animate([
        { transform: "translateX(0)" },
        { transform: "translateX(-7px)" },
        { transform: "translateX(0)" }
    ], { duration: 260, delay: 180 });
    game.animate([
        { transform: "translate(0, 0)" },
        { transform: `translate(${-Math.cos(aim) * 5}px, ${-Math.sin(aim) * 5}px)` },
        { transform: "translate(0, 0)" }
    ], { duration: 140 });

    // Bat form: you can only hit the bats. Otherwise: did the ghost get hit?
    if (batForm) shootBats(pcx, pcy);
    else if (Math.hypot(gcx - pcx, gcy - pcy) <= RANGE) hitGhost();

    if (!gameOver && ammo === 0) startReload();   // auto reload when empty
    updateAmmoUI();
}

function hitGhost() {
    if (!phase2) {
        sfx("immune");
        spark(ghostX + SIZE / 2, ghostY + SIZE / 2, 8, "#c04dff", 160, 0.4, 4);
        popup("IMMUNE!", ghostX + SIZE / 2, ghostY, "#c04dff");   // until phase 2, shots only stun it
        cancelCast();
        stunTime = angry ? HARD_STUN_TIME : STUN_TIME;
        knockX = Math.cos(aim) * 380;
        knockY = Math.sin(aim) * 380;
        mode = "chase";
        dashTimer = angry ? HARD_DASH_EVERY : DASH_EVERY;
        ghost.classList.remove("warning");
        ghost.classList.add("stunned");
        return;
    }

    // Phase 2: it takes damage, but it never flinches (like a real boss)
    const dist = Math.hypot(ghostX - playerX, ghostY - playerY);
    let dmg = dist < 90 ? DMG_CLOSE : dist < 150 ? DMG_MID : DMG_FAR;     // closer = more pellets hit
    if (bossState === "stagger") dmg = Math.round(dmg * STAGGER_MULT);    // he is open: bonus damage
    ghostHp -= dmg;
    sfx(bossState === "stagger" ? "crit" : "hit");
    spark(ghostX + SIZE / 2, ghostY + SIZE / 2, bossState === "stagger" ? 18 : 10, bossState === "stagger" ? "#ffffff" : "#ffd23f", 230, 0.45, 4);
    ghost.classList.add("hitflash");                                      // boss flashes white when hit
    setTimeout(() => ghost.classList.remove("hitflash"), 90);
    shake(2);
    setBossBar();
    popup("-" + dmg, ghostX + SIZE / 2, ghostY, bossState === "stagger" ? "#ffffff" : "#e6c97a");
    checkRage();
    checkPhase3();
    if (ghostHp <= 0) win();
}

// Reload: loads one shell at a time
function startReload() {
    if (!hasGun || gameOver || reloading || ammo >= MAG) return;
    reloading = true;
    reloadTimer = RELOAD_PER_SHELL;
    gunInner.classList.add("reloading");
    updateAmmoUI();
}

function updateGun(dt) {
    if (!hasGun) return;
    if (cooldown > 0) cooldown -= dt;

    if (reloading) {
        reloadTimer -= dt;
        if (reloadTimer <= 0) {
            ammo++;
            sfx("shell");
            reloadTimer = RELOAD_PER_SHELL;
            if (ammo >= MAG) {
                reloading = false;
                gunInner.classList.remove("reloading");
                gunInner.querySelector(".pump").animate([      // final "chk-chk"
                    { transform: "translateX(0)" },
                    { transform: "translateX(-7px)" },
                    { transform: "translateX(0)" }
                ], { duration: 250 });
            }
            updateAmmoUI();
        }
    }
}

// ---------- Game state ----------

function endGame(title, win) {
    gameOver = true;
    stopMusic();
    reloading = false;
    clearEffects();
    if (gunInner) gunInner.classList.remove("reloading");
    ghost.classList.remove("warning", "stunned");
    if (overlayTitle) overlayTitle.textContent = title;
    overlay.classList.toggle("win", win);
    overlay.classList.remove("hidden");
}

function win() {
    ghost.textContent = "💨";
    sfx("win");
    ghost.classList.remove("batform", "rage", "casting", "stunned");
    ghostHpBar.classList.add("hidden");
    bossBar.classList.add("hidden");
    finalScore.textContent = "You beat it in " + Math.floor(elapsed) + " seconds";
    endGame("ENEMY FELLED", true);
}

// Remember your best time (saved in the browser)
function bestTime(seconds) {
    let best = seconds;
    try {
        best = Math.max(seconds, Number(localStorage.getItem("ghostBest")) || 0);
        localStorage.setItem("ghostBest", best);
    } catch (e) { /* saving not available, that's ok */ }
    return best;
}

function lose(title) {
    if (gameOver) return;
    player.innerHTML = DEAD_ART;
    sfx("die");
    if (navigator.vibrate) navigator.vibrate([80, 40, 160]);
    const secs = Math.floor(elapsed);
    finalScore.textContent = "You survived " + secs + " seconds\nBest: " + bestTime(secs) + "s";
    endGame("YOU DIED", false);
}

function checkCaught() {
    if (gameOver) return;
    if (batForm || bossState === "stagger" || roarTime > 0) return;     // safe while he roars      // no body to touch (bats) / he is stunned
    if (rollTime > 0) return;                            // you can roll right through him
    const reach = phase2 ? BOSS_REACH : SIZE / 2;
    const close = Math.abs(ghostX - playerX) < reach &&
                  Math.abs(ghostY - playerY) < reach;
    if (!close) return;
    if (!phase2) { lose("The ghost got you!"); return; }
    if (hurt(1) && !gameOver) {                          // phase 2: he hurts you and knocks you back
        const a = Math.atan2(playerY - ghostY, playerX - ghostX);
        playerX = clamp(playerX + Math.cos(a) * 90);
        playerY = clamp(playerY + Math.sin(a) * 90);
    }
}

// At 20 seconds: the ghost turns red, faster, and dashes more often
function becomeAngry() {
    sfx("roar");
    angry = true;
    MUSIC.intense = true;                     // the chase music gets busier
    skillTimer = 3;                           // first skill comes 3 seconds later
    ghost.classList.add("angry");
}

// At BOSS_BAR_TIME: the boss bar appears (greyed out: the ghost is still immune)
function showImmuneBar() {
    bossBar.classList.remove("hidden");
    bossBar.classList.add("immune");
    setBossBar();
}

// Main loop: runs every frame (about 60 times a second)
function loop(now) {
    requestAnimationFrame(loop);              // always keep the loop alive

    try {
        if (sideways.matches) { lastTime = now; return; }      // paused while the phone is sideways
        const dt = Math.min((now - lastTime) / 1000, 0.05);   // seconds since last frame
        lastTime = now;

        if (!gameOver) {
            movePlayer(dt);
            moveGhost(dt);
            elapsed += dt;
            timerText.textContent = "Survived: " + Math.floor(elapsed) + "s";

            if (!angry && elapsed >= HARD_TIME) becomeAngry();
            if (!phase2 && elapsed >= BOSS_BAR_TIME && bossBar.classList.contains("hidden")) showImmuneBar();
            if (!phase2 && elapsed >= PHASE2_TIME) enterPhase2();
            updateOrbs(dt);
            updateObstacles(dt);
            updateBats(dt);
            updateDecoys(dt);
            updateBossBats(dt);
            updateParticles(dt);
            runTimers(dt);
            updateBeam(dt);

            if (GUN_OK) {
                if (!gunSpawned && elapsed >= GUN_TIME) spawnGun();
                if (pickupActive && Math.hypot(playerX - pickX, playerY - pickY) < 38) collectGun();
                updateGun(dt);
            }
            checkCaught();
        }

        draw();
    } catch (err) {
        console.error(err);
    }
}

function restartGame() {
    playerX = 200; playerY = 200;
    ghostX = 0; ghostY = 0;
    elapsed = 0;
    mode = "chase";
    dashTimer = DASH_EVERY;
    angry = false;
    phase2 = false; roarTime = 0;
    game.classList.remove("phase2");
    ghost.classList.remove("phase2", "rage", "phase3", "batform", "casting", "stunned");
    game.classList.remove("phase3");
    bossBar.classList.remove("final");
    bossPhase3 = false;
    stopMusic();
    MUSIC.intense = false;
    bossState = "walk"; bossTime = 0; bossAtk = ""; bossStep = 0; wallCount = 0;
    bossRage = false; batForm = false; batStage = 0;
    hearts = HEARTS; invincible = 0; rollTime = 0; rollCool = 0; dashT = 99;
    heartsEl.classList.add("hidden");
    player.classList.remove("rolling", "dashing", "hurt");
    player.style.scale = "";
    skillTimer = 8; lastSkill = ""; castSkill = "";
    obstacleUses = 0; obstacleLevel = 0;
    batTimer = BAT_EVERY;
    slowTime = 0; confusedTime = 0;
    player.classList.remove("slowed", "confused");
    clearEffects();
    ghost.classList.remove("angry");
    stunTime = 0; knockX = 0; knockY = 0;
    ghostHp = BOSS_HP;
    if (ghostHpFill) ghostHpFill.style.width = "100%";
    bossBar.classList.add("hidden");
    setBossBar();
    gameOver = false;

    gunSpawned = false; pickupActive = false; hasGun = false;
    ammo = MAG; reloading = false; cooldown = 0;
    if (GUN_OK) {
        gunEl.classList.add("hidden");
        gunInner.classList.remove("reloading");
        pickup.classList.add("hidden");
        ghostHpBar.classList.add("hidden");
        hud.classList.add("invisible");
        toastEl.classList.add("hidden");
        setLocked(true);
    }

    ghost.innerHTML = GHOST_ART;
    player.innerHTML = PLAYER_ART;
    ghost.classList.remove("warning", "stunned");
    timerText.textContent = "Survived: 0s";
    overlay.classList.add("hidden");
    overlay.classList.remove("win");
    document.getElementById("restart").blur();   // so SPACE doesn't press it again
    startChaseMusic();                           // the chase music starts again
}

// ---------- Phone support ----------

// Phone held sideways: the game pauses and asks you to turn it upright
const sideways = window.matchMedia("(orientation: landscape) and (max-height: 520px)");
const rotateMsg = document.createElement("div");
rotateMsg.id = "rotate";
rotateMsg.textContent = "TURN YOUR PHONE UPRIGHT";
document.body.appendChild(rotateMsg);

// Fit the arcade machine to any screen.
// Computer: the whole machine shrinks. Phone: only the game screen shrinks, so the touch controls stay BIG.
const touchScreen = window.matchMedia("(pointer: coarse)");
function fitScreen() {
    const cab = document.getElementById("cabinet");
    const bezel = document.getElementById("bezel");
    if (!cab || !bezel) return;
    const phone = touchScreen.matches;
    document.body.classList.toggle("mobile", phone);

    bezel.style.transform = "none";
    bezel.style.marginBottom = "0";
    cab.style.transform = "none";
    if (!phone) {
        const scale = Math.min(1, innerWidth / (cab.offsetWidth + 16), innerHeight / (cab.offsetHeight + 16));
        cab.style.transform = `scale(${scale})`;
        return;
    }
    const marquee = document.getElementById("marquee");
    const w = bezel.offsetWidth, h = bezel.offsetHeight;
    const roomForControls = 230;                                // the touch controls need this much height
    const scale = Math.max(0.4, Math.min(1, (innerWidth - 16) / w,
                           (innerHeight - (marquee ? marquee.offsetHeight : 40) - roomForControls - 20) / h));
    bezel.style.transformOrigin = "top center";
    bezel.style.transform = `scale(${scale})`;
    bezel.style.marginBottom = (-h * (1 - scale)) + "px";       // give back the space the shrunk screen no longer uses
}
fitScreen();
window.addEventListener("resize", fitScreen);
window.addEventListener("orientationchange", fitScreen);

draw();
requestAnimationFrame(loop);
