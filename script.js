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
    'llama-3.1-8b-instant': {
        developer: 'Meta',
        contextWindow: '20,000 tokens',
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
    // Added Mistral model
    'mixtral-8x7b-32768': {
        developer: 'Mistral',
        contextWindow: '32,768 tokens',
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
window.addEventListener('load', () => {
    loadingScreen.style.display = 'none';
    loadApiKey();
    loadSelectedModel();
    handleInitialRun();
    initializeMutationObserver(); // Initialize MutationObserver
});

// Handle initial run behavior
function handleInitialRun() {
    const hasRunBefore = localStorage.getItem('hasRunBefore');
    if (!hasRunBefore) {
        isInitialRun = true; // Set initial run flag
        // Mark that the initial run has occurred
        localStorage.setItem('hasRunBefore', 'true');

        // Show 'Generating...' alert
        alert('Generating...');

        // Insert the initial generated sentence
        insertGeneratedSentence("this is how it generates the rest of your sentence.", true);

        // After 2 seconds, display the instructional message
        setTimeout(() => {
            displayInstructionMessage();
            scrollToBottom(); // Ensure the initial content is visible
        }, 2000);
    }
}

// Insert a generated sentence into the editor
function insertGeneratedSentence(sentence, isInitial = false) {
    const generatedSpan = document.createElement('span');
    generatedSpan.classList.add('generated'); // Grey color
    editor.appendChild(generatedSpan);

    const words = sentence.split(' ');
    let wordIndex = 0;

    function typeNextWord() {
        if (wordIndex < words.length) {
            generatedSpan.textContent += (wordIndex === 0 ? '' : ' ') + words[wordIndex];
            wordIndex++;
            scrollToBottom(); // Ensure scrolling after each word
            setTimeout(typeNextWord, 50); // Adjust typing speed here (50ms per word)
        } else {
            if (isInitialRun && isInitial) {
                // Only display "Press Enter..." during initial run
                displayInstructionMessage();
            }
            scrollToBottom(); // Scroll to bottom after typing
        }
    }
    typeNextWord();
}

// Display the instructional message
function displayInstructionMessage() {
    // Prevent multiple instructional messages
    if (document.getElementById('instructionMessage')) return;

    const instruction = document.createElement('div');
    instruction.id = 'instructionMessage';
    instruction.innerHTML = '<em>press enter to keep the generated text or just type</em>';
    instruction.style.marginTop = '10px';
    editor.appendChild(instruction);
    scrollToBottom(); // Scroll to bottom after displaying instruction
}

// Remove the instructional message
function removeInstructionMessage() {
    const instruction = document.getElementById('instructionMessage');
    if (instruction) {
        instruction.remove();
    }
}

// Scroll the editor to the bottom
function scrollToBottom() {
    requestAnimationFrame(() => {
        editor.scrollTop = editor.scrollHeight;
    });
}

// Initialize MutationObserver to watch for changes in the editor
function initializeMutationObserver() {
    const observer = new MutationObserver(() => {
        scrollToBottom();
    });

    const config = { childList: true, subtree: true, characterData: true };

    observer.observe(editor, config);
}

// Event listeners for editor interactions
editor.addEventListener('input', (e) => {
    if (!userIsTyping) return;

    clearTimeout(typingTimer);
    const words = editor.innerText.trim().split(/\s+/);
    if (words.length >= 3 && !isGenerating) { // Reverted back to 3
        typingTimer = setTimeout(generateNextSentence, doneTypingInterval);
    }

    // Remove any existing generated text when user types
    const generatedSpan = editor.querySelector('.generated');
    if (generatedSpan) {
        generatedSpan.remove();
    }
});

editor.addEventListener('keydown', (e) => {
    userIsTyping = true;
    if (e.key === 'Enter') {
        e.preventDefault();
        const generatedSpan = editor.querySelector('.generated');
        if (generatedSpan) {
            generatedSpan.classList.remove('generated');
            generatedSpan.classList.add('accepted'); // Change to black
            placeCaretAtEnd(editor);
        }

        // If the instructional message is present, remove it
        if (document.getElementById('instructionMessage')) {
            removeInstructionMessage();
            scrollToBottom(); // Ensure editor scrolls to bottom after removing instruction
        }
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const generatedSpan = editor.querySelector('.generated');

            if (generatedSpan && range.intersectsNode(generatedSpan)) {
                clearTimeout(typingTimer);
            }
        }
    }
});

editor.addEventListener('keyup', (e) => {
    if (e.key !== 'Backspace' && e.key !== 'Delete') {
        userIsTyping = false;
    }
});

// Function to generate the next sentence using the API
async function generateNextSentence() {
    const apiKey = localStorage.getItem('groqApiKey');
    const text = editor.innerText.trim();

    if (!apiKey) {
        alert('Please enter your Groq API Key');
        return;
    }

    if (!text) {
        alert('Please enter some text');
        return;
    }

    isGenerating = true;

    try {
        // Get the selected model
        const selectedModel = modelSelect.value;

        // Check if the selected model is available
        const selectedModelDetails = modelDetails[selectedModel];
        if (!selectedModelDetails || selectedModelDetails.status === 'Offline') {
            alert('The selected model is currently unavailable. Please choose another model.');
            isGenerating = false;
            return;
        }

        // Use the entire text history
        const entireText = text;

        // Define the API call
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that generates the next sentence based on the given text. Max 20 words. Respond with only the next sentence and never start with a capitalized first word unless it is "I" or a proper noun.'
                    },
                    { role: 'user', content: entireText }
                ],
                max_tokens: 8000
            })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        const generatedSentence = data.choices[0].message.content.trim();

        if (!generatedSentence) {
            throw new Error('Received empty response from API.');
        }

        // Add the generated sentence to the editor as grey text, word by word
        insertGeneratedSentence(generatedSentence);
        lastGeneratedContent = generatedSentence;
    } catch (error) {
        alert(`Error: ${error.message}`);
        console.error('Error in generateNextSentence:', error);
    } finally {
        isGenerating = false;
    }
}

// Function to place caret at the end of the editor
function placeCaretAtEnd(el) {
    el.focus();
    if (typeof window.getSelection !== 'undefined' && typeof document.createRange !== 'undefined') {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    } else if (typeof document.body.createTextRange !== 'undefined') {
        const textRange = document.body.createTextRange();
        textRange.moveToElementText(el);
        textRange.collapse(false);
        textRange.select();
    }
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};
