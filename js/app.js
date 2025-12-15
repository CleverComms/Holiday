/**
 * HoliBobs - Travel Money App
 * Compare prices in local currency vs your home currency
 */

// =============================================
// STATE & CONFIGURATION
// =============================================

const APP_VERSION = '2.6.16';
const RATE_UPDATE_INTERVAL = 24 * 60 * 60 * 1000;
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

// Currency configuration for smart step sizes and decimal handling
const ZERO_DECIMAL_CURRENCIES = ['JPY', 'KRW', 'VND', 'IDR', 'CLP', 'COP', 'HUF', 'ISK', 'UGX', 'RWF', 'KHR', 'LAK', 'MMK', 'PYG', 'XOF', 'XAF'];
const HIGH_VALUE_CURRENCIES = ['GBP', 'USD', 'EUR', 'CHF', 'AUD', 'CAD', 'NZD', 'SGD', 'KWD', 'BHD', 'OMR', 'JOD']; // ~1 USD or more per unit

// Get appropriate step size for a currency based on its value
function getCurrencyStep(currency, currentAmount) {
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(currency);
  const isHighValue = HIGH_VALUE_CURRENCIES.includes(currency);

  if (isZeroDecimal) {
    // Large number currencies like JPY, KRW, VND
    if (currentAmount >= 100000) return 10000;
    if (currentAmount >= 10000) return 1000;
    if (currentAmount >= 1000) return 100;
    return 100;
  } else if (isHighValue) {
    // High-value currencies like GBP, USD, EUR
    if (currentAmount >= 500) return 50;
    if (currentAmount >= 100) return 10;
    if (currentAmount >= 50) return 5;
    return 1;
  } else {
    // Medium-value currencies like MXN, THB, PHP
    if (currentAmount >= 10000) return 500;
    if (currentAmount >= 1000) return 100;
    if (currentAmount >= 100) return 50;
    if (currentAmount >= 50) return 10;
    return 10;
  }
}

// Get decimal places for a currency
function getCurrencyDecimals(currency) {
  return ZERO_DECIMAL_CURRENCIES.includes(currency) ? 0 : 2;
}

