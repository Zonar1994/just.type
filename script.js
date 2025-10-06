// ------------------- DOM ELEMENTS -------------------
const editor = document.getElementById('editor');
const modal = document.getElementById('apiModal');
const modalApiKeyInput = document.getElementById('modalApiKey');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const changeApiKeyBtn = document.getElementById('changeApiKeyBtn');
const loadingScreen = document.getElementById('loadingScreen');
const modelSelect = document.getElementById('modelSelect');
const modelInfo = document.getElementById('modelInfo');
const themeSelect = document.getElementById('themeSelect');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const hamburgerMenu = document.getElementById('hamburgerMenu');
const closeBtn = document.querySelector('.close-btn');
const closeModalBtn = document.querySelector('.close-modal');
const wordCountDisplay = document.getElementById('wordCount');
const systemPromptInput = document.getElementById('systemPrompt');
const appDetail = document.getElementById('appDetail');
const backButton = document.getElementById('backToCatalog');
const appShells = document.querySelectorAll('.app-shell');
const appCards = document.querySelectorAll('.app-card');
const launchTriggers = document.querySelectorAll('[data-launch]');

let typingTimer;
const doneTypingInterval = 1000; // 1 second
let isGenerating = false;
let userIsTyping = false;
let lastGeneratedContent = '';
let isInitialRun = false; // Flag to track initial run
let isJustTypeInitialized = false;
let mutationObserver;
let isVisualsInitialized = false;

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
  if (modal) {
    modal.style.display = 'flex';
  }
}
function closeApiModal() {
  if (modal) {
    modal.style.display = 'none';
  }
}

function loadApiKey() {
  const savedApiKey = localStorage.getItem('groqApiKey');
  if (!savedApiKey) {
    openApiModal();
  }
}

function loadSystemPrompt() {
  if (!systemPromptInput) return;
  const savedPrompt = localStorage.getItem('systemPrompt');
  if (savedPrompt) {
    systemPromptInput.value = savedPrompt;
  } else {
    systemPromptInput.value = DEFAULT_SYSTEM_PROMPT;
  }
}

if (systemPromptInput) {
  systemPromptInput.addEventListener('change', () => {
    localStorage.setItem('systemPrompt', systemPromptInput.value);
  });
}

if (saveApiKeyBtn) {
  saveApiKeyBtn.addEventListener('click', () => {
    const apiKey = modalApiKeyInput.value.trim();
    if (apiKey) {
      localStorage.setItem('groqApiKey', apiKey);
      closeApiModal();
    } else {
      alert('API Key cannot be empty');
    }
  });
}

if (closeModalBtn) {
  closeModalBtn.addEventListener('click', closeApiModal);
}

if (changeApiKeyBtn) {
  changeApiKeyBtn.addEventListener('click', openApiModal);
}

// ------------------- LOADING SCREEN -------------------
function showLoadingScreen() {
  if (loadingScreen) {
    loadingScreen.classList.remove('hidden');
  }
}

function hideLoadingScreen() {
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
  }
}

// ------------------- HAMBURGER MENU -------------------
function toggleMenu(show) {
  if (!hamburgerMenu) return;
  const shouldShow = show !== undefined ? show : hamburgerMenu.style.display !== 'block';
  hamburgerMenu.style.display = shouldShow ? 'block' : 'none';
}

if (hamburgerBtn) {
  hamburgerBtn.addEventListener('click', () => toggleMenu(true));
}

if (closeBtn) {
  closeBtn.addEventListener('click', () => toggleMenu(false));
}

window.addEventListener('click', function(event) {
  if (
    hamburgerMenu &&
    hamburgerBtn &&
    hamburgerMenu.style.display === 'block' &&
    !hamburgerMenu.contains(event.target) &&
    event.target !== hamburgerBtn
  ) {
    toggleMenu(false);
  }
});

// ------------------- MODEL SELECTION STORAGE -------------------
function loadSelectedModel() {
  if (!modelSelect) return;
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
  if (!themeSelect) {
    applyTheme('terminal');
    return;
  }
  const savedTheme = localStorage.getItem('selectedTheme');
  if (savedTheme) {
    themeSelect.value = savedTheme;
    applyTheme(savedTheme);
  } else {
    themeSelect.value = 'terminal';
    applyTheme('terminal');
  }
}

