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
const animationContainer = document.getElementById('animationContainer');

let typingTimer;
const doneTypingInterval = 1000; // 1 second
let isGenerating = false;
let userIsTyping = false;
let lastGeneratedContent = '';
let conversationHistory = [];
let isInitialRun = false; // Flag to track initial run
let periodCount = 0; // Track number of periods

// Maximum number of messages to keep in conversationHistory to prevent excessive token usage
const MAX_HISTORY = 20;

// Rate Limiter Configuration
const RATE_LIMIT = {
    requestsPerMinute: 30, // Adjust based on the selected model's rate limit
    interval: 60000 / 30,  // Time between requests in ms (for 30 requests per minute)
};

// Queue for API requests
let apiQueue = [];
let isProcessingQueue = false;

// Model Details Object (if needed for additional features)
const modelDetails = {
    'mixtral-8x7b-32768': {
        developer: 'Mistral',
        contextWindow: '32,768 tokens',
        status: 'Available',
        requestsPerMinute: 30,
    },
    'llama3-70b-8192': {
        developer: 'Meta',
        contextWindow: '8,192 tokens',
        status: 'Available',
        requestsPerMinute: 30,
    },
    'llama3-8b-8192': {
        developer: 'Meta',
        contextWindow: '8,192 tokens',
        status: 'Available',
        requestsPerMinute: 30,
    },
    'llama-3.1-70b-versatile': {
        developer: 'Meta',
        contextWindow: '128k tokens (max_tokens limited to 8k)',
        status: 'Available',
        requestsPerMinute: 30,
    },
    'llama-3.1-8b-instant': {
        developer: 'Meta',
        contextWindow: '128k tokens (max_tokens limited to 8k)',
        status: 'Available',
        requestsPerMinute: 30,
    },
    'llama-3.2-1b-preview': {
        developer: 'Meta',
        contextWindow: '128k tokens (temporarily limited to 8k in preview)',
        status: 'Preview',
        requestsPerMinute: 30,
    },
    'llama-3.2-3b-preview': {
        developer: 'Meta',
        contextWindow: '128k tokens (temporarily limited to 8k in preview)',
        status: 'Preview',
        requestsPerMinute: 30,
    },
    'gemma2-9b-it': {
        developer: 'Google',
        contextWindow: '8,192 tokens',
        status: 'Available',
        requestsPerMinute: 30,
    },
    'gemma-7b-it': {
        developer: 'Google',
        contextWindow: '8,192 tokens',
        status: 'Available',
        requestsPerMinute: 30,
    }
};

// Initialize Rate Limiter based on selected model
function initializeRateLimiter() {
    const selectedModel = modelSelect.value;
    const model = modelDetails[selectedModel];
    if (model && model.requestsPerMinute) {
        RATE_LIMIT.requestsPerMinute = model.requestsPerMinute;
        RATE_LIMIT.interval = 60000 / model.requestsPerMinute;
    } else {
        RATE_LIMIT.requestsPerMinute = 30;
        RATE_LIMIT.interval = 2000; // Default to 2 seconds
    }
}

// Process the API Queue
async function processQueue() {
    if (isProcessingQueue || apiQueue.length === 0) return;
    isProcessingQueue = true;

    while (apiQueue.length > 0) {
        const { func, resolve, reject } = apiQueue.shift();
        try {
            const result = await func();
            resolve(result);
        } catch (error) {
            reject(error);
        }
        await delay(RATE_LIMIT.interval);
    }

    isProcessingQueue = false;
}

// Add a function to the API Queue
function enqueueApiCall(func) {
    return new Promise((resolve, reject) => {
        apiQueue.push({ func, resolve, reject });
        processQueue();
    });
}

// Utility function to delay execution
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
        // Default to the first available model
        modelSelect.selectedIndex = 0;
    }
    initializeRateLimiter();
}

// Save selected model to localStorage on change
modelSelect.addEventListener('change', () => {
    const selectedModel = modelSelect.value;
    localStorage.setItem('selectedModel', selectedModel);
    initializeRateLimiter();
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

// Function to add messages to conversationHistory with a limit
function addToConversation(role, content) {
    conversationHistory.push({ role, content });
    if (conversationHistory.length > MAX_HISTORY) {
        conversationHistory.shift(); // Remove the oldest message
    }
}

// Insert a generated sentence into the editor
function insertGeneratedSentence(sentence, isInitial = false) {
    addToConversation('assistant', sentence);

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
    if (words.length >= 1 && !isGenerating) { // Changed from 3 to 1
        typingTimer = setTimeout(generateNextSentence, doneTypingInterval);
    }

    // Remove any existing generated text when user types
    const generatedSpan = editor.querySelector('.generated');
    if (generatedSpan) {
        generatedSpan.remove();
    }

    // Check for periods and trigger formatting if needed
    const currentText = editor.innerText;
    const newPeriodCount = (currentText.match(/\./g) || []).length;

    // If periods have been added
    if (newPeriodCount > periodCount) {
        const periodsTyped = newPeriodCount - periodCount;
        periodCount = newPeriodCount;

        // For each new period, check if it's the second one
        for (let i = 0; i < periodsTyped; i++) {
            if ((periodCount) % 2 === 0) {
                // Trigger formatting (function removed, but keeping the call for future use)
                // triggerFormatCorrection(); // Removed
            }
        }
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

        // Trigger extraction and animation of standout word
        extractAndAnimateWord();
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
        // Add current text to conversation history
        addToConversation('user', text);

        // Get the selected model
        const selectedModel = modelSelect.value;

        // Check if the selected model is available
        const selectedModelDetails = modelDetails[selectedModel];
        if (!selectedModelDetails || selectedModelDetails.status === 'Offline') {
            alert('The selected model is currently unavailable. Please choose another model.');
            isGenerating = false;
            return;
        }

        // Define the API call as a function to enqueue
        const apiCall = async () => {
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
                            content: 'You are a helpful assistant that generates the next sentence based on the given text. Max 20 words. Respond with only the next sentence and never start with a capitalized first word. Of course, when it\'s an "I" or something that always needs to be capitalized, just capitalize, nothing else please.'
                        },
                        ...conversationHistory
                    ],
                    max_tokens: getMaxTokens(selectedModel)
                })
            });

            if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            const generatedSentence = data.choices[0].message.content.trim();

            if (!generatedSentence) {
                throw new Error('Received empty response from API.');
            }

            return generatedSentence;
        };

        // Enqueue the API call
        const generatedSentence = await enqueueApiCall(apiCall);

        // Add the generated sentence to the conversation history
        addToConversation('assistant', generatedSentence);

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