// Format amount with thousand separators
function formatAmountDisplay(amount, currency) {
  const decimals = getCurrencyDecimals(currency);

  // Clean up the number - remove floating point artifacts
  const cleanAmount = Math.round(amount * 100) / 100;
  const isWholeNumber = cleanAmount === Math.floor(cleanAmount);

  // Zero decimal currencies (JPY, KRW, etc.) - never show decimals
  if (decimals === 0) {
    return Math.round(cleanAmount).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  // For other currencies: show whole numbers cleanly, decimals with 2 places
  if (isWholeNumber) {
    return cleanAmount.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  return cleanAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Parse formatted amount back to number
function parseAmountInput(value) {
  // Remove thousand separators and trailing decimal points, then parse
  const cleaned = value.toString().replace(/,/g, '').replace(/\.$/,'');
  return parseFloat(cleaned) || 0;
}

// Auto-size input font to fit content
function autoSizeInput(input) {
  if (!input) return;

  const minFontSize = 14;
  const maxFontSize = 24;
  const inputWidth = input.offsetWidth - 32; // Account for padding

  // Create a temporary span to measure text width
  const span = document.createElement('span');
  span.style.visibility = 'hidden';
  span.style.position = 'absolute';
  span.style.whiteSpace = 'nowrap';
  span.style.fontFamily = getComputedStyle(input).fontFamily;
  span.style.fontWeight = '700';
  span.textContent = input.value || '0';
  document.body.appendChild(span);

  // Start with max font size and scale down if needed
  let fontSize = maxFontSize;
  span.style.fontSize = fontSize + 'px';

  while (span.offsetWidth > inputWidth && fontSize > minFontSize) {
    fontSize -= 1;
    span.style.fontSize = fontSize + 'px';
  }

  document.body.removeChild(span);
  input.style.fontSize = fontSize + 'px';
}

// Auto-size all price inputs
function autoSizeAllInputs() {
  autoSizeInput(elements.localAmountInput);
  autoSizeInput(elements.altAmountInput);
  autoSizeInput(elements.homeAmountInput);
}

let state = {
  homeCurrency: 'GBP',
  destinationCountry: null,
  localCurrency: 'MXN',
  altCurrency: 'USD',
  localAmount: 500,
  altAmount: 30,
  homeAmount: 50, // Amount in home currency for reverse conversion
  pricesLocked: true, // Default to linked prices
  surchargeAmount: 0,
  surchargeType: 'percent', // 'percent' or 'fixed'
  walletCountries: [],
  rates: {},
  currencies: {},
  countries: {},
  scams: {},
  lastRateUpdate: null,
  userName: '' // User's name for personalized greetings
};

// Guard flag to prevent re-entrant sync calls
let isSyncing = false;
let lastSyncTime = 0;
const SYNC_DEBOUNCE_MS = 100; // Minimum time between syncs

// =============================================
// DOM ELEMENTS
// =============================================

const elements = {
  // Splash screen
  splashScreen: document.getElementById('splashScreen'),
  splashVersion: document.getElementById('splashVersion'),

  // App title
  appTitle: document.getElementById('appTitle'),

  // Locale greeting
  localeGreeting: document.getElementById('localeGreeting'),

  // Destination header
  destHeaderBtn: document.getElementById('destHeaderBtn'),
  destHeaderFlag: document.getElementById('destHeaderFlag'),
  destHeaderName: document.getElementById('destHeaderName'),
  locateBtn: document.getElementById('locateBtn'),

  // Price comparison
  localAmountInput: document.getElementById('localAmountInput'),
  altAmountInput: document.getElementById('altAmountInput'),
  localFlag: document.getElementById('localFlag'),
  localCurrency: document.getElementById('localCurrency'),
  localCurrencyName: document.getElementById('localCurrencyName'),
  altFlag: document.getElementById('altFlag'),
  altCurrency: document.getElementById('altCurrency'),
  altCurrencyName: document.getElementById('altCurrencyName'),
  localHomeFlag: document.getElementById('localHomeFlag'),
  localHomeAmount: document.getElementById('localHomeAmount'),
  altHomeFlag: document.getElementById('altHomeFlag'),
  altHomeAmount: document.getElementById('altHomeAmount'),
  localSurchargeIndicator: document.getElementById('localSurchargeIndicator'),
  altSurchargeIndicator: document.getElementById('altSurchargeIndicator'),
  dealIndicator: document.getElementById('dealIndicator'),
  dealText: document.getElementById('dealText'),
  localPriceCard: document.getElementById('localPriceCard'),
  altPriceCard: document.getElementById('altPriceCard'),

  // Home currency card
  homeCurrencyCard: document.getElementById('homeCurrencyCard'),
  homeCardFlag: document.getElementById('homeCardFlag'),
  homeCardCurrency: document.getElementById('homeCardCurrency'),
  homeCurrencyName: document.getElementById('homeCurrencyName'),
  homeAmountInput: document.getElementById('homeAmountInput'),
  homeSurchargeIndicator: document.getElementById('homeSurchargeIndicator'),

  // Lock toggle and surcharge
  lockToggleBtn: document.getElementById('lockToggleBtn'),
  lockIcon: document.getElementById('lockIcon'),
  lockText: document.getElementById('lockText'),
  clearPricesBtn: document.getElementById('clearPricesBtn'),
  surchargeToggleBtn: document.getElementById('surchargeToggleBtn'),
  surchargeRow: document.getElementById('surchargeRow'),
  surchargePresets: document.getElementById('surchargePresets'),
  surchargeCustom: document.getElementById('surchargeCustom'),
  surchargeInput: document.getElementById('surchargeInput'),
  surchargeMinus: document.getElementById('surchargeMinus'),
  surchargePlus: document.getElementById('surchargePlus'),
  surchargePercent: document.getElementById('surchargePercent'),
  surchargeFixed: document.getElementById('surchargeFixed'),

  // Payment info
  paymentInfo: document.getElementById('paymentInfo'),
  cashStatus: document.getElementById('cashStatus'),
  cardsStatus: document.getElementById('cardsStatus'),
  contactlessStatus: document.getElementById('contactlessStatus'),
  paymentTip: document.getElementById('paymentTip'),
  paymentTipText: document.getElementById('paymentTipText'),

  // Scams/Safety tabs
  countryTab: document.getElementById('countryTab'),
  tipsTab: document.getElementById('tipsTab'),
  countryTabFlag: document.getElementById('countryTabFlag'),
  countryTabText: document.getElementById('countryTabText'),
  countryTabContent: document.getElementById('countryTabContent'),
  tipsTabContent: document.getElementById('tipsTabContent'),
  noCountryMessage: document.getElementById('noCountryMessage'),
  generalScams: document.getElementById('generalScams'),
  countryTips: document.getElementById('countryTips'),
  countryScams: document.getElementById('countryScams'),

  // Rate status
  lastUpdated: document.getElementById('lastUpdated'),

  // Modals
  currencyModal: document.getElementById('currencyModal'),
  closeCurrencyModal: document.getElementById('closeCurrencyModal'),
  currencySearch: document.getElementById('currencySearch'),
  currencyList: document.getElementById('currencyList'),

  destinationModal: document.getElementById('destinationModal'),
  closeDestinationModal: document.getElementById('closeDestinationModal'),
  destinationSearch: document.getElementById('destinationSearch'),
  destinationList: document.getElementById('destinationList'),
  walletSection: document.getElementById('walletSection'),
  walletList: document.getElementById('walletList'),

  settingsModal: document.getElementById('settingsModal'),
  settingsBtn: document.getElementById('settingsBtn'),
  closeSettingsModal: document.getElementById('closeSettingsModal'),
  userNameInput: document.getElementById('userNameInput'),
  nameSaveStatus: document.getElementById('nameSaveStatus'),
  homeSettingBtn: document.getElementById('homeSettingBtn'),
  updateRatesBtn: document.getElementById('updateRatesBtn'),
  settingsLastUpdated: document.getElementById('settingsLastUpdated'),
  homeSettingFlag: document.getElementById('homeSettingFlag'),
  homeSettingCode: document.getElementById('homeSettingCode'),
  homeSettingName: document.getElementById('homeSettingName'),

  // QR Code Modal
  qrModal: document.getElementById('qrModal'),
  closeQrModal: document.getElementById('closeQrModal'),
  shareQrBtn: document.getElementById('shareQrBtn'),
  qrContainer: document.getElementById('qrContainer'),
  qrUrl: document.getElementById('qrUrl'),
  qrCopyBtn: document.getElementById('qrCopyBtn'),

  // A2HS
  a2hsBanner: document.getElementById('a2hsBanner'),
  a2hsInstall: document.getElementById('a2hsInstall'),
  a2hsDismiss: document.getElementById('a2hsDismiss'),
  iosA2hsModal: document.getElementById('iosA2hsModal'),
  closeIosModal: document.getElementById('closeIosModal'),

  // Toast
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toastMessage'),
  toastIcon: document.getElementById('toastIcon'),

  // Setup wizard
  setupModal: document.getElementById('setupModal'),
  setupHomeCurrencyBtn: document.getElementById('setupHomeCurrencyBtn'),
  setupHomeFlag: document.getElementById('setupHomeFlag'),
  setupHomeCode: document.getElementById('setupHomeCode'),
  setupHomeName: document.getElementById('setupHomeName'),
  setupDestBtn: document.getElementById('setupDestBtn'),
  setupDestFlag: document.getElementById('setupDestFlag'),
  setupDestName: document.getElementById('setupDestName'),
  setupSkip: document.getElementById('setupSkip'),
  setupDone: document.getElementById('setupDone'),

  // Theme toggle
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeTransition: document.getElementById('themeTransition'),
  starsContainer: document.getElementById('starsContainer'),

  // Location banner
  locationBanner: document.getElementById('locationBanner'),
  locationBannerTitle: document.getElementById('locationBannerTitle'),
  locationBannerFlag: document.getElementById('locationBannerFlag'),
  locationYesBtn: document.getElementById('locationYesBtn'),
  locationNoBtn: document.getElementById('locationNoBtn'),

  // Update banner
  updateBanner: document.getElementById('updateBanner'),
  updateBtn: document.getElementById('updateBtn'),

  // Footer
  appVersion: document.getElementById('appVersion')
};

let currentModalContext = null;
let deferredPrompt = null;
let isFirstLoad = false;
let detectedCountry = null;
let waitingServiceWorker = null;
let locationDetectionDone = false; // Prevent double location detection

// =============================================
// FLAG RENDERING HELPER
// =============================================

function renderFlag(currencyCode, size = 'md') {
  const currency = state.currencies[currencyCode];
  if (!currency || !currency.code) {
    return '';
  }
  const sizeClass = size === 'lg' ? 'fi-lg' : (size === 'sm' ? 'fi-sm' : '');
  return `<span class="fi fi-${currency.code} ${sizeClass}"></span>`;
}

function setFlagElement(element, currencyCode, size = 'md') {
  if (!element) return;
  const currency = state.currencies[currencyCode];
  if (!currency || !currency.code) {
    element.innerHTML = '';
    return;
  }
  const sizeClass = size === 'lg' ? 'fi-lg' : (size === 'sm' ? 'fi-sm' : '');
  element.innerHTML = `<span class="fi fi-${currency.code} ${sizeClass}"></span>`;
}

function setCountryFlag(element, countryName, size = 'md') {
  if (!element) return;
  const countryData = state.countries[countryName];
  if (countryData && countryData.code) {
    const sizeClass = size === 'lg' ? 'fi-lg' : (size === 'sm' ? 'fi-sm' : '');
    element.innerHTML = `<span class="fi fi-${countryData.code.toLowerCase()} ${sizeClass}"></span>`;
  } else if (countryData) {
    setFlagElement(element, countryData.currency, size);
  } else {
    element.innerHTML = '';
  }
}

// =============================================
// INITIALIZATION
// =============================================

async function init() {
  initTheme();
  animateTitle();
  checkFirstLoad();
  loadState();
  await loadDataFiles();
  setupEventListeners();
  displayVersion();

  render();

  if (isFirstLoad) {
    // Mark setup as complete and detect location
    localStorage.setItem('holibobsSetupComplete', 'true');
    detectUserLocation(true);
    showToast('Welcome to HoliBobs! 🦝');
  } else {
    // Check if we should offer location detection (non-annoying prompt)
    checkLocationSuggestion();
  }

  checkRateUpdates();
  registerServiceWorker();
  setupAddToHomeScreen();

  // Hide splash screen once app is ready
  hideSplashScreen();
}

function hideSplashScreen() {
  if (elements.splashScreen) {
    // Small delay to ensure everything is rendered
    setTimeout(() => {
      elements.splashScreen.classList.add('hidden');
    }, 300);
  }
}

function checkFirstLoad() {
  const hasVisited = localStorage.getItem('holibobsSetupComplete');
  isFirstLoad = !hasVisited;
}

function displayVersion() {
  if (elements.appVersion) {
    elements.appVersion.textContent = `v${APP_VERSION}`;
  }
  if (elements.splashVersion) {
    elements.splashVersion.textContent = `v${APP_VERSION}`;
  }
}

function showSetupWizard() {
  elements.setupModal.classList.add('active');
  updateSetupDisplay();
}

function updateSetupDisplay() {
  const home = state.currencies[state.homeCurrency];
  if (home) {
    setFlagElement(elements.setupHomeFlag, state.homeCurrency, 'lg');
    elements.setupHomeCode.textContent = state.homeCurrency;
    elements.setupHomeName.textContent = home.name;
  }

  if (state.destinationCountry) {
    setCountryFlag(elements.setupDestFlag, state.destinationCountry, 'lg');
    elements.setupDestName.textContent = state.destinationCountry;
  } else {
    elements.setupDestFlag.innerHTML = '';
    elements.setupDestFlag.textContent = '🌍';
    elements.setupDestName.textContent = 'Tap to select destination';
  }
}

function completeSetup() {
  localStorage.setItem('holibobsSetupComplete', 'true');
  elements.setupModal.classList.remove('active');
  saveState();
  render();
  showToast('Welcome to HoliBobs! 🦝');
}

function loadState() {
  const saved = localStorage.getItem('holibobsState');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
    } catch (e) {
      console.error('Error loading state:', e);
    }
  }
}

function saveState() {
  const toSave = {
    homeCurrency: state.homeCurrency,
    destinationCountry: state.destinationCountry,
    localCurrency: state.localCurrency,
    altCurrency: state.altCurrency,
    localAmount: state.localAmount,
    altAmount: state.altAmount,
    homeAmount: state.homeAmount,
    pricesLocked: state.pricesLocked,
    surchargeAmount: state.surchargeAmount,
    surchargeType: state.surchargeType,
    walletCountries: state.walletCountries,
    rates: state.rates,
    lastRateUpdate: state.lastRateUpdate,
    userName: state.userName
  };
  localStorage.setItem('holibobsState', JSON.stringify(toSave));
}

async function loadDataFiles() {
  try {
    const currenciesResponse = await fetch('./data/currencies.json');
    const currenciesData = await currenciesResponse.json();
    state.currencies = currenciesData.currencies;
    state.countries = currenciesData.countries;

    if (!state.rates || Object.keys(state.rates).length === 0) {
      const ratesResponse = await fetch('./data/rates.json');
      const ratesData = await ratesResponse.json();
      state.rates = ratesData.rates;
      state.lastRateUpdate = ratesData.lastUpdated;
    }

    const scamsResponse = await fetch('./data/scams.json');
    state.scams = await scamsResponse.json();
  } catch (e) {
    console.error('Error loading data files:', e);
    showToast('Error loading data. Please refresh.');
  }
}

// =============================================
// EVENT LISTENERS
// =============================================

function setupEventListeners() {
  // Destination header button
  elements.destHeaderBtn.addEventListener('click', () => openDestinationModal('main'));

  // Locate button - trigger GPS location detection
  if (elements.locateBtn) {
    elements.locateBtn.addEventListener('click', requestUserLocation);
  }

  // Price inputs - parse formatted numbers and format on blur
  elements.localAmountInput.addEventListener('input', (e) => {
    if (isSyncing) return;
    isSyncing = true;
    try {
      state.localAmount = parseAmountInput(e.target.value);
      if (state.pricesLocked) {
        syncLockedPrices('local');
      }
      calculatePrices();
    } finally {
      isSyncing = false;
    }
  });
  elements.localAmountInput.addEventListener('blur', (e) => {
    e.target.value = formatAmountDisplay(state.localAmount, state.localCurrency);
    autoSizeInput(e.target);
  });

  elements.altAmountInput.addEventListener('input', (e) => {
    if (isSyncing) return;
    isSyncing = true;
    try {
      state.altAmount = parseAmountInput(e.target.value);
      if (state.pricesLocked) {
        syncLockedPrices('alt');
      }
      calculatePrices();
    } finally {
      isSyncing = false;
    }
  });
  elements.altAmountInput.addEventListener('blur', (e) => {
    e.target.value = formatAmountDisplay(state.altAmount, state.altCurrency);
    autoSizeInput(e.target);
  });

  // Home amount input
  elements.homeAmountInput.addEventListener('input', (e) => {
    if (isSyncing) return;
    isSyncing = true;
    try {
      state.homeAmount = parseAmountInput(e.target.value);
      calculateHomeConversions();
    } finally {
      isSyncing = false;
    }
  });
  elements.homeAmountInput.addEventListener('blur', (e) => {
    e.target.value = formatAmountDisplay(state.homeAmount, state.homeCurrency);
    autoSizeInput(e.target);
  });

  // +/- buttons for home amount
  document.querySelectorAll('.home-adjust').forEach(btn => {
    btn.addEventListener('click', () => {
      const isPlus = btn.classList.contains('plus');
      adjustHomeAmount(isPlus ? 1 : -1);
    });
  });

  // +/- buttons with press-and-hold support
  let holdInterval = null;
  let holdTimeout = null;
  let activeBtn = null;

  const doAdjust = (btn) => {
    const target = btn.dataset.target;
    const isPlus = btn.classList.contains('plus');

    if (target === 'home') {
      adjustHomeAmount(isPlus ? 1 : -1);
    } else {
      adjustPrice(target, isPlus ? 1 : -1);
    }
  };

  const startHold = (btn) => {
    if (activeBtn) return;
    activeBtn = btn;

    // Visual feedback
    btn.style.transform = 'scale(0.85)';

    // Immediate first adjustment
    doAdjust(btn);

    // Start repeating after 400ms delay
    holdTimeout = setTimeout(() => {
      holdInterval = setInterval(() => {
        doAdjust(btn);
      }, 80); // Repeat every 80ms
    }, 400);
  };

  const stopHold = () => {
    if (activeBtn) {
      activeBtn.style.transform = '';
      activeBtn = null;
    }
    if (holdTimeout) {
      clearTimeout(holdTimeout);
      holdTimeout = null;
    }
    if (holdInterval) {
      clearInterval(holdInterval);
      holdInterval = null;
    }
  };

  // Touch events for mobile
  document.addEventListener('touchstart', (e) => {
    const btn = e.target.closest('.price-adjust');
    if (!btn) return;
    e.preventDefault();
    startHold(btn);
  }, { passive: false });

  document.addEventListener('touchend', stopHold, { passive: false });
  document.addEventListener('touchcancel', stopHold, { passive: false });

  // Mouse events for desktop
  document.addEventListener('mousedown', (e) => {
    const btn = e.target.closest('.price-adjust');
    if (!btn) return;
    e.preventDefault();
    startHold(btn);
  });

  document.addEventListener('mouseup', stopHold);
  document.addEventListener('mouseleave', stopHold);

  // Currency modal
  elements.closeCurrencyModal.addEventListener('click', closeCurrencyModal);
  elements.currencySearch.addEventListener('input', filterCurrencies);
  elements.currencyModal.addEventListener('click', (e) => {
    if (e.target === elements.currencyModal) closeCurrencyModal();
  });

  // Destination modal
  elements.closeDestinationModal.addEventListener('click', closeDestinationModal);
  elements.destinationSearch.addEventListener('input', filterDestinations);
  elements.destinationModal.addEventListener('click', (e) => {
    if (e.target === elements.destinationModal) closeDestinationModal();
  });

  // Settings
  elements.settingsBtn.addEventListener('click', openSettingsModal);
  elements.closeSettingsModal.addEventListener('click', closeSettingsModal);
  elements.settingsModal.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) closeSettingsModal();
  });
  elements.homeSettingBtn.addEventListener('click', () => {
    closeSettingsModal();
    openCurrencyModal('home');
  });
  if (elements.userNameInput) {
    let nameSaveTimeout;
    let nameSavedTimeout;
    elements.userNameInput.addEventListener('input', (e) => {
      state.userName = e.target.value.trim();
      saveState();
      updateLocaleGreeting();

      // Show saving status
      if (elements.nameSaveStatus) {
        clearTimeout(nameSaveTimeout);
        clearTimeout(nameSavedTimeout);

        // Show "saving..."
        elements.nameSaveStatus.textContent = 'saving…';
        elements.nameSaveStatus.classList.remove('saved');
        elements.nameSaveStatus.classList.add('show');

        // After brief delay, show "saved"
        nameSaveTimeout = setTimeout(() => {
          elements.nameSaveStatus.textContent = 'saved';
          elements.nameSaveStatus.classList.add('saved');

          // Hide after a moment
          nameSavedTimeout = setTimeout(() => {
            elements.nameSaveStatus.classList.remove('show');
          }, 1500);
        }, 400);
      }
    });
  }
  elements.updateRatesBtn.addEventListener('click', () => {
    closeSettingsModal();
    updateExchangeRates();
  });

  // QR Code sharing
  if (elements.shareQrBtn) {
    elements.shareQrBtn.addEventListener('click', openQrModal);
  }
  if (elements.closeQrModal) {
    elements.closeQrModal.addEventListener('click', closeQrModal);
  }
  if (elements.qrModal) {
    elements.qrModal.addEventListener('click', (e) => {
      if (e.target === elements.qrModal) closeQrModal();
    });
  }
  if (elements.qrCopyBtn) {
    elements.qrCopyBtn.addEventListener('click', copyShareUrl);
  }

  // A2HS
  elements.a2hsInstall.addEventListener('click', installApp);
  elements.a2hsDismiss.addEventListener('click', dismissA2hs);
  elements.closeIosModal.addEventListener('click', () => {
    elements.iosA2hsModal.classList.remove('active');
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showA2hsBanner();
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCurrencyModal();
      closeDestinationModal();
      closeSettingsModal();
      closeQrModal();
      elements.iosA2hsModal.classList.remove('active');
    }
  });

  // Setup wizard
  elements.setupHomeCurrencyBtn.addEventListener('click', () => {
    openCurrencyModal('setupHome');
  });
  elements.setupDestBtn.addEventListener('click', () => {
    openDestinationModal('setup');
  });
  elements.setupSkip.addEventListener('click', completeSetup);
  elements.setupDone.addEventListener('click', completeSetup);

  // Theme toggle
  if (elements.themeToggleBtn) {
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
  }

  // Location banner
  elements.locationYesBtn.addEventListener('click', acceptLocationSuggestion);
  elements.locationNoBtn.addEventListener('click', dismissLocationSuggestion);

  // Update banner - handle touch to prevent double-firing on iOS
  let updateBtnHandled = false;
  elements.updateBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (updateBtnHandled) return;
    updateBtnHandled = true;
    setTimeout(() => { updateBtnHandled = false; }, 300);
    applyUpdate();
  }, { passive: false });
  elements.updateBtn.addEventListener('click', (e) => {
    if (updateBtnHandled) {
      e.preventDefault();
      return;
    }
    applyUpdate();
  });

  // Lock toggle
  elements.lockToggleBtn.addEventListener('click', togglePriceLock);
  elements.clearPricesBtn.addEventListener('click', clearPrices);

  // Surcharge controls
  elements.surchargeToggleBtn.addEventListener('click', toggleSurchargeRow);
  elements.surchargePresets.addEventListener('click', (e) => {
    const btn = e.target.closest('.surcharge-preset');
    if (!btn) return;
    selectSurchargePreset(btn.dataset.value);
  });
  elements.surchargeInput.addEventListener('input', (e) => {
    state.surchargeAmount = parseFloat(e.target.value) || 0;
    calculatePrices();
  });
  elements.surchargeMinus.addEventListener('click', () => adjustSurcharge(-1));
  elements.surchargePlus.addEventListener('click', () => adjustSurcharge(1));
  elements.surchargePercent.addEventListener('click', () => setSurchargeType('percent'));
  elements.surchargeFixed.addEventListener('click', () => setSurchargeType('fixed'));

  // Safety tabs
  elements.countryTab.addEventListener('click', () => switchSafetyTab('country'));
  elements.tipsTab.addEventListener('click', () => switchSafetyTab('tips'));
}