if (themeSelect) {
  themeSelect.addEventListener('change', () => {
    const selectedTheme = themeSelect.value;
    applyTheme(selectedTheme);
    localStorage.setItem('selectedTheme', selectedTheme);
  });
}

if (modelSelect) {
  modelSelect.addEventListener('change', () => {
    const selectedModel = modelSelect.value;
    localStorage.setItem('selectedModel', selectedModel);
    updateModelInfo();
  });
}

function updateModelInfo() {
  if (!modelInfo || !modelSelect) return;
  const details = modelDetails[modelSelect.value];
  if (!details) {
    modelInfo.textContent = '';
    return;
  }

  modelInfo.innerHTML = `
    <div><strong>Developer:</strong> ${details.developer}</div>
    <div><strong>Context:</strong> ${details.contextWindow}</div>
    <div class="status-pill ${details.status === 'Available' ? 'available' : 'offline'}">${details.status}</div>
  `;
}

// ------------------- CATALOG EXPERIENCE -------------------
function initializeJustTypeApp() {
  if (isJustTypeInitialized) return;
  loadSelectedModel();
  loadSystemPrompt();
  handleInitialRun();
  initializeMutationObserver();
  updateWordCount();
  updateModelInfo();
  isJustTypeInitialized = true;
}

function initializeVisualsApp() {
  if (isVisualsInitialized) return;

  const visualsCanvas = document.getElementById('visualsCanvas');
  const controlsDiv = document.getElementById('visualsControls');
  const THREERef = window.THREE;

  if (!visualsCanvas || !controlsDiv || !THREERef) {
    console.warn('Visuals app assets are not available yet.');
    return;
  }

  const startTime = performance.now();
  const container = controlsDiv.parentElement;
  const fullscreenToggle = document.getElementById('fullscreenToggle');

  if (!container) {
    console.warn('Visuals container element is missing.');
    return;
  }

  const targetAspectRatio = 16 / 9;

  const isFullscreenActive = () => {
    const fullscreenElement = document.fullscreenElement;
    return fullscreenElement === container || fullscreenElement === visualsCanvas;
  };

  const getAvailableSize = () => {
    if (isFullscreenActive()) {
      return { width: window.innerWidth, height: window.innerHeight };
    }

    const rect = container.getBoundingClientRect();
    const width = rect.width || container.clientWidth || window.innerWidth;
    const height = rect.height || container.clientHeight || window.innerHeight;

    return { width, height };
  };

  const computeDisplaySize = () => {
    const { width: availableWidth, height: availableHeight } = getAvailableSize();

    let width = availableWidth;
    let height = width / targetAspectRatio;

    if (height > availableHeight) {
      height = availableHeight;
      width = height * targetAspectRatio;
    }

    return { width, height };
  };

  const initialSize = computeDisplaySize();

  const vertexShader = `
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    precision mediump float;
    precision mediump int;

    uniform float u_time;
    uniform float u_resolution_x;
    uniform float u_resolution_y;
    uniform float u_speed;
    uniform float u_frequency;
    uniform float u_amplitude;
    uniform float u_color_shift;
    uniform float u_red_base;
    uniform float u_green_base;
    uniform float u_blue_base;
    uniform float u_grain_amount;
    uniform float u_clump_density;
    uniform float u_clump_speed;
    uniform float u_clump_threshold;

    vec2 hash(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(dot(hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
            dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
        mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
            dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float rand(vec2 co) {
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / vec2(u_resolution_x, u_resolution_y);
      uv = uv * 2.0 - 1.0;

      float n_flow = noise(uv * u_frequency + u_time * u_speed);
      vec3 flow_color = vec3(
        sin(n_flow * u_amplitude + u_color_shift * 6.28 + u_red_base * 6.28) * 0.5 + 0.5,
        sin(n_flow * u_amplitude + u_color_shift * 6.28 + u_green_base * 6.28) * 0.5 + 0.5,
        sin(n_flow * u_amplitude + u_color_shift * 6.28 + u_blue_base * 6.28) * 0.5 + 0.5
      );

      float clump_noise_val = noise(uv * u_clump_density + u_time * u_clump_speed);
      float clump_mask = smoothstep(u_clump_threshold - 0.1, u_clump_threshold + 0.1, clump_noise_val);

      vec3 final_color = mix(vec3(0.0), flow_color, clump_mask);
      float grain = (rand(gl_FragCoord.xy) * 2.0 - 1.0) * u_grain_amount;
      final_color += grain;

      gl_FragColor = vec4(final_color, 1.0);
    }
  `;

  const controls = {
    speed: document.getElementById('speed'),
    frequency: document.getElementById('frequency'),
    amplitude: document.getElementById('amplitude'),
    colorShift: document.getElementById('colorShift'),
    redColor: document.getElementById('redColor'),
    greenColor: document.getElementById('greenColor'),
    blueColor: document.getElementById('blueColor'),
    grainAmount: document.getElementById('grainAmount'),
    clumpDensity: document.getElementById('clumpDensity'),
    clumpSpeed: document.getElementById('clumpSpeed'),
    clumpThreshold: document.getElementById('clumpThreshold'),
  };

  const uniforms = {
    u_time: { value: 0.0 },
    u_resolution_x: { value: initialSize.width },
    u_resolution_y: { value: initialSize.height },
    u_speed: { value: parseFloat(controls.speed?.value || '1.0') },
    u_frequency: { value: parseFloat(controls.frequency?.value || '2.0') },
    u_amplitude: { value: parseFloat(controls.amplitude?.value || '1.0') },
    u_color_shift: { value: parseFloat(controls.colorShift?.value || '0.0') },
    u_red_base: { value: parseFloat(controls.redColor?.value || '0.5') },
    u_green_base: { value: parseFloat(controls.greenColor?.value || '0.5') },
    u_blue_base: { value: parseFloat(controls.blueColor?.value || '0.5') },
    u_grain_amount: { value: parseFloat(controls.grainAmount?.value || '0.05') },
    u_clump_density: { value: parseFloat(controls.clumpDensity?.value || '1.5') },
    u_clump_speed: { value: parseFloat(controls.clumpSpeed?.value || '0.3') },
    u_clump_threshold: { value: parseFloat(controls.clumpThreshold?.value || '0.5') },
  };

  const scene = new THREERef.Scene();
  const camera = new THREERef.PerspectiveCamera(
    75,
    initialSize.width / initialSize.height,
    0.1,
    1000
  );
  camera.position.z = 1;

  const renderer = new THREERef.WebGLRenderer({ canvas: visualsCanvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);

  const geometry = new THREERef.PlaneGeometry(2, 2);
  const material = new THREERef.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
  });
  const mesh = new THREERef.Mesh(geometry, material);
  scene.add(mesh);

  const updateRendererSize = () => {
    const { width, height } = computeDisplaySize();
    renderer.setSize(width, height, true);
    uniforms.u_resolution_x.value = width;
    uniforms.u_resolution_y.value = height;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const syncFullscreenToggle = (isActive) => {
    if (!fullscreenToggle) return;
    fullscreenToggle.textContent = isActive ? 'Exit Fullscreen' : 'Enter Fullscreen';
    fullscreenToggle.setAttribute('aria-pressed', String(isActive));
  };

  const handleFullscreenChange = () => {
    const fullscreenActive = isFullscreenActive();
    container.classList.toggle('fullscreen-active', fullscreenActive);
    syncFullscreenToggle(fullscreenActive);
    updateRendererSize();
  };

  if (fullscreenToggle) {
    fullscreenToggle.addEventListener('click', () => {
      if (isFullscreenActive()) {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      } else {
        const targetElement = container.requestFullscreen ? container : visualsCanvas;
        targetElement?.requestFullscreen?.();
      }
    });
  }

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('fullscreenerror', handleFullscreenChange);

  handleFullscreenChange();

  window.addEventListener('resize', updateRendererSize);

  Object.entries({
    speed: 'u_speed',
    frequency: 'u_frequency',
    amplitude: 'u_amplitude',
    colorShift: 'u_color_shift',
    redColor: 'u_red_base',
    greenColor: 'u_green_base',
    blueColor: 'u_blue_base',
    grainAmount: 'u_grain_amount',
    clumpDensity: 'u_clump_density',
    clumpSpeed: 'u_clump_speed',
    clumpThreshold: 'u_clump_threshold',
  }).forEach(([controlKey, uniformKey]) => {
    const controlEl = controls[controlKey];
    if (!controlEl) return;
    controlEl.addEventListener('input', () => {
      uniforms[uniformKey].value = parseFloat(controlEl.value);
    });
  });

  visualsCanvas.addEventListener('click', () => {
    controlsDiv.classList.toggle('hidden-controls');
  });

  const animate = () => {
    uniforms.u_time.value = (performance.now() - startTime) * 0.001;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };

  animate();
  isVisualsInitialized = true;
}

