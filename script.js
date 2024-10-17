const editor = document.getElementById('editor');
const status = document.getElementById('status');
const modal = document.getElementById('apiModal');
const modalApiKeyInput = document.getElementById('modalApiKey');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const changeApiKeyBtn = document.getElementById('changeApiKeyBtn');

let typingTimer;
const doneTypingInterval = 1000; // 1 second
let isGenerating = false;
let userIsTyping = false;
let lastGeneratedContent = '';
let conversationHistory = [];

// Open modal to enter API key
function openApiModal() {
    modal.style.display = 'block';
}

// Close modal and save API key to local storage
function closeApiModal() {
    const apiKey = modalApiKeyInput.value.trim();
    if (apiKey) {
        localStorage.setItem('groqApiKey', apiKey);
        modal.style.display = 'none';
    } else {
        status.textContent = 'API Key cannot be empty';
    }
}

// Load API key from local storage
function loadApiKey() {
    const savedApiKey = localStorage.getItem('groqApiKey');
    if (!savedApiKey) {
        openApiModal();
    }
}

// Event listener to save API key and close modal
saveApiKeyBtn.addEventListener('click', closeApiModal);

// Event listener to change API key
changeApiKeyBtn.addEventListener('click', openApiModal);

editor.addEventListener('input', (e) => {
    if (!userIsTyping) return;
    
    clearTimeout(typingTimer);
    const words = editor.innerText.trim().split(/\s+/);
    if (words.length >= 3 && !isGenerating) {
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
            generatedSpan.outerHTML = generatedSpan.innerHTML;
            placeCaretAtEnd(editor);
        }
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const generatedSpan = editor.querySelector('.generated');
        
        if (generatedSpan && range.intersectsNode(generatedSpan)) {
            clearTimeout(typingTimer);
        }
    }
});

editor.addEventListener('keyup', (e) => {
    if (e.key !== 'Backspace' && e.key !== 'Delete') {
        userIsTyping = false;
    }
});

async function generateNextSentence() {
    const apiKey = localStorage.getItem('groqApiKey');
    const text = editor.innerText.trim();

    if (!apiKey) {
        status.textContent = 'Please enter your Groq API Key';
        return;
    }

    if (!text) {
        status.textContent = 'Please enter some text';
        return;
    }

    status.textContent = 'Generating...';
    isGenerating = true;

    // Add current text to conversation history
    conversationHistory.push({ role: 'user', content: text });

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-70b-versatile',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that generates the next sentence based on the given text. Respond with only the next sentence and never start with a capatilized first letter of the first word you generate. of course when its an I or something that always need to be capatilized, just capatailize, nothing else.' },
                    ...conversationHistory
                ],
                max_tokens: 50
            })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        const generatedSentence = data.choices[0].message.content.trim();
        
        // Add the generated sentence to the conversation history
        conversationHistory.push({ role: 'assistant', content: generatedSentence });
        
        // Add the generated sentence to the editor as light grey text, word by word
        const words = generatedSentence.split(' ');
        const generatedSpan = document.createElement('span');
        generatedSpan.classList.add('generated');
        editor.appendChild(generatedSpan);
        
        let wordIndex = 0;
        function typeNextWord() {
            if (wordIndex < words.length) {
                generatedSpan.textContent += (wordIndex === 0 ? '' : ' ') + words[wordIndex];
                wordIndex++;
                setTimeout(typeNextWord, 100); // Adjust typing speed here (100ms per word)
            } else {
                status.textContent = 'Press Enter to continue or just keep typing';
                placeCaretAtEnd(editor);
            }
        }
        typeNextWord();

        lastGeneratedContent = generatedSentence;
    } catch (error) {
        status.textContent = `Error: ${error.message}`;
    } finally {
        isGenerating = false;
    }
}

function placeCaretAtEnd(el) {
    el.focus();
    if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
        var range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    } else if (typeof document.body.createTextRange != "undefined") {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(el);
        textRange.collapse(false);
        textRange.select();
    }
}

// Load API key on page load
window.addEventListener('load', loadApiKey);