// Function to determine max_tokens based on model
function getMaxTokens(modelId) {
    const modelConfigurations = {
        'mixtral-8x7b-32768': 32768,
        'llama3-70b-8192': 8192,
        'llama3-8b-8192': 8192,
        'llama-3.1-70b-versatile': 8000, // max_tokens limited to 8k
        'llama-3.1-8b-instant': 8000,     // max_tokens limited to 8k
        'llama-3.2-1b-preview': 8000,     // Temporarily limited to 8k in preview
        'llama-3.2-3b-preview': 8000,     // Temporarily limited to 8k in preview
        'gemma2-9b-it': 8192,
        'gemma-7b-it': 8192
        // Add more models as needed
    };

    return modelConfigurations[modelId] || 8000; // Default to 8000 if not specified
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

// Function to extract a standout word and animate it
async function extractAndAnimateWord() {
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

    try {
        // Make an API call to extract the standout word using the same model and endpoint
        const standoutWord = await getStandoutWord(text, apiKey);

        if (standoutWord && /^[A-Za-z]+$/.test(standoutWord)) { // Ensure it's a single word
            createWordAnimation(standoutWord);
        } else {
            alert('Could not extract a valid standout word.');
        }
    } catch (error) {
        alert(`Error extracting standout word: ${error.message}`);
        console.error('Error in extractAndAnimateWord:', error);
    }
}

// Function to extract the standout word using the same LLM model and endpoint
async function getStandoutWord(text, apiKey, retryCount = 0) {
    const selectedModel = modelSelect.value;

    // Only include the current sentence in the extraction prompt
    const extractionMessages = [
        {
            role: 'system',
            content: 'You are an assistant that extracts the most important word from a given sentence. only give the single word, nothing else please.'
        },
        { role: 'user', content: text }
    ];

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: extractionMessages,
                max_tokens: 10, // Minimal tokens needed
                temperature: 0 // Ensure deterministic output
            })
        });

        if (response.status === 429) {
            if (retryCount < 5) { // Maximum of 5 retries
                const delayTime = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s, 8s, 16s
                console.warn(`Rate limit hit. Retrying in ${delayTime / 1000} seconds...`);
                await delay(delayTime);
                return await getStandoutWord(text, apiKey, retryCount + 1);
            } else {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
        }

        if (!response.ok) {
            throw new Error('API request for standout word failed');
        }

        const data = await response.json();
        const standoutWord = data.choices[0].message.content.trim();

        return standoutWord;
    } catch (error) {
        console.error('Error in getStandoutWord:', error);
        throw error;
    }
}

// Function to create animated words in the background
function createWordAnimation(word) {
    clearExistingAnimations(); // Fade out existing words

    const numberOfWords = 5; // Limit to 5 per transition
    for (let i = 0; i < numberOfWords; i++) {
        const animatedWord = document.createElement('span');
        animatedWord.classList.add('animated-word');
        animatedWord.textContent = word;

        // Random positions
        const posX = Math.random() * 100; // Percentage
        const posY = Math.random() * 100; // Percentage

        // Random sizes
        const fontSize = Math.random() * 20 + 10; // Between 10px and 30px

        // Apply styles
        animatedWord.style.left = `${posX}%`;
        animatedWord.style.top = `${posY}%`;
        animatedWord.style.fontSize = `${fontSize}px`;

        animationContainer.appendChild(animatedWord);

        // The animation (scaleAndFade) will handle fading out
        // Remove the word after animation completes to prevent DOM clutter
        animatedWord.addEventListener('animationend', () => {
            animatedWord.remove();
        });
    }
}

// Function to clear existing animated words with fade-out effect
function clearExistingAnimations() {
    const existingWords = document.querySelectorAll('.animated-word');
    existingWords.forEach(word => {
        word.classList.add('fade-out');
        // Remove the element after the fadeOut animation completes
        word.addEventListener('animationend', () => {
            word.remove();
        });
    });
}
