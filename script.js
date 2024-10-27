// Get DOM Elements
const editor = document.getElementById('editor');
const modal = document.getElementById('apiModal');
const modalApiKeyInput = document.getElementById('modalApiKey');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const changeApiKeyBtn = document.getElementById('changeApiKeyBtn');
const loadingScreen = document.getElementById('loadingScreen');
const modelSelect = document.getElementById('modelSelect');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const hamburgerMenu = document.getElementById('hamburgerMenu');
const closeBtn = document.querySelector('.close-btn');
const closeModalBtn = document.querySelector('.close-modal');

let typingTimer;
const doneTypingInterval = 1000; // 1 second
let isGenerating = false;
let userIsTyping = false;
let lastGeneratedContent = '';
let isInitialRun = false; // Flag to track initial run
let periodCount = 0; // Track number of periods

// Model Details Object
const modelDetails = {
    'mistral-8x7b-32768': {
        developer: 'Mistral',
        contextWindow: '32,768 tokens',
        status: 'Available',
    },
    'gemma-7b-it': {
        developer: 'Google',
        contextWindow: '14,400 tokens',
        status: 'Available',
    },
    'gemma2-9b-it': {
        developer: 'Google',
        contextWindow: '14,400 tokens',
        status: 'Available',
    },
    'llama-3.1-70b-versatile': {
        developer: 'Meta',
        contextWindow: '6,000 tokens',
        status: 'Available',
    },
    'llama-3.1-8b-instant': {
        developer: 'Meta',
        contextWindow: '20,000 tokens',
        status: 'Available',
    },
    'llama-3.2-11b-text-preview': {
        developer: 'Meta',
        contextWindow: '7,000 tokens',
        status: 'Preview',
    },
    'llama-3.2-1b-preview': {
        developer: 'Meta',
        contextWindow: '7,000 tokens',
        status: 'Preview',
    },
    'llama-3.2-3b-preview': {
        developer: 'Meta',
        contextWindow: '7,000 tokens',
        status: 'Preview',
    },
    'llama-3.2-90b-text-preview': {
        developer: 'Meta',
        contextWindow: '7,000 tokens',
        status: 'Preview',
    },
    'llama-guard-3-8b': {
        developer: 'Meta',
        contextWindow: '15,000 tokens',
        status: 'Available',
    },
    'llama3-70b-8192': {
        developer: 'Meta',
        contextWindow: '6,000 tokens',
        status: 'Available',
    },
    'llama3-8b-8192': {
        developer: 'Meta',
        contextWindow: '30,000 tokens',
        status: 'Available',
    },
};

// Open modal to enter API key
function openApiModal() {
    modal.style.display = 'block';
}

// Close modal
function closeApiModal() {
    modal.style.display = 'none';
}

// Load API key from local storage
function loadApiKey() {
    const savedApiKey = localStorage.getItem('groqApiKey');
    if (!savedApiKey) {
        openApiModal();
    }
}

// Event listener to save API key and close modal
saveApiKeyBtn.addEventListener('click', () => {
    const apiKey = modalApiKeyInput.value.trim();
    if (apiKey) {
        localStorage.setItem('groqApiKey', apiKey);
        closeApiModal();
    } else {
        alert('API Key cannot be empty');
    }
});

// Event listener to close modal when clicking the close button
closeModalBtn.addEventListener('click', closeApiModal);

// Event listener to open modal when clicking API Key button in hamburger menu
changeApiKeyBtn.addEventListener('click', openApiModal);

// Hamburger Menu Functionality
hamburgerBtn.addEventListener('click', () => {
    hamburgerMenu.style.display = 'block';
});

// Close hamburger menu when clicking the close button
closeBtn.addEventListener('click', () => {
    hamburgerMenu.style.display = 'none';
});

// Close hamburger menu when clicking outside of it
window.addEventListener('click', (event) => {
    if (event.target == hamburgerMenu) {
        hamburgerMenu.style.display = 'none';
    }
});

// Load selected model from localStorage
function loadSelectedModel() {
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel && modelDetails[savedModel]) {
        modelSelect.value = savedModel;
    } else {
        // Default to 'llama-3.1-8b-instant'
        modelSelect.value = 'llama-3.1-8b-instant';
    }
}

// Save selected model to localStorage on change
modelSelect.addEventListener('change', () => {
    const selectedModel = modelSelect.value;
    localStorage.setItem('selectedModel', selectedModel);
});

// Hide loading screen once the page is fully loaded
window.addEvent