function switchSafetyTab(tab) {
  if (tab === 'country') {
    elements.countryTab.classList.add('active');
    elements.tipsTab.classList.remove('active');
    elements.countryTabContent.classList.add('active');
    elements.tipsTabContent.classList.remove('active');
  } else {
    elements.tipsTab.classList.add('active');
    elements.countryTab.classList.remove('active');
    elements.tipsTabContent.classList.add('active');
    elements.countryTabContent.classList.remove('active');
  }
}

// =============================================
// PRICE CALCULATION
// =============================================

function adjustHomeAmount(direction) {
  const now = Date.now();
  if (isSyncing || (now - lastSyncTime) < SYNC_DEBOUNCE_MS) return;
  lastSyncTime = now;
  isSyncing = true;

  try {
    const currentAmount = state.homeAmount;
    const step = getCurrencyStep(state.homeCurrency, currentAmount);

    let newAmount = currentAmount + (direction * step);
    if (newAmount < 0) newAmount = 0;

    // Round to the nearest step for clean numbers
    newAmount = Math.round(newAmount / step) * step;

    state.homeAmount = newAmount;
    elements.homeAmountInput.value = formatAmountDisplay(newAmount, state.homeCurrency);
    autoSizeInput(elements.homeAmountInput);

    // Sync if locked
    if (state.pricesLocked) {
      const { localCurrency, altCurrency, homeCurrency, rates } = state;
      if (rates[localCurrency] && rates[altCurrency] && rates[homeCurrency]) {
        const homeInUsd = newAmount / rates[homeCurrency];

        let localAmount = homeInUsd * rates[localCurrency];
        const localDecimals = getCurrencyDecimals(localCurrency);
        state.localAmount = localDecimals === 0 ? Math.round(localAmount) : Math.round(localAmount * 100) / 100;
        elements.localAmountInput.value = formatAmountDisplay(state.localAmount, localCurrency);

        let altAmount = homeInUsd * rates[altCurrency];
        const altDecimals = getCurrencyDecimals(altCurrency);
        state.altAmount = altDecimals === 0 ? Math.round(altAmount) : Math.round(altAmount * 100) / 100;
        elements.altAmountInput.value = formatAmountDisplay(state.altAmount, altCurrency);

        autoSizeAllInputs();
      }
    }
    calculatePrices();
    saveState();
  } finally {
    isSyncing = false;
  }
}

function calculateHomeConversions() {
  // Note: isSyncing is managed by callers (home input handler)
  // Only sync if prices are locked
  if (!state.pricesLocked) {
    saveState();
    return;
  }

  syncLockedPrices('home');
  calculatePrices();
  saveState();
}

function adjustPrice(target, direction) {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const currency = target === 'local' ? state.localCurrency : state.altCurrency;
    const currentAmount = target === 'local' ? state.localAmount : state.altAmount;
    const step = getCurrencyStep(currency, currentAmount);

    let newAmount = currentAmount + (direction * step);
    if (newAmount < 0) newAmount = 0;

    // Round to the nearest step for clean numbers
    newAmount = Math.round(newAmount / step) * step;

    if (target === 'local') {
      state.localAmount = newAmount;
      elements.localAmountInput.value = formatAmountDisplay(newAmount, currency);
      autoSizeInput(elements.localAmountInput);
    } else {
      state.altAmount = newAmount;
      elements.altAmountInput.value = formatAmountDisplay(newAmount, currency);
      autoSizeInput(elements.altAmountInput);
    }

    if (state.pricesLocked) {
      syncLockedPrices(target);
    }
    calculatePrices();
    saveState();
  } catch (err) {
    console.error('adjustPrice error:', err);
  } finally {
    isSyncing = false;
  }
}

function togglePriceLock() {
  state.pricesLocked = !state.pricesLocked;
  updateLockUI();

  const lockedIcon = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>';
  const unlockedIcon = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 019.9-1"/>';

  if (state.pricesLocked) {
    // Sync alt to local when locking
    isSyncing = true;
    try {
      syncLockedPrices('local');
      calculatePrices();
    } finally {
      isSyncing = false;
    }
    showToast('Prices linked at exchange rate', 3000, lockedIcon);
  } else {
    showToast('Prices unlinked', 3000, unlockedIcon);
  }
}

function clearPrices() {
  // Reset all amounts to 0
  state.localAmount = 0;
  state.altAmount = 0;
  state.homeAmount = 0;
  state.surchargeAmount = 0;

  // Update inputs
  elements.localAmountInput.value = '';
  elements.altAmountInput.value = '';
  elements.homeAmountInput.value = '';

  // Reset surcharge UI
  document.querySelectorAll('.surcharge-preset').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === '0');
  });
  elements.surchargeInput.value = '0';

  // Update display
  render();
  autoSizeAllInputs();
}

function updateLockUI() {
  if (state.pricesLocked) {
    elements.lockToggleBtn.classList.add('locked');
    elements.lockText.textContent = 'Linked Prices';
    // Show locked icon
    elements.lockIcon.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>';
  } else {
    elements.lockToggleBtn.classList.remove('locked');
    elements.lockText.textContent = 'Link prices';
    // Show unlocked icon
    elements.lockIcon.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 019.9-1"/>';
  }
}

function syncLockedPrices(source) {
  // Note: isSyncing is managed by callers (adjustPrice, togglePriceLock, etc.)
  // This function should not check/set isSyncing itself to avoid conflicts

  const { localCurrency, altCurrency, homeCurrency, rates } = state;

  if (!rates[localCurrency] || !rates[altCurrency] || !rates[homeCurrency]) return;

  // Exchange rates via USD
  const localToUsd = 1 / rates[localCurrency];
  const usdToAlt = rates[altCurrency];
  const usdToHome = rates[homeCurrency];
  const localToAlt = localToUsd * usdToAlt;

  // Get decimal settings for each currency
  const localDecimals = getCurrencyDecimals(localCurrency);
  const altDecimals = getCurrencyDecimals(altCurrency);
  const homeDecimals = getCurrencyDecimals(homeCurrency);

  if (source === 'local') {
    // Calculate alt from local
    let altAmount = state.localAmount * localToAlt;
    state.altAmount = altDecimals === 0 ? Math.round(altAmount) : Math.round(altAmount * 100) / 100;
    elements.altAmountInput.value = formatAmountDisplay(state.altAmount, altCurrency);

    // Calculate home from local
    let homeAmount = state.localAmount * localToUsd * usdToHome;
    state.homeAmount = homeDecimals === 0 ? Math.round(homeAmount) : Math.round(homeAmount * 100) / 100;
    elements.homeAmountInput.value = formatAmountDisplay(state.homeAmount, homeCurrency);
  } else if (source === 'alt') {
    // Calculate local from alt
    let localAmount = state.altAmount / localToAlt;
    state.localAmount = localDecimals === 0 ? Math.round(localAmount) : Math.round(localAmount * 100) / 100;
    elements.localAmountInput.value = formatAmountDisplay(state.localAmount, localCurrency);

    // Calculate home from alt
    let homeAmount = state.altAmount / usdToAlt * usdToHome;
    state.homeAmount = homeDecimals === 0 ? Math.round(homeAmount) : Math.round(homeAmount * 100) / 100;
    elements.homeAmountInput.value = formatAmountDisplay(state.homeAmount, homeCurrency);
  } else if (source === 'home') {
    // Calculate local and alt from home
    const homeInUsd = state.homeAmount / usdToHome;

    let localAmount = homeInUsd * rates[localCurrency];
    state.localAmount = localDecimals === 0 ? Math.round(localAmount) : Math.round(localAmount * 100) / 100;
    elements.localAmountInput.value = formatAmountDisplay(state.localAmount, localCurrency);

    let altAmount = homeInUsd * usdToAlt;
    state.altAmount = altDecimals === 0 ? Math.round(altAmount) : Math.round(altAmount * 100) / 100;
    elements.altAmountInput.value = formatAmountDisplay(state.altAmount, altCurrency);
  }

  // Auto-size all inputs after syncing
  autoSizeAllInputs();
}

function toggleSurchargeRow() {
  elements.surchargeRow.classList.toggle('hidden');
  if (elements.surchargeRow.classList.contains('hidden')) {
    state.surchargeAmount = 0;
    elements.surchargeInput.value = 0;
    // Reset to 0% preset
    updateSurchargePresetUI('0');
    elements.surchargeCustom.classList.add('hidden');
    calculatePrices();
  }
}

function selectSurchargePreset(value) {
  // Update UI
  updateSurchargePresetUI(value);

  if (value === 'custom') {
    // Show custom input
    elements.surchargeCustom.classList.remove('hidden');
    elements.surchargeInput.focus();
  } else {
    // Hide custom input and set the preset value
    elements.surchargeCustom.classList.add('hidden');
    state.surchargeAmount = parseFloat(value);
    state.surchargeType = 'percent';
    elements.surchargeInput.value = value;
    calculatePrices();
  }
}

function updateSurchargePresetUI(activeValue) {
  elements.surchargePresets.querySelectorAll('.surcharge-preset').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === activeValue);
  });
}

function setSurchargeType(type) {
  state.surchargeType = type;
  elements.surchargePercent.classList.toggle('active', type === 'percent');
  elements.surchargeFixed.classList.toggle('active', type === 'fixed');
  calculatePrices();
}

function adjustSurcharge(direction) {
  let step = state.surchargeType === 'percent' ? 0.5 : 1;
  let newAmount = state.surchargeAmount + (direction * step);
  if (newAmount < 0) newAmount = 0;
  state.surchargeAmount = newAmount;
  elements.surchargeInput.value = newAmount;
  calculatePrices();
}

