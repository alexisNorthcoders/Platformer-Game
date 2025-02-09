let audioContext = new (window.AudioContext || window.webkitAudioContext)();
const swingBuffer = [null, null, null]
const hitBuffer = [null, null, null, null]
let stepBuffer = null;
let pickBuffer = null;
let jumpBuffer = null;
let currentStepSound = null;

function playDiamondSound() {
    if (!pickBuffer) return;

    let sound = audioContext.createBufferSource();
    let gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    sound.buffer = pickBuffer;

    sound.connect(gainNode);
    gainNode.connect(audioContext.destination);
    sound.start();
}
function playJumpSound() {
    if (!jumpBuffer) return;

    let sound = audioContext.createBufferSource();
    sound.buffer = jumpBuffer;
    sound.connect(audioContext.destination);
    sound.start();
}

function playHammerSound() {
    if (swingBuffer.includes(null)) return;

    let sound = audioContext.createBufferSource();
    const random = Math.floor(Math.random() * 3)
    sound.buffer = swingBuffer[random];
    sound.connect(audioContext.destination);
    sound.start();
}
function playHitSound() {
    if (hitBuffer.includes(null)) return;

    let sound = audioContext.createBufferSource();
    const random = Math.floor(Math.random() * hitBuffer.length)
    console.log(random)
    sound.buffer = hitBuffer[random];
    sound.connect(audioContext.destination);
    sound.start();
}
function playStepSound() {
    if (!stepBuffer) return;

    if (currentStepSound && currentStepSound.playbackState === currentStepSound.PLAYING_STATE) {
        return
    }

    let sound = audioContext.createBufferSource();
    let gainNode = audioContext.createGain();
    sound.buffer = stepBuffer;
    sound.loop = true;
    // slow down the sound
    sound.playbackRate.setValueAtTime(0.5, audioContext.currentTime);

    // reduce the volume
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

    sound.connect(gainNode);
    gainNode.connect(audioContext.destination)

    sound.start();

    currentStepSound = sound;
}

function stopStepSound() {
    if (currentStepSound) {
        currentStepSound.stop();
        currentStepSound = null;
    }
}
// load sound files

async function loadSound(url) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await audioContext.decodeAudioData(arrayBuffer);
        return buffer;
    } catch (error) {
        console.error("Error loading sound file:", error);
        return null;
    }
}

async function loadSounds() {

    swingBuffer[0] = await loadSound("sounds/swing.wav");
    swingBuffer[1] = await loadSound("sounds/swing2.wav");
    swingBuffer[2] = await loadSound("sounds/swing3.wav");
    hitBuffer[0] = await loadSound("sounds/hit.wav");
    hitBuffer[1] = await loadSound("sounds/hit2.wav");
    hitBuffer[2] = await loadSound("sounds/hit3.wav");
    hitBuffer[3] = await loadSound("sounds/hit4.wav");
    stepBuffer = await loadSound("sounds/step.wav");
    jumpBuffer = await loadSound("sounds/jump.wav");
    pickBuffer = await loadSound("sounds/pick.wav");
}

loadSounds();