function openApp(appId) {
  if (!appDetail) return;

  document.body.classList.add('app-open');
  appDetail.classList.add('active');

  appShells.forEach((shell) => {
    const isTarget = shell.dataset.app === appId;
    shell.classList.toggle('active', isTarget);
  });

  if (appId === 'justtype') {
    showLoadingScreen();
    setTimeout(() => {
      initializeJustTypeApp();
      loadApiKey();
      hideLoadingScreen();
      if (editor) {
        placeCaretAtEnd(editor);
      }
    }, 650);
  } else if (appId === 'visuals') {
    const controlsDiv = document.getElementById('visualsControls');
    if (controlsDiv) {
      controlsDiv.classList.remove('hidden-controls');
    }
    initializeVisualsApp();
  } else {
    hideLoadingScreen();
  }
}

function closeAppDetail() {
  if (!appDetail) return;
  appDetail.classList.remove('active');
  document.body.classList.remove('app-open');
  toggleMenu(false);
  hideLoadingScreen();
}

function initializeCatalog() {
  loadSelectedTheme();
  loadSelectedModel();
  updateModelInfo();
  updateWordCount();

  appCards.forEach((card) => {
    card.addEventListener('click', () => {
      const appId = card.dataset.app;
      if (appId) {
        openApp(appId);
      }
    });
  });

  launchTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      const appId = trigger.dataset.launch;
      if (appId) {
        openApp(appId);
      }
    });
  });

  if (backButton) {
    backButton.addEventListener('click', () => {
      closeAppDetail();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && appDetail && appDetail.classList.contains('active')) {
      closeAppDetail();
    }
  });
}