function calculatePrices() {
  const { localAmount, altAmount, localCurrency, altCurrency, homeCurrency, rates, currencies, surchargeAmount, surchargeType } = state;

  if (!rates[localCurrency] || !rates[altCurrency] || !rates[homeCurrency]) {
    return;
  }

  // Calculate local with surcharge applied
  let localWithSurcharge = localAmount;
  if (surchargeAmount > 0) {
    if (surchargeType === 'percent') {
      localWithSurcharge = localAmount * (1 + surchargeAmount / 100);
    } else {
      // Fixed surcharge in home currency - convert to local currency
      const surchargeInUsd = surchargeAmount / rates[homeCurrency];
      const surchargeInLocal = surchargeInUsd * rates[localCurrency];
      localWithSurcharge = localAmount + surchargeInLocal;
    }
  }

  // Convert local price to home currency
  const localInUsd = localWithSurcharge / rates[localCurrency];
  const localInHome = localInUsd * rates[homeCurrency];

  // Calculate alt with surcharge applied
  let altWithSurcharge = altAmount;
  if (surchargeAmount > 0) {
    if (surchargeType === 'percent') {
      altWithSurcharge = altAmount * (1 + surchargeAmount / 100);
    } else {
      // Fixed surcharge in home currency - convert to alt currency
      const surchargeInUsd = surchargeAmount / rates[homeCurrency];
      const surchargeInAlt = surchargeInUsd * rates[altCurrency];
      altWithSurcharge = altAmount + surchargeInAlt;
    }
  }

  // Convert alt price to home currency
  const altInUsd = altWithSurcharge / rates[altCurrency];
  const altInHome = altInUsd * rates[homeCurrency];

  // Get currency info
  const homeInfo = currencies[homeCurrency];
  const localInfo = currencies[localCurrency];
  const altInfo = currencies[altCurrency];
  const homeSymbol = homeInfo?.symbol || '';
  const localSymbol = localInfo?.symbol || '';
  const altSymbol = altInfo?.symbol || '';

  // Update displays
  elements.localHomeAmount.textContent = `${homeSymbol}${formatNumber(localInHome, homeCurrency)}`;
  elements.altHomeAmount.textContent = `${homeSymbol}${formatNumber(altInHome, homeCurrency)}`;

  // Show surcharge indication if applicable (on all three cards)
  if (surchargeAmount > 0) {
    // Calculate fee amounts in all currencies
    let feeInLocal, feeInAlt, feeInHome;

    if (surchargeType === 'percent') {
      feeInLocal = localAmount * (surchargeAmount / 100);
      feeInAlt = altAmount * (surchargeAmount / 100);
      feeInHome = (localAmount / rates[localCurrency] * rates[homeCurrency]) * (surchargeAmount / 100);
    } else {
      // Fixed fee is in home currency
      feeInHome = surchargeAmount;
      const feeInUsd = surchargeAmount / rates[homeCurrency];
      feeInLocal = feeInUsd * rates[localCurrency];
      feeInAlt = feeInUsd * rates[altCurrency];
    }

    // Calculate totals
    const totalLocal = localAmount + feeInLocal;
    const totalAlt = altAmount + feeInAlt;
    const totalHome = (localAmount / rates[localCurrency] * rates[homeCurrency]) + feeInHome;

    // Calculate home currency equivalents for local and alt totals
    const totalLocalInHome = totalLocal / rates[localCurrency] * rates[homeCurrency];
    const totalAltInHome = totalAlt / rates[altCurrency] * rates[homeCurrency];

    // Format fee label prefix
    const feePrefix = surchargeType === 'percent' ? `+${surchargeAmount}%` : `+${homeSymbol}${surchargeAmount}`;

    // Create labels for each card with its relevant currency (local/alt include home equivalent)
    const localLabel = `${feePrefix} fee: ${localSymbol}${formatNumber(feeInLocal, localCurrency)}<br>Total: ${localSymbol}${formatNumber(totalLocal, localCurrency)} (${homeSymbol}${formatNumber(totalLocalInHome, homeCurrency)})`;
    const altLabel = `${feePrefix} fee: ${altSymbol}${formatNumber(feeInAlt, altCurrency)}<br>Total: ${altSymbol}${formatNumber(totalAlt, altCurrency)} (${homeSymbol}${formatNumber(totalAltInHome, homeCurrency)})`;
    const homeLabel = `${feePrefix} fee: ${homeSymbol}${formatNumber(feeInHome, homeCurrency)}<br>Total: ${homeSymbol}${formatNumber(totalHome, homeCurrency)}`;

    // Update each indicator with its specific label
    const updateIndicator = (indicator, label) => {
      if (!indicator) return;
      const oldLabel = indicator.innerHTML;
      indicator.classList.remove('animate-out');
      indicator.innerHTML = label;
      if (oldLabel !== label) {
        indicator.classList.remove('animate');
        void indicator.offsetWidth;
        indicator.classList.add('animate');
      }
    };

    updateIndicator(elements.localSurchargeIndicator, localLabel);
    updateIndicator(elements.altSurchargeIndicator, altLabel);
    updateIndicator(elements.homeSurchargeIndicator, homeLabel);
  } else {
    // Animate out if there was a previous surcharge
    [elements.localSurchargeIndicator, elements.altSurchargeIndicator, elements.homeSurchargeIndicator].forEach(indicator => {
      if (!indicator) return;
      if (indicator.textContent) {
        indicator.classList.remove('animate');
        indicator.classList.add('animate-out');
        setTimeout(() => {
          indicator.textContent = '';
          indicator.classList.remove('animate-out');
        }, 400);
      }
    });
  }

  // Update deal indicator - only show when country accepts multiple currencies and prices not linked
  const countryInfo = state.destinationCountry ? state.countries[state.destinationCountry] : null;
  const hasAltCurrency = countryInfo?.alsoAccepted && countryInfo.alsoAccepted.length > 0;

  // Hide deal indicator when prices are linked (comparison is meaningless when values are locked together)
  if (state.pricesLocked) {
    elements.dealIndicator.style.display = 'none';
  } else if (hasAltCurrency || !state.destinationCountry) {
    // Show comparison between local and alt
    elements.dealIndicator.style.display = '';
    const diff = Math.abs(localInHome - altInHome);
    const diffFormatted = `${homeSymbol}${formatNumber(diff, homeCurrency)}`;

    if (localInHome < altInHome && localAmount > 0 && altAmount > 0) {
      elements.dealIndicator.className = 'deal-indicator';
      elements.dealText.textContent = `Local price saves ${diffFormatted}`;
    } else if (altInHome < localInHome && localAmount > 0 && altAmount > 0) {
      elements.dealIndicator.className = 'deal-indicator alt-better';
      elements.dealText.textContent = `${altCurrency} price saves ${diffFormatted}`;
    } else {
      elements.dealIndicator.className = 'deal-indicator same';
      elements.dealText.textContent = localAmount > 0 || altAmount > 0 ? 'Same price' : 'Enter prices to compare';
    }
  } else {
    // No alt currency - hide the deal indicator entirely
    elements.dealIndicator.style.display = 'none';
  }

  saveState();
}

// Get short currency name - abbreviate country names for common currencies
function getShortCurrencyName(name) {
  if (!name) return '';

  // Country name abbreviations
  const countryAbbrevs = {
    'New Zealand': 'NZ',
    'United States': 'US',
    'United Kingdom': 'UK',
    'South African': 'SA',
    'Hong Kong': 'HK',
    'Australian': 'AU',
    'Canadian': 'CA',
    'Singapore': 'SG',
    'Saudi': 'Saudi',
    'United Arab Emirates': 'UAE'
  };

  // Apply abbreviations
  let shortName = name;
  for (const [full, abbrev] of Object.entries(countryAbbrevs)) {
    if (name.includes(full)) {
      shortName = name.replace(full, abbrev);
      break;
    }
  }

  // For ambiguous currencies (Dollar, Krone, etc.) keep the abbreviated country prefix
  const keepFull = ['Dollar', 'Krone', 'Krona', 'Franc', 'Rupee', 'Dinar', 'Rand', 'Peso'];
  const lastWord = shortName.split(' ').pop();

  if (keepFull.includes(lastWord)) {
    return shortName; // Keep "NZ Dollar", "US Dollar", etc.
  }

  // For unique names, use just the currency type
  // "British Pound" -> "Pound", "Japanese Yen" -> "Yen", "Euro" -> "Euro"
  return lastWord;
}

function formatNumber(num, currency) {
  if (isNaN(num)) return '--';
  let decimals = 2;
  const noDecimalCurrencies = ['JPY', 'KRW', 'VND', 'IDR', 'CLP', 'HUF'];
  if (noDecimalCurrencies.includes(currency)) decimals = 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// =============================================
// DESTINATION MODAL
// =============================================

function openDestinationModal(context) {
  currentModalContext = context;
  elements.destinationModal.classList.add('active');
  elements.destinationSearch.value = '';
  renderDestinationList();
  setTimeout(() => elements.destinationSearch.focus(), 100);
}

function closeDestinationModal() {
  elements.destinationModal.classList.remove('active');
  currentModalContext = null;
}

function renderDestinationList(filter = '') {
  const filterLower = filter.toLowerCase();
  const entries = Object.entries(state.countries);
  const filtered = entries.filter(([country]) => !filter || country.toLowerCase().includes(filterLower));
  filtered.sort((a, b) => a[0].localeCompare(b[0]));

  renderWalletSection(filter);

  elements.destinationList.innerHTML = filtered.map(([country, data]) => {
    const flagHtml = data.code
      ? `<span class="fi fi-${data.code.toLowerCase()} fi-lg"></span>`
      : '';
    const inWallet = state.walletCountries.includes(country);
    return `
      <div class="destination-item" data-country="${country}">
        <span class="flag">${flagHtml}</span>
        <span class="name">${country}</span>
        <button class="add-wallet ${inWallet ? 'in-wallet' : ''}" data-country="${country}">
          <svg viewBox="0 0 24 24" fill="${inWallet ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');

  elements.destinationList.querySelectorAll('.destination-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.add-wallet')) return;
      selectDestination(item.dataset.country);
    });
  });

  elements.destinationList.querySelectorAll('.add-wallet').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleWallet(btn.dataset.country);
    });
  });
}

function renderWalletSection(filter = '') {
  const walletFiltered = state.walletCountries.filter(country =>
    !filter || country.toLowerCase().includes(filter.toLowerCase())
  );

  if (walletFiltered.length === 0) {
    elements.walletSection.style.display = 'none';
    return;
  }

  elements.walletSection.style.display = 'block';
  elements.walletList.innerHTML = walletFiltered.map(country => {
    const data = state.countries[country];
    if (!data) return '';
    const flagHtml = data.code
      ? `<span class="fi fi-${data.code.toLowerCase()} fi-lg"></span>`
      : '';
    return `
      <div class="wallet-item" data-country="${country}">
        <span class="flag">${flagHtml}</span>
        <span class="name">${country}</span>
        <button class="remove-wallet" data-country="${country}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');

  elements.walletList.querySelectorAll('.wallet-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.remove-wallet')) return;
      selectDestination(item.dataset.country);
    });
  });

  elements.walletList.querySelectorAll('.remove-wallet').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromWallet(btn.dataset.country);
    });
  });
}

function toggleWallet(country) {
  if (state.walletCountries.includes(country)) {
    removeFromWallet(country);
  } else {
    addToWallet(country);
  }
}

function addToWallet(country) {
  if (!state.walletCountries.includes(country)) {
    state.walletCountries.push(country);
    saveState();
    renderDestinationList(elements.destinationSearch.value);
    showToast(`${country} added to favourites`);
  }
}

function removeFromWallet(country) {
  state.walletCountries = state.walletCountries.filter(c => c !== country);
  saveState();
  renderDestinationList(elements.destinationSearch.value);
  showToast(`${country} removed from favourites`);
}

function filterDestinations(e) {
  renderDestinationList(e.target.value);
}

function selectDestination(country) {
  state.destinationCountry = country;
  const countryData = state.countries[country];

  if (countryData) {
    state.localCurrency = countryData.currency;

    // Set alt currency (usually USD if not already local)
    if (countryData.alsoAccepted && countryData.alsoAccepted.length > 0) {
      state.altCurrency = countryData.alsoAccepted[0];
    } else if (countryData.currency !== 'USD') {
      state.altCurrency = 'USD';
    } else {
      state.altCurrency = 'EUR';
    }

    // Set local amount to ~$10 USD equivalent, rounded up to whole number
    const localRate = state.rates[state.localCurrency];
    if (localRate) {
      state.localAmount = Math.ceil(10 * localRate);

      // Sync alt amount (also ~$10 USD equivalent)
      const altRate = state.rates[state.altCurrency];
      if (altRate) {
        state.altAmount = Math.ceil(10 * altRate);
      }

      // Sync home amount
      const homeRate = state.rates[state.homeCurrency];
      if (homeRate) {
        state.homeAmount = 10 * homeRate;
      }

      // Reset surcharge when changing country
      state.surchargeAmount = 0;
    }
  }

  saveState();
  closeDestinationModal();

  // Update destination header immediately (before animation starts)
  if (state.destinationCountry) {
    setCountryFlag(elements.destHeaderFlag, state.destinationCountry, 'lg');
    elements.destHeaderName.textContent = state.destinationCountry;
  }

  if (currentModalContext === 'setup') {
    updateSetupDisplay();
  } else {
    // Trigger click-clack flip animation on currency cards
    // Note: animatePriceCards() calls render() at the end of animation
    animatePriceCards();
  }
}

