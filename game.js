let dictionary;

const getDictionary = async () => {
	try {
		const response = await fetch('dictionary.txt');
		if (!response.ok) {
			throw new Error(`Failed to load dictionary: ${response.status}`);
		}
		const text = await response.text();
		const words = text.split('\n').map(word => word.trim()).filter(word => word.length > 0);
		if (words.length === 0) {
			throw new Error('Dictionary is empty');
		}
		return words;
	} catch (error) {
		console.error('Error loading dictionary:', error);
		alert('Failed to load word dictionary. Please refresh the page.');
		throw error;
	}
}

const randomWord = () => {
	return dictionary[Math.floor(randomNumber(0, dictionary.length))]
}

const randomNumber = (min, max) => {
	return Math.random() * (max - min) + min;
}

const w = window.innerWidth;
const h = window.innerHeight * 0.85;

const canvas = document.getElementById('canvas');
const dpr = window.devicePixelRatio || 1;

canvas.width = w * dpr;
canvas.height = h * dpr;
canvas.style.width = w + 'px';
canvas.style.height = h + 'px';

const ctx = canvas.getContext("2d");
ctx.scale(dpr, dpr);
ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

// Cache DOM elements
const scoreValueElem = document.getElementById('score-value');
const speedValueElem = document.getElementById('speed-value');
const bufferValueElem = document.getElementById('buffer-value');

// Gameplay modifiers
const opts = {
	init_speed: 25,
	speed_increase: 1.1,
	speed_cycles: 20,
	spawn_chance: 0.25,
	frame_interval: 250,
	min_word_y: 20,
	points_multiplier: 25,
};

// High score management
const getHighScore = () => {
	try {
		const stored = localStorage.getItem('typingGameHighScore');
		return stored ? parseInt(stored, 10) : 0;
	} catch (error) {
		console.error('Error reading high score:', error);
		return 0;
	}
};

const setHighScore = (score) => {
	try {
		localStorage.setItem('typingGameHighScore', score.toString());
	} catch (error) {
		console.error('Error saving high score:', error);
	}
};

let highScore = getHighScore();

let score;
let words;
let cycles;
let speed;
let buffer;
let animationFrameId;
let lastFrameTime;
let lastDisplayedScore;
let lastDisplayedSpeed;

// Instantiate variables
const initialize = function () {
	score = 0;
	words = [];
	cycles = 0;
	speed = opts.init_speed;
	buffer = "";
	lastDisplayedScore = score;
	lastDisplayedSpeed = speed;
	scoreValueElem.innerText = score;
	speedValueElem.innerText = speed;
	bufferValueElem.innerText = buffer || '...';
	
	// Update high score display
	highScore = getHighScore();
};

class Word {
	constructor(text, x, y, speed) {
		this.text = text;
		this.x = x;
		this.y = y;
		this.speed = speed;
	}
}

const findNonOverlappingY = function() {
	const minSpacing = 50;
	const maxAttempts = 10;
	
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const y = randomNumber(opts.min_word_y, h);
		let hasOverlap = false;
		
		for (const word of words) {
			if (Math.abs(word.y - y) < minSpacing) {
				hasOverlap = true;
				break;
			}
		}
		
		if (!hasOverlap) {
			return y;
		}
	}
	
	return randomNumber(opts.min_word_y, h);
};

const gameTick = function (currentTime) {
	// Continue animation loop first
	if (animationFrameId !== null) {
		animationFrameId = requestAnimationFrame(gameTick);
	}
	
	// Throttle to match original frame rate
	if (!lastFrameTime) lastFrameTime = currentTime;
	const elapsed = currentTime - lastFrameTime;
	if (elapsed < opts.frame_interval) {
		return;
	}
	lastFrameTime = currentTime;
	
	// Increase speed every 20 frames
	cycles += 1;
	if (cycles % opts.speed_cycles == 0){
		speed = Math.round(speed * opts.speed_increase);
		if (speed !== lastDisplayedSpeed) {
			speedValueElem.innerText = speed;
			lastDisplayedSpeed = speed;
		}
	}
	ctx.clearRect(0, 0, w, h);
	if (Math.random() < opts.spawn_chance) {
		words.push(new Word(randomWord(), w, findNonOverlappingY(), speed));
	}
	for (let i = 0; i < words.length; i++) {
		const word = words[i];
		word.x -= word.speed;
		if (word.x < 0) {
			// Losing condition here
			words.splice(i, 1);
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
				animationFrameId = null;
			}
			state_machine.transition('game_over')
		} else {
			ctx.fillStyle = '#ecf0f1';
			ctx.fillText(word.text, word.x, word.y);
		}	
	}
};

