let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let hammerBuffer = null;
let stepbuffer = null;
let hitbuffer = null;
let currentStepSound = null;

function playJumpSound() {
    let oscillator = audioContext.createOscillator();
    let gainNode = audioContext.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
}

function playDiamondSound() {
    let osc = audioContext.createOscillator();
    let gain = audioContext.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1500, audioContext.currentTime + 0.2);

    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
}


function loadHammerSound(url) {
    fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(buffer => {
            hammerBuffer = buffer;
        })
        .catch(error => console.error("Error loading sound file:", error));
}
function loadStepSound(url) {
    fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(buffer => {
            stepbuffer = buffer;
        })
        .catch(error => console.error("Error loading sound file:", error));
}
function loadHitSound(url) {
    fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(buffer => {
            hitbuffer = buffer;
        })
        .catch(error => console.error("Error loading sound file:", error));
}

function playHammerSound() {
    if (!hammerBuffer) return;

    let sound = audioContext.createBufferSource();
    let gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.01, audioContext.currentTime);
    sound.buffer = hammerBuffer;

    sound.connect(gainNode);
    gainNode.connect(audioContext.destination);
    sound.start();
}
function playHitSound() {
    if (!hitbuffer) return;

    let sound = audioContext.createBufferSource();
    sound.buffer = hitbuffer;
    sound.connect(audioContext.destination);
    sound.start();
}
function playStepSound() {
    if (!stepbuffer) return;

    if (currentStepSound && currentStepSound.playbackState === currentStepSound.PLAYING_STATE) {
        return
    }

    let sound = audioContext.createBufferSource();
    let gainNode = audioContext.createGain();
    sound.buffer = stepbuffer;
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

loadHammerSound("sounds/swoosh.wav");
loadHitSound("sounds/hit.wav");
loadStepSound("sounds/step.wav");