// Click-clack / split-flap train station sign animation
// Cascading effect: each card starts after the previous one
function animatePriceCards() {
  const flipCount = 10; // Number of random flips per card
  const flipDuration = 70; // ms per flip
  const cardStagger = 280; // ms delay between each card starting

  // Check if the final destination should show an alt card
  const countryInfo = state.destinationCountry ? state.countries[state.destinationCountry] : null;
  const shouldShowAlt = countryInfo?.alsoAccepted && countryInfo.alsoAccepted.length > 0;

  // Hide alt card immediately if destination doesn't use it
  if (!shouldShowAlt) {
    elements.altPriceCard.classList.add('card-hidden');
  } else {
    elements.altPriceCard.classList.remove('card-hidden');
  }

  // Get random countries to cycle through
  const countryNames = Object.keys(state.countries);
  if (countryNames.length < 2) {
    render();
    return;
  }

  const getRandomCountry = () => {
    const idx = Math.floor(Math.random() * countryNames.length);
    return countryNames[idx];
  };

  const triggerFlip = (card) => {
    if (!card) return;
    card.classList.remove('flip-animation');
    void card.offsetWidth;
    card.classList.add('flip-animation');
  };

  const updateCardDisplay = (currency, isLocal) => {
    const info = state.currencies[currency];
    const rate = state.rates[currency] || 1;
    const amount = Math.ceil(10 * rate);

    if (isLocal) {
      setFlagElement(elements.localFlag, currency, 'lg');
      elements.localCurrency.textContent = `${info?.symbol || ''} ${currency}`;
      elements.localCurrencyName.textContent = getShortCurrencyName(info?.name);
      elements.localAmountInput.value = formatAmountDisplay(amount, currency);
    } else {
      setFlagElement(elements.altFlag, currency, 'lg');
      elements.altCurrency.textContent = `${info?.symbol || ''} ${currency}`;
      elements.altCurrencyName.textContent = getShortCurrencyName(info?.name);
      elements.altAmountInput.value = formatAmountDisplay(amount, currency);
    }
  };

  const updateHomeCardDisplay = (currency) => {
    const info = state.currencies[currency];
    setFlagElement(elements.homeCardFlag, currency, 'lg');
    elements.homeCardCurrency.textContent = `${info?.symbol || ''} ${currency}`;
    elements.homeCurrencyName.textContent = getShortCurrencyName(info?.name);
  };

  // Animate a single card through random values, landing on finalCurrency
  const animateCard = (card, updateFn, startDelay, finalCurrency, isFinal) => {
    // Show random currencies for all but the last flip
    for (let i = 0; i < flipCount - 1; i++) {
      setTimeout(() => {
        const randomCountry = getRandomCountry();
        const countryData = state.countries[randomCountry];
        if (countryData) {
          updateFn(countryData.currency);
          triggerFlip(card);
        }
      }, startDelay + (i * flipDuration));
    }

    // Final flip lands on the correct currency (no flash)
    setTimeout(() => {
      updateFn(finalCurrency);
      triggerFlip(card);
      if (isFinal) {
        // Small delay then render to sync all values
        setTimeout(() => render(), 50);
      }
    }, startDelay + ((flipCount - 1) * flipDuration));
  };

  // Calculate stagger delays
  const localDelay = 0;
  const altDelay = cardStagger;
  const homeDelay = shouldShowAlt ? cardStagger * 2 : cardStagger;

  // Get final currencies
  const finalLocalCurrency = state.localCurrency;
  const finalAltCurrency = countryInfo?.alsoAccepted?.[0] || 'USD';
  const finalHomeCurrency = state.homeCurrency;

  // Start cascading animation - local card first
  animateCard(
    elements.localPriceCard,
    (currency) => updateCardDisplay(currency, true),
    localDelay,
    finalLocalCurrency,
    false
  );

  // Alt card second (if visible)
  if (shouldShowAlt) {
    animateCard(
      elements.altPriceCard,
      (currency) => updateCardDisplay(currency, false),
      altDelay,
      finalAltCurrency,
      false
    );
  }

  // Home card last - this one triggers render() on final flip
  animateCard(
    elements.homeCurrencyCard,
    updateHomeCardDisplay,
    homeDelay,
    finalHomeCurrency,
    true
  );

  // Clean up animation classes after all animations complete
  const totalDuration = homeDelay + (flipCount * flipDuration) + 400;
  setTimeout(() => {
    [elements.localPriceCard, elements.altPriceCard, elements.homeCurrencyCard].forEach(card => {
      if (card) card.classList.remove('flip-animation');
    });
  }, totalDuration);
}

// =============================================
// CURRENCY MODAL
// =============================================

function openCurrencyModal(context) {
  currentModalContext = context;
  elements.currencyModal.classList.add('active');
  elements.currencySearch.value = '';
  renderCurrencyList();
  setTimeout(() => elements.currencySearch.focus(), 100);
}

function closeCurrencyModal() {
  elements.currencyModal.classList.remove('active');
  currentModalContext = null;
}

function renderCurrencyList(filter = '') {
  const filterLower = filter.toLowerCase();
  const entries = Object.entries(state.currencies);
  const filtered = entries.filter(([code, currency]) =>
    !filter || code.toLowerCase().includes(filterLower) || currency.name.toLowerCase().includes(filterLower)
  );

  const commonCurrencies = ['GBP', 'USD', 'EUR', 'AUD', 'CAD', 'NZD'];
  filtered.sort((a, b) => {
    const aCommon = commonCurrencies.indexOf(a[0]);
    const bCommon = commonCurrencies.indexOf(b[0]);
    if (aCommon !== -1 && bCommon !== -1) return aCommon - bCommon;
    if (aCommon !== -1) return -1;
    if (bCommon !== -1) return 1;
    return a[1].name.localeCompare(b[1].name);
  });

  elements.currencyList.innerHTML = filtered.map(([code, currency]) => {
    const flagHtml = currency.code
      ? `<span class="fi fi-${currency.code} fi-lg"></span>`
      : '';
    return `
      <div class="currency-item" data-code="${code}">
        <span class="flag">${flagHtml}</span>
        <span class="code">${code}</span>
        <span class="name">${currency.name}</span>
      </div>
    `;
  }).join('');

  elements.currencyList.querySelectorAll('.currency-item').forEach(item => {
    item.addEventListener('click', () => selectCurrency(item.dataset.code));
  });
}

function filterCurrencies(e) {
  renderCurrencyList(e.target.value);
}

function selectCurrency(code) {
  if (currentModalContext === 'home' || currentModalContext === 'setupHome') {
    state.homeCurrency = code;
  }
  saveState();
  closeCurrencyModal();

  if (currentModalContext === 'setupHome') {
    updateSetupDisplay();
  } else {
    render();
  }
}

// =============================================
// SETTINGS MODAL
// =============================================

function openSettingsModal() {
  elements.settingsModal.classList.add('active');
  updateSettingsDisplay();
}

function closeSettingsModal() {
  elements.settingsModal.classList.remove('active');
}

function updateSettingsDisplay() {
  // Populate user name
  if (elements.userNameInput) {
    elements.userNameInput.value = state.userName || '';
  }

  const home = state.currencies[state.homeCurrency];
  if (home) {
    setFlagElement(elements.homeSettingFlag, state.homeCurrency, 'lg');
    elements.homeSettingCode.textContent = state.homeCurrency;
    elements.homeSettingName.textContent = home.name;
  }

  elements.settingsLastUpdated.textContent = formatLastUpdated();
}

// =============================================
// QR CODE SHARING
// =============================================

function openQrModal() {
  closeSettingsModal();
  elements.qrModal.classList.add('active');
  generateQrCode();
}

function closeQrModal() {
  elements.qrModal.classList.remove('active');
}

function generateQrCode() {
  // Use the canonical URL for sharing
  const url = 'https://holibobs.app/';

  if (elements.qrUrl) {
    elements.qrUrl.textContent = url;
  }

  // Generate QR code as SVG
  if (typeof QRCode !== 'undefined' && elements.qrContainer) {
    // Clear previous QR code
    elements.qrContainer.innerHTML = '';

    QRCode.toString(url, {
      type: 'svg',
      width: 200,
      margin: 2,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff'
      }
    }, function(error, svgString) {
      if (error) {
        console.error('QR code generation error:', error);
        elements.qrContainer.innerHTML = '<p style="color: var(--text-secondary);">Could not generate QR code</p>';
        return;
      }
      elements.qrContainer.innerHTML = svgString;
    });
  } else {
    console.log('QRCode library not available or container not found');
    if (elements.qrContainer) {
      // Fallback: use an image-based QR code service
      elements.qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" alt="QR Code" style="width: 200px; height: 200px;">`;
    }
  }
}

function copyShareUrl() {
  const url = 'https://holibobs.app/';
  navigator.clipboard.writeText(url).then(() => {
    showToast('Link copied to clipboard!');
  }).catch(() => {
    showToast('Could not copy link');
  });
}

// =============================================
// SCAMS/SAFETY
// =============================================

function renderScams() {
  // Render general safety tips
  if (state.scams.general) {
    elements.generalScams.innerHTML = state.scams.general.map(scam => `
      <div class="scam-card ${scam.severity}">
        <div class="scam-header">
          <span class="scam-icon">${scam.icon}</span>
          <span class="scam-title">${scam.name}</span>
          <span class="scam-severity">${scam.severity}</span>
        </div>
        <p class="scam-description">${scam.description}</p>
      </div>
    `).join('');
  }

  // Render country-specific safety info
  if (state.destinationCountry && state.scams.countries) {
    const countryScams = state.scams.countries[state.destinationCountry];
    if (countryScams) {
      // Show country tab for countries with specific info
      elements.countryTab.style.display = '';

      // Update tab with country flag and name
      elements.countryTabFlag.textContent = countryScams.flag || '🌍';
      elements.countryTabText.textContent = `${state.destinationCountry} Safety`;

      // Hide "no country" message, show content
      elements.noCountryMessage.style.display = 'none';

      if (countryScams.tips) {
        elements.countryTips.style.display = 'block';
        elements.countryTips.innerHTML = `<ul>${countryScams.tips.map(tip => `<li>${tip}</li>`).join('')}</ul>`;
      } else {
        elements.countryTips.style.display = 'none';
      }

      if (countryScams.scams && countryScams.scams.length > 0) {
        elements.countryScams.innerHTML = countryScams.scams.map(scam => `
          <div class="scam-card ${scam.severity}">
            <div class="scam-header">
              <span class="scam-icon">${scam.icon}</span>
              <span class="scam-title">${scam.name}</span>
              <span class="scam-severity">${scam.severity}</span>
            </div>
            <p class="scam-description">${scam.description}</p>
          </div>
        `).join('');
      } else {
        elements.countryScams.innerHTML = '';
      }

      // Switch to country tab when country-specific info is available
      switchSafetyTab('country');
    } else {
      // Country selected but no specific safety info - hide country tab, show general tips
      hideCountryTabShowGeneral();
    }
  } else {
    // No country selected - hide country tab, show general tips
    hideCountryTabShowGeneral();
  }
}

// Hide country tab and switch to general tips
function hideCountryTabShowGeneral() {
  elements.countryTab.style.display = 'none';
  elements.countryTabContent.classList.remove('active');
  elements.tipsTab.classList.add('active');
  elements.tipsTabContent.classList.add('active');
  elements.countryTips.style.display = 'none';
  elements.countryScams.innerHTML = '';
  elements.noCountryMessage.style.display = 'none';
}