initializeCatalog();

function handleInitialRun() {
  const hasRunBefore = localStorage.getItem('hasRunBefore');
  if (!hasRunBefore) {
    isInitialRun = true;
    localStorage.setItem('hasRunBefore', 'true');
    const startSequence = () => {
      insertGeneratedSentence('this is how it generates the rest of your sentence.', true);
      setTimeout(() => {
        displayInstructionMessage();
        scrollToBottom();
      }, 2000);
    };

    if (editor) {
      const bootMessage = document.createElement('div');
      bootMessage.className = 'boot-message';
      bootMessage.textContent = 'booting neural muse...';
      editor.appendChild(bootMessage);
      scrollToBottom();

      setTimeout(() => {
        bootMessage.remove();
        startSequence();
      }, 900);
    } else {
      startSequence();
    }
  }
}

// ------------------- TEXT GENERATION LOGIC -------------------
const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful assistant that generates the next sentence based on the given text. Max 20 words. Respond with only the next sentence and never start with a capitalized first word unless it is "I" or a proper noun.';

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
  if (!editor || mutationObserver) return;
  mutationObserver = new MutationObserver(() => {
    scrollToBottom();
  });
  mutationObserver.observe(editor, { childList: true, subtree: true, characterData: true });
}

function updateWordCount() {
  const text = editor.innerText.trim();
  const words = text ? text.split(/\s+/) : [];
  if (wordCountDisplay) {
    wordCountDisplay.textContent = `Word Count: ${words.length}`;
  }
}

if (editor) {
  editor.addEventListener('input', () => {
    if (!userIsTyping) return;
    clearTimeout(typingTimer);
    updateWordCount();
    const text = editor.innerText.trim();
    const words = text ? text.split(/\s+/) : [];
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
}

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

    const entireText = text;

    const systemPrompt = localStorage.getItem('systemPrompt') || DEFAULT_SYSTEM_PROMPT;

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
            content: systemPrompt,
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
