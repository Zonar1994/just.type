// ------------------- DOM ELEMENTS -------------------
const editor = document.getElementById('editor');
const modal = document.getElementById('apiModal');
const modalApiKeyInput = document.getElementById('modalApiKey');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const changeApiKeyBtn = document.getElementById('changeApiKeyBtn');
const loadingScreen = document.getElementById('loadingScreen');
const modelSelect = document.getElementById('modelSelect');
const themeSelect = document.getElementById('themeSelect');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const hamburgerMenu = document.getElementById('hamburgerMenu');
const closeBtn = document.querySelector('.close-btn');
const closeModalBtn = document.querySelector('.close-modal');
const wordCountDisplay = document.getElementById('wordCount');

let typingTimer;
const doneTypingInterval = 1000; // 1 second
let isGenerating = false;
let userIsTyping = false;
let lastGeneratedContent = '';
let isInitialRun = false; // Flag to track initial run

// ------------------- MODEL DETAILS (UPDATED) -------------------
const modelDetails = {
  'gemma2-9b-it': {
    developer: 'Google',
    contextWindow: '8,192 tokens',
    status: 'Available',
  },
  'llama-3.3-70b-versatile': {
    developer: 'Meta',
    contextWindow: '128k tokens',
    status: 'Available',
  },
  'llama-3.1-8b-instant': {
    developer: 'Meta',
    contextWindow: '128k tokens',
    status: 'Available',
  },
  'llama-guard-3-8b': {
    developer: 'Meta',
    contextWindow: '8,192 tokens',
    status: 'Available',
  },
  'llama3-70b-8192': {
    developer: 'Meta',
    contextWindow: '8,192 tokens',
    status: 'Available',
  },
  'llama3-8b-8192': {
    developer: 'Meta',
    contextWindow: '8,192 tokens',
    status: 'Available',
  },
  'mixtral-8x7b-32768': {
    developer: 'Mistral',
    contextWindow: '32,768 tokens',
    status: 'Available',
  },
};

// ------------------- MODAL HANDLERS -------------------
function openApiModal() {
  modal.style.display = 'block';
}
function closeApiModal() {
  modal.style.display = 'none';
}

function loadApiKey() {
  const savedApiKey = localStorage.getItem('groqApiKey');
  if (!savedApiKey) {
    openApiModal();
  }
}

saveApiKeyBtn.addEventListener('click', () => {
  const apiKey = modalApiKeyInput.value.trim();
  if (apiKey) {
    localStorage.setItem('groqApiKey', apiKey);
    closeApiModal();
  } else {
    alert('API Key cannot be empty');
  }
});

closeModalBtn.addEventListener('click', closeApiModal);
changeApiKeyBtn.addEventListener('click', openApiModal);

// ------------------- HAMBURGER MENU -------------------
hamburgerBtn.addEventListener('click', () => {
  hamburgerMenu.style.display = 'block';
});

closeBtn.addEventListener('click', () => {
  hamburgerMenu.style.display = 'none';
});

window.addEventListener('click', function(event) {
  if (
    hamburgerMenu.style.display === 'block' &&
    !hamburgerMenu.contains(event.target) &&
    event.target !== hamburgerBtn
  ) {
    hamburgerMenu.style.display = 'none';
  }
});

// ------------------- MODEL SELECTION STORAGE -------------------
function loadSelectedModel() {
  const savedModel = localStorage.getItem('selectedModel');
  if (savedModel && modelDetails[savedModel]) {
    modelSelect.value = savedModel;
  } else {
    // Default to the first in your updated list
    modelSelect.value = 'gemma2-9b-it';
  }
}

function applyTheme(theme) {
  document.body.classList.remove(
    'theme-terminal',
    'theme-solarized-light',
    'theme-solarized-dark',
    'theme-midnight',
    'theme-lavender',
    'theme-forest',
    'theme-neon',
    'theme-cyberpunk'
  );
  document.body.classList.add(`theme-${theme}`);
}

function loadSelectedTheme() {
  const savedTheme = localStorage.getItem('selectedTheme');
  if (savedTheme) {
    themeSelect.value = savedTheme;
    applyTheme(savedTheme);
  } else {
    themeSelect.value = 'terminal';
    applyTheme('terminal');
  }
}