function renderPaymentInfo() {
  const countryInfo = state.destinationCountry ? state.countries[state.destinationCountry] : null;

  if (!countryInfo?.payments) {
    elements.paymentInfo.style.display = 'none';
    return;
  }

  const payments = countryInfo.payments;
  elements.paymentInfo.style.display = 'block';

  elements.cashStatus.textContent = capitalize(payments.cash || 'common');
  elements.cashStatus.className = `payment-status ${payments.cash || 'common'}`;

  elements.cardsStatus.textContent = capitalize(payments.cards || 'common');
  elements.cardsStatus.className = `payment-status ${payments.cards || 'common'}`;

  elements.contactlessStatus.textContent = capitalize(payments.contactless || 'limited');
  elements.contactlessStatus.className = `payment-status ${payments.contactless || 'limited'}`;

  if (payments.tip) {
    elements.paymentTip.style.display = 'block';
    elements.paymentTipText.textContent = payments.tip;
  } else {
    elements.paymentTip.style.display = 'none';
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// =============================================
// EXCHANGE RATES
// =============================================

async function updateExchangeRates() {
  const indicator = document.querySelector('.status-indicator');
  indicator.classList.add('updating');
  indicator.classList.remove('online', 'offline');

  try {
    showToast('Updating exchange rates...');
    const response = await fetch(EXCHANGE_API_URL);
    if (!response.ok) throw new Error('Failed to fetch rates');

    const data = await response.json();
    state.rates = data.rates;
    state.lastRateUpdate = new Date().toISOString();

    saveState();
    updateRateStatus();
    calculatePrices();

    showToast('Exchange rates updated!');
  } catch (error) {
    console.error('Error updating rates:', error);
    showToast('Could not update rates. Using cached data.');
    indicator.classList.add('offline');
  } finally {
    indicator.classList.remove('updating');
  }
}

function checkRateUpdates() {
  if (!state.lastRateUpdate) {
    updateExchangeRates();
    return;
  }

  const lastUpdate = new Date(state.lastRateUpdate);
  const now = new Date();
  if (now - lastUpdate > RATE_UPDATE_INTERVAL) {
    updateExchangeRates();
  }
}

function updateRateStatus() {
  elements.lastUpdated.textContent = formatLastUpdated();
  elements.settingsLastUpdated.textContent = formatLastUpdated();

  const indicator = document.querySelector('.status-indicator');
  indicator.classList.remove('updating');
  indicator.classList.toggle('online', navigator.onLine);
  indicator.classList.toggle('offline', !navigator.onLine);
}

function formatLastUpdated() {
  if (!state.lastRateUpdate) return 'Never';
  const date = new Date(state.lastRateUpdate);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return date.toLocaleDateString();
}

// =============================================
// ADD TO HOME SCREEN
// =============================================

function setupAddToHomeScreen() {
  if (window.matchMedia('(display-mode: standalone)').matches) return;

  const dismissed = localStorage.getItem('a2hsDismissed');
  if (dismissed) {
    const hoursSinceDismissed = (new Date() - new Date(dismissed)) / (1000 * 60 * 60);
    if (hoursSinceDismissed < 24) return;
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

  // Delay A2HS prompts by 30 seconds - don't annoy users immediately
  if (isIOS && isSafari && !navigator.standalone) {
    setTimeout(() => elements.iosA2hsModal.classList.add('active'), 30000);
  }
}

function showA2hsBanner() {
  if (!window.matchMedia('(display-mode: standalone)').matches) {
    // Delay by 30 seconds to not annoy users
    setTimeout(() => {
      elements.a2hsBanner.classList.add('active');
    }, 30000);
  }
}

async function installApp() {
  if (!deferredPrompt) {
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      elements.a2hsBanner.classList.remove('active');
      elements.iosA2hsModal.classList.add('active');
    }
    return;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') showToast('App installed!');
  deferredPrompt = null;
  elements.a2hsBanner.classList.remove('active');
}

function dismissA2hs() {
  elements.a2hsBanner.classList.remove('active');
  localStorage.setItem('a2hsDismissed', new Date().toISOString());
}

// =============================================
// THEME (DAY/NIGHT MODE)
// =============================================

function initTheme() {
  const savedTheme = localStorage.getItem('holibobsTheme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else {
    // Auto-set based on time of day (dark from 7pm to 7am)
    const hour = new Date().getHours();
    const isNightTime = hour >= 19 || hour < 7;
    document.documentElement.setAttribute('data-theme', isNightTime ? 'dark' : 'light');
  }
}

// Animate title: "Bob on Holiday" → "HoliBobs"
function animateTitle() {
  const title = elements.appTitle;
  if (!title) return;

  // Use requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(() => {
    // Start animation
    title.classList.add('animating');

    // After animation completes, switch to final state
    setTimeout(() => {
      title.classList.remove('animating');
      title.classList.add('animation-done');
    }, 1700); // 1.2s delay + 0.4s animation + buffer
  });
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const isDark = currentTheme === 'dark';
  const newTheme = isDark ? 'light' : 'dark';

  // Get button position for animation origin
  const btn = elements.themeToggleBtn;
  const rect = btn.getBoundingClientRect();
  const overlay = elements.themeTransition;

  // Set CSS variables for animation origin (center of button)
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;
  overlay.style.setProperty('--reveal-x', `${originX}px`);
  overlay.style.setProperty('--reveal-y', `${originY}px`);

  // Set the reveal color based on target theme
  const revealColor = newTheme === 'dark' ? '#0f1419' : '#fff9e6';
  overlay.style.setProperty('--reveal-color', revealColor);

  // Add animation classes
  btn.classList.add('animating');
  overlay.classList.remove('collapsing', 'to-dark', 'to-light');
  overlay.classList.add('transitioning', newTheme === 'dark' ? 'to-dark' : 'to-light');

  // Create stars for night mode, sunrise for day mode
  const isToLight = newTheme === 'light';

  if (newTheme === 'dark') {
    createStars();
    setTimeout(() => createShootingStar(), 500);
  } else {
    createSunrise();
  }

  // Apply the theme partway through the animation
  setTimeout(() => {
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('holibobsTheme', newTheme);
  }, 800);

  // Start collapse animation back to button
  setTimeout(() => {
    overlay.classList.add('collapsing');
  }, isToLight ? 2000 : 1500);

  // Clean up animation
  setTimeout(() => {
    overlay.classList.remove('transitioning', 'collapsing', 'to-dark', 'to-light');
    elements.starsContainer.innerHTML = '';
    btn.classList.remove('animating');
  }, isToLight ? 2800 : 2300);
}

function createStars() {
  const container = elements.starsContainer;
  container.innerHTML = '';

  // Create random stars
  for (let i = 0; i < 30; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.width = `${Math.random() * 3 + 1}px`;
    star.style.height = star.style.width;
    star.style.animationDelay = `${Math.random() * 1.5}s`;
    star.style.animationDuration = `${Math.random() * 1 + 1}s`;
    container.appendChild(star);
  }
}

function createShootingStar() {
  const container = elements.starsContainer;
  const shootingStar = document.createElement('div');
  shootingStar.className = 'shooting-star';
  shootingStar.style.left = `${Math.random() * 50 + 10}%`;
  shootingStar.style.top = `${Math.random() * 30 + 10}%`;
  container.appendChild(shootingStar);

  // Remove after animation
  setTimeout(() => shootingStar.remove(), 1000);
}

function createSunrise() {
  const container = elements.starsContainer;
  container.innerHTML = '';

  // Create sunrise container
  const sunriseContainer = document.createElement('div');
  sunriseContainer.className = 'sunrise-container';

  // Night sky background that transitions to day
  const sky = document.createElement('div');
  sky.className = 'sunrise-sky';
  sunriseContainer.appendChild(sky);

  // Stars container (will fade out)
  const starsLayer = document.createElement('div');
  starsLayer.className = 'sunrise-stars';

  // Create random stars for the night sky
  for (let i = 0; i < 25; i++) {
    const star = document.createElement('div');
    star.className = 'sunrise-star';
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 60}%`;
    star.style.width = `${Math.random() * 3 + 1}px`;
    star.style.height = star.style.width;
    star.style.animationDelay = `${Math.random() * 1}s`;
    starsLayer.appendChild(star);
  }
  sunriseContainer.appendChild(starsLayer);

  // Setting moon (goes down as sun rises)
  const moon = document.createElement('div');
  moon.className = 'sunrise-moon';
  moon.textContent = '🌙';
  sunriseContainer.appendChild(moon);

  // Horizon glow
  const horizon = document.createElement('div');
  horizon.className = 'sunrise-horizon';
  sunriseContainer.appendChild(horizon);

  // The rising sun
  const sun = document.createElement('div');
  sun.className = 'sunrise-sun';
  sunriseContainer.appendChild(sun);

  container.appendChild(sunriseContainer);
}

// =============================================
// GEOLOCATION & LOCATION SUGGESTION
// =============================================

// Country coordinates - multiple points per country for better tourist area matching
const COUNTRY_COORD_POINTS = {
  // Europe
  'Spain': [
    { lat: 40.4, lng: -3.7 },    // Madrid
    { lat: 41.4, lng: 2.2 },     // Barcelona
    { lat: 28.1, lng: -15.4 },   // Canary Islands
    { lat: 39.6, lng: 2.6 },     // Mallorca
    { lat: 36.7, lng: -4.4 },    // Malaga/Costa del Sol
  ],
  'France': [
    { lat: 48.9, lng: 2.3 },     // Paris
    { lat: 43.3, lng: 5.4 },     // Marseille
    { lat: 43.7, lng: 7.3 },     // Nice/Riviera
    { lat: 45.8, lng: 6.9 },     // Alps
  ],
  'Italy': [
    { lat: 41.9, lng: 12.5 },    // Rome
    { lat: 45.4, lng: 9.2 },     // Milan
    { lat: 45.4, lng: 12.3 },    // Venice
    { lat: 43.8, lng: 11.3 },    // Florence
    { lat: 40.9, lng: 14.3 },    // Naples/Amalfi
    { lat: 38.1, lng: 13.4 },    // Sicily
  ],
  'Germany': [{ lat: 52.5, lng: 13.4 }, { lat: 48.1, lng: 11.6 }], // Berlin, Munich
  'Portugal': [{ lat: 38.7, lng: -9.1 }, { lat: 37.0, lng: -8.0 }], // Lisbon, Algarve
  'Greece': [
    { lat: 37.9, lng: 23.7 },    // Athens
    { lat: 36.4, lng: 25.4 },    // Santorini
    { lat: 35.2, lng: 25.1 },    // Crete
    { lat: 39.6, lng: 19.9 },    // Corfu
  ],
  'Netherlands': [{ lat: 52.4, lng: 4.9 }], // Amsterdam
  'Belgium': [{ lat: 50.8, lng: 4.4 }], // Brussels
  'United Kingdom': [
    { lat: 51.5, lng: -0.1 },    // London
    { lat: 55.9, lng: -3.2 },    // Edinburgh
    { lat: 53.5, lng: -2.2 },    // Manchester
  ],
  'Ireland': [{ lat: 53.3, lng: -6.3 }], // Dublin
  'Switzerland': [{ lat: 46.9, lng: 7.4 }, { lat: 46.2, lng: 6.1 }], // Bern, Geneva
  'Austria': [{ lat: 48.2, lng: 16.4 }, { lat: 47.3, lng: 11.4 }], // Vienna, Innsbruck

  // Americas
  'Mexico': [
    { lat: 21.2, lng: -86.8 },   // Cancun/Riviera Maya
    { lat: 20.7, lng: -105.3 },  // Puerto Vallarta
    { lat: 22.9, lng: -109.9 },  // Los Cabos
    { lat: 19.4, lng: -99.1 },   // Mexico City
    { lat: 20.5, lng: -87.4 },   // Tulum/Playa del Carmen
  ],
  'United States': [
    { lat: 40.7, lng: -74.0 },   // New York
    { lat: 34.1, lng: -118.2 },  // Los Angeles
    { lat: 25.8, lng: -80.2 },   // Miami
    { lat: 36.2, lng: -115.1 },  // Las Vegas
    { lat: 37.8, lng: -122.4 },  // San Francisco
    { lat: 21.3, lng: -157.8 },  // Hawaii
    { lat: 28.5, lng: -81.4 },   // Orlando
  ],
  'Canada': [
    { lat: 43.7, lng: -79.4 },   // Toronto
    { lat: 49.3, lng: -123.1 },  // Vancouver
    { lat: 45.5, lng: -73.6 },   // Montreal
  ],
  'Brazil': [{ lat: -22.9, lng: -43.2 }, { lat: -23.5, lng: -46.6 }], // Rio, Sao Paulo
  'Argentina': [{ lat: -34.6, lng: -58.4 }], // Buenos Aires
  'Costa Rica': [{ lat: 9.9, lng: -84.1 }], // San Jose area

  // Caribbean
  'Cuba': [{ lat: 23.1, lng: -82.4 }], // Havana
  'Dominican Republic': [{ lat: 18.5, lng: -69.9 }, { lat: 18.8, lng: -70.7 }], // Santo Domingo, Punta Cana
  'Jamaica': [{ lat: 18.5, lng: -77.9 }], // Kingston/Montego Bay
  'Bahamas': [{ lat: 25.0, lng: -77.4 }], // Nassau

  // Asia
  'Thailand': [
    { lat: 13.8, lng: 100.5 },   // Bangkok
    { lat: 7.9, lng: 98.4 },     // Phuket
    { lat: 18.8, lng: 98.9 },    // Chiang Mai
    { lat: 9.1, lng: 99.8 },     // Koh Samui
  ],
  'Japan': [
    { lat: 35.7, lng: 139.7 },   // Tokyo
    { lat: 34.7, lng: 135.5 },   // Osaka
    { lat: 35.0, lng: 135.8 },   // Kyoto
  ],
  'Indonesia': [{ lat: -6.2, lng: 106.8 }], // Jakarta
  'Bali': [{ lat: -8.4, lng: 115.2 }], // Bali (separate entry)
  'Malaysia': [{ lat: 3.1, lng: 101.7 }, { lat: 5.3, lng: 100.3 }], // KL, Penang
  'Singapore': [{ lat: 1.3, lng: 103.8 }],
  'Vietnam': [{ lat: 10.8, lng: 106.6 }, { lat: 21.0, lng: 105.8 }], // Ho Chi Minh, Hanoi
  'Philippines': [{ lat: 14.6, lng: 121.0 }, { lat: 10.3, lng: 123.9 }], // Manila, Cebu
  'South Korea': [{ lat: 37.6, lng: 127.0 }], // Seoul
  'China': [{ lat: 31.2, lng: 121.5 }, { lat: 39.9, lng: 116.4 }], // Shanghai, Beijing
  'India': [{ lat: 28.6, lng: 77.2 }, { lat: 19.1, lng: 72.9 }], // Delhi, Mumbai
  'Hong Kong': [{ lat: 22.3, lng: 114.2 }],
  'Taiwan': [{ lat: 25.0, lng: 121.5 }], // Taipei

  // Middle East
  'UAE': [{ lat: 25.2, lng: 55.3 }, { lat: 24.5, lng: 54.4 }], // Dubai, Abu Dhabi
  'Turkey': [{ lat: 41.0, lng: 29.0 }, { lat: 36.9, lng: 30.7 }], // Istanbul, Antalya
  'Israel': [{ lat: 32.1, lng: 34.8 }, { lat: 31.8, lng: 35.2 }], // Tel Aviv, Jerusalem
  'Jordan': [{ lat: 31.9, lng: 35.9 }], // Amman
  'Egypt': [{ lat: 30.0, lng: 31.2 }, { lat: 27.2, lng: 33.8 }], // Cairo, Hurghada
  'Qatar': [{ lat: 25.3, lng: 51.5 }], // Doha
  'Saudi Arabia': [{ lat: 24.7, lng: 46.7 }], // Riyadh

  // Africa
  'South Africa': [{ lat: -33.9, lng: 18.4 }, { lat: -26.2, lng: 28.0 }], // Cape Town, Johannesburg
  'Morocco': [{ lat: 31.6, lng: -8.0 }, { lat: 33.6, lng: -7.6 }], // Marrakech, Casablanca
  'Kenya': [{ lat: -1.3, lng: 36.8 }], // Nairobi
  'Tanzania': [{ lat: -6.2, lng: 35.8 }],

  // Oceania
  'Australia': [
    { lat: -33.9, lng: 151.2 },  // Sydney
    { lat: -37.8, lng: 145.0 },  // Melbourne
    { lat: -27.5, lng: 153.0 },  // Brisbane/Gold Coast
    { lat: -16.9, lng: 145.8 },  // Cairns
    { lat: -31.9, lng: 115.9 },  // Perth
  ],
  'New Zealand': [{ lat: -36.8, lng: 174.8 }, { lat: -43.5, lng: 172.6 }], // Auckland, Christchurch
  'Fiji': [{ lat: -18.1, lng: 178.4 }],

  // Other popular destinations
  'Maldives': [{ lat: 4.2, lng: 73.5 }],
  'Mauritius': [{ lat: -20.2, lng: 57.5 }],
  'Seychelles': [{ lat: -4.6, lng: 55.5 }],
  'Sri Lanka': [{ lat: 6.9, lng: 79.9 }], // Colombo
  'Nepal': [{ lat: 27.7, lng: 85.3 }], // Kathmandu
  'Cambodia': [{ lat: 13.4, lng: 103.9 }], // Siem Reap
  'Czech Republic': [{ lat: 50.1, lng: 14.4 }], // Prague
  'Hungary': [{ lat: 47.5, lng: 19.0 }], // Budapest
  'Poland': [{ lat: 52.2, lng: 21.0 }, { lat: 50.1, lng: 19.9 }], // Warsaw, Krakow
  'Croatia': [{ lat: 42.6, lng: 18.1 }, { lat: 45.8, lng: 16.0 }], // Dubrovnik, Zagreb
  'Iceland': [{ lat: 64.1, lng: -21.9 }], // Reykjavik
  'Norway': [{ lat: 59.9, lng: 10.7 }], // Oslo
  'Sweden': [{ lat: 59.3, lng: 18.1 }], // Stockholm
  'Denmark': [{ lat: 55.7, lng: 12.6 }], // Copenhagen
  'Finland': [{ lat: 60.2, lng: 24.9 }], // Helsinki
  'Russia': [{ lat: 55.8, lng: 37.6 }, { lat: 59.9, lng: 30.3 }], // Moscow, St Petersburg
  'Colombia': [{ lat: 4.7, lng: -74.1 }, { lat: 10.4, lng: -75.5 }], // Bogota, Cartagena
  'Peru': [{ lat: -12.0, lng: -77.0 }, { lat: -13.5, lng: -71.9 }], // Lima, Cusco
  'Chile': [{ lat: -33.4, lng: -70.6 }], // Santiago
  'Oman': [{ lat: 23.6, lng: 58.5 }], // Muscat
};

// User-triggered location detection (via locate button)
function requestUserLocation() {
  if (!navigator.geolocation) {
    showToast('Location not supported on this device');
    return;
  }

  // Close the destination modal if open
  closeDestinationModal();

  // Show loading toast
  showToast('Detecting location...');

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const nearestCountry = findNearestCountry(latitude, longitude);

      if (nearestCountry && state.countries[nearestCountry]) {
        selectDestination(nearestCountry);
        showToast(`Location set to ${nearestCountry}`);
      } else {
        showToast('Could not determine your location');
      }
    },
    (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        showToast('Location permission denied');
      } else {
        showToast('Could not get your location');
      }
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

function detectUserLocation(isSetup = false) {
  // Prevent double detection in same session
  if (locationDetectionDone) return;

  if (!navigator.geolocation) {
    console.log('Geolocation not supported');
    return;
  }

  locationDetectionDone = true; // Mark as done before async call

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const nearestCountry = findNearestCountry(latitude, longitude);

      if (nearestCountry && state.countries[nearestCountry]) {
        detectedCountry = nearestCountry;
        // Always ask instead of auto-filling - more reliable
        showLocationBanner(nearestCountry);
      }
    },
    (error) => {
      console.log('Geolocation error:', error.message);
      // Silently fail - don't bother user
    },
    { timeout: 10000, enableHighAccuracy: false }
  );
}

function findNearestCountry(lat, lng) {
  let nearest = null;
  let minDistance = Infinity;

  for (const [country, points] of Object.entries(COUNTRY_COORD_POINTS)) {
    // Check distance to each point for this country
    for (const coords of points) {
      const distance = Math.sqrt(
        Math.pow(lat - coords.lat, 2) + Math.pow(lng - coords.lng, 2)
      );

      // Only match if reasonably close (within ~500km rough estimate)
      if (distance < minDistance && distance < 8) {
        minDistance = distance;
        nearest = country;
      }
    }
  }

  return nearest;
}

function checkLocationSuggestion() {
  // Don't show banner if:
  // 1. Location already detected this session
  // 2. User already has a destination set
  // 3. User dismissed suggestion recently (within 6 hours)
  // 4. We don't have location permission

  if (locationDetectionDone) return;
  if (state.destinationCountry) return;

  const lastDismissed = localStorage.getItem('locationBannerDismissed');
  if (lastDismissed) {
    const hoursSinceDismissed = (new Date() - new Date(lastDismissed)) / (1000 * 60 * 60);
    if (hoursSinceDismissed < 6) return;
  }

  // Try to detect location
  if (!navigator.geolocation) return;

  locationDetectionDone = true; // Mark as done before async call

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const nearestCountry = findNearestCountry(latitude, longitude);

      if (nearestCountry && state.countries[nearestCountry]) {
        detectedCountry = nearestCountry;
        showLocationBanner(nearestCountry);
      }
    },
    (error) => {
      // Silently fail
    },
    { timeout: 10000, enableHighAccuracy: false }
  );
}

function showLocationBanner(country) {
  const countryData = state.countries[country];
  if (!countryData) return;

  setCountryFlag(elements.locationBannerFlag, country, 'lg');

  elements.locationBannerTitle.textContent = `Are you visiting ${country}?`;

  // Show banner after a short delay (non-intrusive)
  setTimeout(() => {
    elements.locationBanner.classList.add('active');
  }, 2000);
}

function acceptLocationSuggestion() {
  if (detectedCountry) {
    selectDestination(detectedCountry);
    showToast(`Welcome to ${detectedCountry}! 🦝`);
  }
  elements.locationBanner.classList.remove('active');
}

function dismissLocationSuggestion() {
  elements.locationBanner.classList.remove('active');
  localStorage.setItem('locationBannerDismissed', new Date().toISOString());
}

// =============================================
// SERVICE WORKER
// =============================================

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');

      // Check for updates on launch
      registration.update();

      // Proactive version check - immediate and delayed (iOS needs both)
      checkForUpdates();
      setTimeout(checkForUpdates, 3000);

      // Listen for new service worker installing
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available!
            waitingServiceWorker = newWorker;
            showUpdateBanner();
          }
        });
      });

      // If there's already a waiting worker (from previous visit)
      if (registration.waiting) {
        waitingServiceWorker = registration.waiting;
        showUpdateBanner();
      }

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SW_ACTIVATED') {
          console.log('Service Worker activated, version:', event.data.version);
        }
        if (event.data.type === 'RATES_UPDATED') {
          checkRateUpdates();
        }
      });

      // Handle controller change (new SW took over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Prevent reload loop - only reload if we initiated the update
        if (isUpdating) {
          isUpdating = false;
          window.location.reload();
        }
      });

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

let updateBannerShown = false;
let isUpdating = false;

function showUpdateBanner() {
  // Don't show if we recently applied an update (prevents loop)
  const updateTime = localStorage.getItem('holibobs_update_time');
  if (updateTime) {
    const elapsed = Date.now() - parseInt(updateTime, 10);
    // Block banner for 2 minutes after update
    if (elapsed < 120000) {
      console.log('[Update] Skipping banner - recently updated');
      return;
    }
    localStorage.removeItem('holibobs_update_time');
  }

  if (updateBannerShown || isUpdating) return;
  updateBannerShown = true;
  elements.updateBanner.classList.add('active');
}

function applyUpdate() {
  isUpdating = true;
  localStorage.setItem('holibobs_update_time', Date.now().toString());
  elements.updateBanner.classList.remove('active');

  if (waitingServiceWorker) {
    // Tell the waiting service worker to take over
    waitingServiceWorker.postMessage('skipWaiting');
  }

  // Force reload after short delay to ensure update is applied
  // This guarantees reload even if controllerchange doesn't fire
  setTimeout(() => {
    window.location.reload();
  }, 500);
}

// Proactive version check (helps iOS PWA updates)
async function checkForUpdates() {
  try {
    // Fetch sw.js with cache busting to get latest version
    const response = await fetch(`./sw.js?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return;

    const text = await response.text();
    const match = text.match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/);
    if (match && match[1]) {
      const serverVersion = match[1];
      if (serverVersion !== APP_VERSION) {
        console.log(`[Update] New version available: ${serverVersion} (current: ${APP_VERSION})`);
        showUpdateBanner();
      }
    }
  } catch (e) {
    // Silently fail - we're probably offline
  }
}

