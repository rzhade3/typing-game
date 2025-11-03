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
canvas.width = w;
canvas.height = h;

const ctx = canvas.getContext("2d");
ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

// Gameplay modifiers
const opts = {
	init_speed: 25,
	speed_increase: 1.1,
	speed_cycles: 20,
	spawn_chance: 0.25,
	game_tick_interval: 250,
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

// Instantiate variables
const initialize = function () {
	score = 0;
	words = [];
	cycles = 0;
	speed = opts.init_speed;
	buffer = "";
	document.getElementById('score-value').innerText = score;
	document.getElementById('speed-value').innerText = speed;
	document.getElementById('buffer-value').innerText = buffer || '...';
	
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

let updateInterval;

const gameTick = function () {
	// Increase speed every 10 frames
	cycles += 1;
	if (cycles % opts.speed_cycles == 0){
		speed = Math.round(speed * opts.speed_increase);
		document.getElementById('speed-value').innerText = speed;
	}
	ctx.clearRect(0, 0, w, h);
	if (Math.random() < opts.spawn_chance) {
		words.push(new Word(randomWord(), w, randomNumber(opts.min_word_y, h), speed));
	}
	for (let i = 0; i < words.length; i++) {
		const word = words[i];
		word.x -= word.speed;
		if (word.x < 0) {
			// Losing condition here
			words.splice(i, 1);
			if (updateInterval) {
				clearInterval(updateInterval);
				updateInterval = null;
			}
			state_machine.transition('game_over')
		} else {
			ctx.fillStyle = '#ecf0f1';
			ctx.fillText(word.text, word.x, word.y);
		}	
	}
};

const gameListener = async function (event) {
	let key = event.key;
	// Only accept alphanumerics, backspace and space
	if (!key.match(/^[a-z0-9 ]$/i) && key !== 'Backspace' && key !== 'Enter') {
		return;
	}
	// Capitalize key if shift is pressed
	if (event.shiftKey) {
		key = key.toUpperCase();
	}
	const bufferElem = document.getElementById('buffer-value');
	if (key === ' ' || key === 'Enter') {
		for (let i = 0; i < words.length; i++) {
			const word = words[i];
			if (word.text === buffer) {
				score += Math.round(word.text.length * speed / opts.points_multiplier);
				document.getElementById('score-value').innerText = score;
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
	bufferElem.innerText = buffer || '...';
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
				if (updateInterval) {
					clearInterval(updateInterval);
					updateInterval = null;
				}
				updateInterval = setInterval(function () {
					gameTick();
				}, opts.game_tick_interval);
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
			document.removeEventListener('keyup', currentListener);
		}
		currentListener = this.states[state].listener;
		document.addEventListener('keyup', currentListener);
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