themeSelect.addEventListener('change', () => {
  const selectedTheme = themeSelect.value;
  applyTheme(selectedTheme);
  localStorage.setItem('selectedTheme', selectedTheme);
});

modelSelect.addEventListener('change', () => {
  const selectedModel = modelSelect.value;
  localStorage.setItem('selectedModel', selectedModel);
});

// ------------------- INITIAL LOAD -------------------
window.addEventListener('load', () => {
  loadingScreen.style.display = 'none';
  loadApiKey();
  loadSelectedModel();
  loadSelectedTheme();
  handleInitialRun();
  initializeMutationObserver();
});

function handleInitialRun() {
  const hasRunBefore = localStorage.getItem('hasRunBefore');
  if (!hasRunBefore) {
    isInitialRun = true;
    localStorage.setItem('hasRunBefore', 'true');
    alert('Generating...');
    insertGeneratedSentence('this is how it generates the rest of your sentence.', true);
    setTimeout(() => {
      displayInstructionMessage();
      scrollToBottom();
    }, 2000);
  }
}

// ------------------- TEXT GENERATION LOGIC -------------------
function insertGeneratedSentence(sentence, isInitial = false) {
  const generatedSpan = document.createElement('span');
  generatedSpan.classList.add('generated');
  editor.appendChild(generatedSpan);

  const needsSpace = /\S$/.test(editor.textContent);
  const words = sentence.split(' ');
  let wordIndex = 0;

  function typeNextWord() {
    if (wordIndex < words.length) {
      const prefix = wordIndex === 0 ? (needsSpace ? ' ' : '') : ' ';
      generatedSpan.textContent += prefix + words[wordIndex];
      wordIndex++;
      scrollToBottom();
      setTimeout(typeNextWord, 50);
    } else {
      if (isInitialRun && isInitial) {
        displayInstructionMessage();
      }
      scrollToBottom();
    }
  }
  typeNextWord();
}

function displayInstructionMessage() {
  if (document.getElementById('instructionMessage')) return;
  const instruction = document.createElement('div');
  instruction.id = 'instructionMessage';
  instruction.innerHTML = '<em>press enter to keep the generated text or just type</em>';
  instruction.style.marginTop = '10px';
  editor.appendChild(instruction);
  scrollToBottom();
}

function removeInstructionMessage() {
  const instruction = document.getElementById('instructionMessage');
  if (instruction) {
    instruction.remove();
  }
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    editor.scrollTop = editor.scrollHeight;
  });
}

function initializeMutationObserver() {
  const observer = new MutationObserver(() => {
    scrollToBottom();
  });
  observer.observe(editor, { childList: true, subtree: true, characterData: true });
}

editor.addEventListener('input', () => {
  if (!userIsTyping) return;
  clearTimeout(typingTimer);
  const text = editor.innerText.trim();
  const words = text ? text.split(/\s+/) : [];
  if (wordCountDisplay) {
    wordCountDisplay.textContent = `Word Count: ${words.length}`;
  }
  if (words.length >= 3 && !isGenerating) {
    typingTimer = setTimeout(generateNextSentence, doneTypingInterval);
  }
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
      generatedSpan.classList.add('accepted');
      placeCaretAtEnd(editor);
    }
    if (document.getElementById('instructionMessage')) {
      removeInstructionMessage();
      scrollToBottom();
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
    const selectedModel = modelSelect.value;
    const selectedModelDetails = modelDetails[selectedModel];
    if (!selectedModelDetails || selectedModelDetails.status === 'Offline') {
      alert('The selected model is currently unavailable. Please choose another model.');
      isGenerating = false;
      return;
    }

    // Use the entire text history
    const entireText = text;

    // Example: Adjust to your actual endpoint and request shape
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that generates the next sentence based on the given text. ' +
              'Max 20 words. Respond with only the next sentence and never start with a capitalized first ' +
              'word unless it is "I" or a proper noun.',
          },
          { role: 'user', content: entireText },
        ],
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();
    const generatedSentence = data.choices[0].message.content.trim();

    if (!generatedSentence) {
      throw new Error('Received empty response from API.');
    }

    insertGeneratedSentence(generatedSentence);
    lastGeneratedContent = generatedSentence;
  } catch (error) {
    alert(`Error: ${error.message}`);
    console.error('Error in generateNextSentence:', error);
  } finally {
    isGenerating = false;
  }
}

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