// Check for updates when app becomes visible (iOS returning from background)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    checkForUpdates();
  }
});

// Check for updates on pageshow (better for iOS PWA cold/warm starts)
window.addEventListener('pageshow', (event) => {
  // Always check on pageshow for iOS PWA reliability
  checkForUpdates();

  // Also trigger SW update check
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg) reg.update();
    });
  }
});

// Check for updates periodically (every 30 minutes)
setInterval(checkForUpdates, 30 * 60 * 1000);

// Update greeting periodically (every 30 minutes)
setInterval(updateLocaleGreeting, 30 * 60 * 1000);

// =============================================
// TOAST
// =============================================

function showToast(message, duration = 3000, icon = null) {
  elements.toastMessage.textContent = message;
  if (icon) {
    elements.toastIcon.innerHTML = icon;
    elements.toastIcon.style.display = 'block';
  } else {
    elements.toastIcon.style.display = 'none';
  }
  elements.toast.classList.add('active');
  setTimeout(() => elements.toast.classList.remove('active'), duration);
}

// =============================================
// LOCALE GREETING
// =============================================

const greetings = {
  // Format: { morning, afternoon, evening, night, isNonLatin }
  en: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Good night' },
  es: { morning: 'Buenos días', afternoon: 'Buenas tardes', evening: 'Buenas tardes', night: 'Buenas noches' },
  fr: { morning: 'Bonjour', afternoon: 'Bon après-midi', evening: 'Bonsoir', night: 'Bonne nuit' },
  de: { morning: 'Guten Morgen', afternoon: 'Guten Tag', evening: 'Guten Abend', night: 'Gute Nacht' },
  it: { morning: 'Buongiorno', afternoon: 'Buon pomeriggio', evening: 'Buonasera', night: 'Buonanotte' },
  pt: { morning: 'Bom dia', afternoon: 'Boa tarde', evening: 'Boa noite', night: 'Boa noite' },
  nl: { morning: 'Goedemorgen', afternoon: 'Goedemiddag', evening: 'Goedenavond', night: 'Goedenacht' },
  pl: { morning: 'Dzień dobry', afternoon: 'Dzień dobry', evening: 'Dobry wieczór', night: 'Dobranoc' },
  sv: { morning: 'God morgon', afternoon: 'God eftermiddag', evening: 'God kväll', night: 'God natt' },
  da: { morning: 'God morgen', afternoon: 'God eftermiddag', evening: 'God aften', night: 'God nat' },
  no: { morning: 'God morgen', afternoon: 'God ettermiddag', evening: 'God kveld', night: 'God natt' },
  fi: { morning: 'Hyvää huomenta', afternoon: 'Hyvää iltapäivää', evening: 'Hyvää iltaa', night: 'Hyvää yötä' },
  tr: { morning: 'Günaydın', afternoon: 'İyi günler', evening: 'İyi akşamlar', night: 'İyi geceler' },
  id: { morning: 'Selamat pagi', afternoon: 'Selamat siang', evening: 'Selamat sore', night: 'Selamat malam' },
  ms: { morning: 'Selamat pagi', afternoon: 'Selamat petang', evening: 'Selamat petang', night: 'Selamat malam' },
  vi: { morning: 'Chào buổi sáng', afternoon: 'Chào buổi chiều', evening: 'Chào buổi tối', night: 'Chúc ngủ ngon' },
  tl: { morning: 'Magandang umaga', afternoon: 'Magandang hapon', evening: 'Magandang gabi', night: 'Magandang gabi' },
  sw: { morning: 'Habari za asubuhi', afternoon: 'Habari za mchana', evening: 'Habari za jioni', night: 'Usiku mwema' },
  // Additional languages for multilingual countries
  mi: { morning: 'Mōrena', afternoon: 'Kia ora', evening: 'Kia ora', night: 'Pō mārie' }, // Māori (New Zealand)
  cy: { morning: 'Bore da', afternoon: 'Prynhawn da', evening: 'Noswaith dda', night: 'Nos da' }, // Welsh
  ga: { morning: 'Maidin mhaith', afternoon: 'Tráthnóna maith', evening: 'Tráthnóna maith', night: 'Oíche mhaith' }, // Irish
  af: { morning: 'Goeie môre', afternoon: 'Goeie middag', evening: 'Goeie naand', night: 'Goeie nag' }, // Afrikaans
  // Non-Latin scripts (with English translations)
  zh: { morning: '早上好', afternoon: '下午好', evening: '晚上好', night: '晚安', isNonLatin: true, enMorning: 'Good morning', enAfternoon: 'Good afternoon', enEvening: 'Good evening', enNight: 'Good night' },
  ja: { morning: 'おはようございます', afternoon: 'こんにちは', evening: 'こんばんは', night: 'おやすみなさい', isNonLatin: true, enMorning: 'Good morning', enAfternoon: 'Good afternoon', enEvening: 'Good evening', enNight: 'Good night' },
  ko: { morning: '좋은 아침이에요', afternoon: '안녕하세요', evening: '안녕하세요', night: '안녕히 주무세요', isNonLatin: true, enMorning: 'Good morning', enAfternoon: 'Good afternoon', enEvening: 'Good evening', enNight: 'Good night' },
  th: { morning: 'สวัสดีตอนเช้า', afternoon: 'สวัสดีตอนบ่าย', evening: 'สวัสดีตอนเย็น', night: 'ราตรีสวัสดิ์', isNonLatin: true, enMorning: 'Good morning', enAfternoon: 'Good afternoon', enEvening: 'Good evening', enNight: 'Good night' },
  ar: { morning: 'صباح الخير', afternoon: 'مساء الخير', evening: 'مساء الخير', night: 'تصبح على خير', isNonLatin: true, isRTL: true, enMorning: 'Good morning', enAfternoon: 'Good afternoon', enEvening: 'Good evening', enNight: 'Good night' },
  he: { morning: 'בוקר טוב', afternoon: 'צהריים טובים', evening: 'ערב טוב', night: 'לילה טוב', isNonLatin: true, isRTL: true, enMorning: 'Good morning', enAfternoon: 'Good afternoon', enEvening: 'Good evening', enNight: 'Good night' },
  hi: { morning: 'सुप्रभात', afternoon: 'नमस्ते', evening: 'शुभ संध्या', night: 'शुभ रात्रि', isNonLatin: true, enMorning: 'Good morning', enAfternoon: 'Good afternoon', enEvening: 'Good evening', enNight: 'Good night' },
  ru: { morning: 'Доброе утро', afternoon: 'Добрый день', evening: 'Добрый вечер', night: 'Спокойной ночи', isNonLatin: true, enMorning: 'Good morning', enAfternoon: 'Good afternoon', enEvening: 'Good evening', enNight: 'Good night' },
  uk: { morning: 'Доброго ранку', afternoon: 'Добрий день', evening: 'Добрий вечір', night: 'На добраніч', isNonLatin: true, enMorning: 'Good morning', enAfternoon: 'Good afternoon', enEvening: 'Good evening', enNight: 'Good night' },
  el: { morning: 'Καλημέρα', afternoon: 'Καλό απόγευμα', evening: 'Καλησπέρα', night: 'Καληνύχτα', isNonLatin: true, enMorning: 'Good morning', enAfternoon: 'Good afternoon', enEvening: 'Good evening', enNight: 'Good night' },
  bg: { morning: 'Добро утро', afternoon: 'Добър ден', evening: 'Добър вечер', night: 'Лека нощ', isNonLatin: true, enMorning: 'Good morning', enAfternoon: 'Good afternoon', enEvening: 'Good evening', enNight: 'Good night' },
};