const gameListener = async function (event) {
	// Prevent key repeat from holding down keys
	if (event.repeat) {
		return;
	}
	
	let key = event.key;
	// Only accept alphanumerics, backspace and space
	if (!key.match(/^[a-z0-9 ]$/i) && key !== 'Backspace' && key !== 'Enter') {
		return;
	}
	
	if (key === ' ' || key === 'Enter') {
		for (let i = 0; i < words.length; i++) {
			const word = words[i];
			if (word.text === buffer) {
				score += Math.round(word.text.length * speed / opts.points_multiplier);
				if (score !== lastDisplayedScore) {
					scoreValueElem.innerText = score;
					lastDisplayedScore = score;
				}
				words.splice(i, 1);
				break;
			}
		}
		buffer = "";
	} else if (key === 'Backspace') {
		buffer = buffer.slice(0, -1);
	} else {
		buffer += key;
	}
	bufferValueElem.innerText = buffer || '...';
}

const startListener = function(event) {
	if (event.key !== 'r' && event.key !== 'R') {
		return;
	}
	state_machine.transition('game');
}

const gameOverListener = function(event) {
	if (event.key !== 'r' && event.key !== 'R') {
		return;
	}
	state_machine.transition('game');
}

const startUpdate = async function() {
	dictionary = await getDictionary();
	ctx.clearRect(0, 0, w, h);
	
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	
	ctx.fillStyle = '#3498db';
	ctx.font = "bold 48px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
	ctx.fillText("Press 'R' to Start", w / 2, h / 2);
	
	ctx.fillStyle = '#ecf0f1';
	ctx.font = "24px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
	ctx.fillText("Type the words before they disappear!", w / 2, h / 2 + 60);
}

const gameOverUpdate = async function() {
	const finalScore = score;
	
	// Update high score if needed
	if (finalScore > highScore) {
		highScore = finalScore;
		setHighScore(highScore);
	}
	
	initialize();

	ctx.clearRect(0, 0, w, h);
	
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	
	ctx.fillStyle = '#e74c3c';
	ctx.font = "bold 56px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
	ctx.fillText("Game Over", w / 2, h / 2 - 80);
	
	ctx.fillStyle = '#3498db';
	ctx.font = "bold 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
	ctx.fillText(`Final Score: ${finalScore}`, w / 2, h / 2 - 10);
	
	ctx.fillStyle = '#f39c12';
	ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
	ctx.fillText(`High Score: ${highScore}`, w / 2, h / 2 + 40);
	
	ctx.fillStyle = '#ecf0f1';
	ctx.font = "24px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
	ctx.fillText("Press 'R' to Restart", w / 2, h / 2 + 90);
}

let currentListener = null;

const state_machine = {
	states: {
		'start': {
			'update': startUpdate,
			listener: startListener,
		},
		'game': {
			'update': async function () {
				initialize();
				lastFrameTime = null;
				if (animationFrameId) {
					cancelAnimationFrame(animationFrameId);
					animationFrameId = null;
				}
				animationFrameId = requestAnimationFrame(gameTick);
			},
			'listener': gameListener,
		},
		'game_over': {
			'update': gameOverUpdate,
			'listener': gameOverListener,
		}
	},
	transition: async function (state) {
		if (currentListener) {
			document.removeEventListener('keydown', currentListener);
		}
		currentListener = this.states[state].listener;
		document.addEventListener('keydown', currentListener);
		await this.states[state].update();
	},
};

state_machine.transition('start')

// Instructions panel toggle
document.getElementById('toggle-instructions').addEventListener('click', function() {
	const panel = document.getElementById('instructions');
	const icon = this.querySelector('.toggle-icon');
	const isCollapsed = panel.classList.toggle('collapsed');
	
	// Update icon and ARIA
	icon.textContent = isCollapsed ? '+' : '−';
	this.setAttribute('aria-expanded', !isCollapsed);
});