// Map countries to their language(s) - arrays for multilingual countries
const countryLanguages = {
  // Spanish-speaking
  'Mexico': 'es', 'Spain': 'es', 'Argentina': 'es', 'Colombia': 'es', 'Chile': 'es', 'Peru': 'es', 'Ecuador': 'es', 'Guatemala': 'es', 'Cuba': 'es', 'Dominican Republic': 'es', 'Honduras': 'es', 'El Salvador': 'es', 'Nicaragua': 'es', 'Costa Rica': 'es', 'Panama': 'es', 'Uruguay': 'es', 'Paraguay': 'es', 'Bolivia': 'es', 'Venezuela': 'es',
  // Multilingual countries (will randomly select one)
  'Switzerland': ['de', 'fr', 'it'],
  'Belgium': ['nl', 'fr', 'de'],
  'Canada': ['en', 'fr'],
  'Luxembourg': ['fr', 'de'],
  'Finland': ['fi', 'sv'],
  'New Zealand': ['en', 'mi'],
  'Ireland': ['en', 'ga'],
  'Wales': ['en', 'cy'],
  'Singapore': ['en', 'zh', 'ms'],
  'South Africa': ['en', 'af'],
  // Single language countries
  'France': 'fr', 'Monaco': 'fr',
  'Germany': 'de', 'Austria': 'de',
  'Italy': 'it', 'San Marino': 'it', 'Vatican City': 'it',
  'Portugal': 'pt', 'Brazil': 'pt',
  'Netherlands': 'nl',
  'Poland': 'pl',
  'Sweden': 'sv',
  'Denmark': 'da',
  'Norway': 'no',
  'Turkey': 'tr',
  'Indonesia': 'id',
  'Malaysia': 'ms',
  'Vietnam': 'vi',
  'Philippines': 'tl',
  'Kenya': 'sw', 'Tanzania': 'sw',
  'China': 'zh', 'Taiwan': 'zh', 'Hong Kong': 'zh', 'Macau': 'zh',
  'Japan': 'ja',
  'South Korea': 'ko',
  'Thailand': 'th',
  'Saudi Arabia': 'ar', 'UAE': 'ar', 'Egypt': 'ar', 'Morocco': 'ar', 'Qatar': 'ar', 'Kuwait': 'ar', 'Bahrain': 'ar', 'Oman': 'ar', 'Jordan': 'ar', 'Lebanon': 'ar',
  'Israel': 'he',
  'India': 'hi',
  'Russia': 'ru',
  'Ukraine': 'uk',
  'Greece': 'el', 'Cyprus': 'el',
  'Bulgaria': 'bg',
};

function updateLocaleGreeting() {
  const hour = new Date().getHours();
  let timeOfDay;
  if (hour >= 5 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  else timeOfDay = 'night';

  const country = state.destinationCountry;
  let langSetting = country ? (countryLanguages[country] || 'en') : 'en';

  // Build array of language codes to display
  let langCodes = Array.isArray(langSetting) ? langSetting : [langSetting];

  // Get English greeting for reference
  const enGreeting = greetings.en[timeOfDay];

  // Check if any language is RTL
  const hasRTL = langCodes.some(code => greetings[code]?.isRTL);

  // Get user's name for personalized greeting
  const userName = state.userName || '';

  // Build greeting parts
  let greetingParts = [];

  langCodes.forEach(langCode => {
    const lang = greetings[langCode] || greetings.en;
    if (langCode !== 'en') {
      greetingParts.push(lang[timeOfDay]);
    }
  });

  // Always include English at the end if there are non-English greetings
  // Add name to English greeting for Latin script languages
  let englishWithName = enGreeting;
  if (userName) {
    englishWithName = `${enGreeting}, ${userName}`;
  }

  if (greetingParts.length > 0) {
    greetingParts.push(englishWithName);
  } else {
    // Only English
    greetingParts.push(englishWithName);
  }

  // Join with separator and wrap for scrolling if long
  let greeting;
  const scrollClass = hasRTL ? 'greeting-scroll greeting-scroll-rtl' : 'greeting-scroll';
  if (greetingParts.length > 1) {
    greeting = `<span class="${scrollClass}">👋 ${greetingParts.join(' · ')}</span>`;
  } else {
    greeting = `👋 ${greetingParts[0]}`;
  }

  if (elements.localeGreeting) {
    elements.localeGreeting.innerHTML = greeting;
  }
}

// =============================================
// RENDER
// =============================================

function render() {
  // Update locale greeting
  updateLocaleGreeting();

  // Update destination header
  if (state.destinationCountry) {
    setCountryFlag(elements.destHeaderFlag, state.destinationCountry, 'lg');
    elements.destHeaderName.textContent = state.destinationCountry;
  } else {
    elements.destHeaderFlag.innerHTML = '';
    elements.destHeaderFlag.textContent = '🌴';
    elements.destHeaderName.textContent = 'Tap to select destination';
  }

  // Update price card currencies
  const localInfo = state.currencies[state.localCurrency];
  const altInfo = state.currencies[state.altCurrency];
  const homeInfo = state.currencies[state.homeCurrency];

  setFlagElement(elements.localFlag, state.localCurrency, 'lg');
  elements.localCurrency.textContent = `${localInfo?.symbol || ''} ${state.localCurrency}`;
  elements.localCurrencyName.textContent = getShortCurrencyName(localInfo?.name);
  setFlagElement(elements.altFlag, state.altCurrency, 'lg');
  elements.altCurrency.textContent = `${altInfo?.symbol || ''} ${state.altCurrency}`;
  elements.altCurrencyName.textContent = getShortCurrencyName(altInfo?.name);

  setFlagElement(elements.localHomeFlag, state.homeCurrency);
  setFlagElement(elements.altHomeFlag, state.homeCurrency);

  // Set input values with formatting
  elements.localAmountInput.value = formatAmountDisplay(state.localAmount, state.localCurrency);
  elements.altAmountInput.value = formatAmountDisplay(state.altAmount, state.altCurrency);
  elements.homeAmountInput.value = formatAmountDisplay(state.homeAmount, state.homeCurrency);

  // Update home currency card
  setFlagElement(elements.homeCardFlag, state.homeCurrency, 'lg');
  elements.homeCardCurrency.textContent = `${homeInfo?.symbol || ''} ${state.homeCurrency}`;
  elements.homeCurrencyName.textContent = getShortCurrencyName(homeInfo?.name);

  // Show/hide alt card based on destination
  const countryInfo = state.destinationCountry ? state.countries[state.destinationCountry] : null;
  const hasAltCurrency = countryInfo?.alsoAccepted && countryInfo.alsoAccepted.length > 0;
  // Use classList to toggle visibility (works with CSS !important)
  if (hasAltCurrency || !state.destinationCountry) {
    elements.altPriceCard.classList.remove('card-hidden');
  } else {
    elements.altPriceCard.classList.add('card-hidden');
  }

  // Hide home card if local currency matches home currency
  if (state.localCurrency === state.homeCurrency && state.destinationCountry) {
    elements.homeCurrencyCard.classList.add('card-hidden');
  } else {
    elements.homeCurrencyCard.classList.remove('card-hidden');
  }

  updateLockUI();
  updateSurchargeUI();
  calculatePrices();
  // Note: Don't call calculateHomeConversions() here - it would sync from home
  // to local/alt and overwrite user changes. Only sync when user actually
  // changes the home input.
  renderPaymentInfo();
  renderScams();
  updateRateStatus();
  updateSettingsDisplay();

  // Auto-size inputs after render
  autoSizeAllInputs();
}

function updateSurchargeUI() {
  // Restore surcharge row visibility and values
  if (state.surchargeAmount > 0) {
    elements.surchargeRow.classList.remove('hidden');
    elements.surchargeInput.value = state.surchargeAmount;

    // Check if it matches a preset
    const presetValues = ['0', '3', '5', '10'];
    const amountStr = String(state.surchargeAmount);
    if (state.surchargeType === 'percent' && presetValues.includes(amountStr)) {
      updateSurchargePresetUI(amountStr);
      elements.surchargeCustom.classList.add('hidden');
    } else {
      // Custom value
      updateSurchargePresetUI('custom');
      elements.surchargeCustom.classList.remove('hidden');
    }
  }
  elements.surchargePercent.classList.toggle('active', state.surchargeType === 'percent');
  elements.surchargeFixed.classList.toggle('active', state.surchargeType === 'fixed');
}

// =============================================
// ONLINE/OFFLINE
// =============================================

window.addEventListener('online', () => {
  updateRateStatus();
  checkRateUpdates();
});

window.addEventListener('offline', () => {
  updateRateStatus();
  showToast('You are offline. Using cached data.');
});

// =============================================
// FOOTER ACTIVITY ANIMATION
// =============================================

const HOLIDAY_ACTIVITIES = [
  'sipping margaritas 🍹',
  'floating down the lazy river 🛟',
  'lounging by the pool 🏊',
  'exploring ancient ruins 🏛️',
  'eating tacos 🌮',
  'watching the sunset 🌅',
  'dancing to mariachi 💃',
  'snorkeling in cenotes 🤿',
  'bargaining at markets 🛍️',
  'napping in hammocks 😴',
  'chasing beach sunsets 🏖️',
  'dodging iguanas 🦎',
  'perfecting their tan ☀️'
];

let currentActivityIndex = 0;

function cycleActivity() {
  const activityText = document.getElementById('activityText');
  if (!activityText) return;

  // Fade out
  activityText.classList.add('fade-out');
  activityText.classList.remove('fade-in');

  setTimeout(() => {
    // Change text
    currentActivityIndex = (currentActivityIndex + 1) % HOLIDAY_ACTIVITIES.length;
    activityText.textContent = HOLIDAY_ACTIVITIES[currentActivityIndex];

    // Fade in
    activityText.classList.remove('fade-out');
    activityText.classList.add('fade-in');
  }, 400);
}

// Start cycling activities every 4 seconds
setInterval(cycleActivity, 4000);

// =============================================
// START
// =============================================

document.addEventListener('DOMContentLoaded', init);
