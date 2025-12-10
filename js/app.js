/**
 * HoliBobs - Travel Money App
 * Compare prices in local currency vs your home currency
 */

// =============================================
// STATE & CONFIGURATION
// =============================================

const APP_VERSION = '2.5.1';
const RATE_UPDATE_INTERVAL = 24 * 60 * 60 * 1000;
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

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
  lastRateUpdate: null
};

// =============================================
// DOM ELEMENTS
// =============================================

const elements = {
  // Destination header
  destHeaderBtn: document.getElementById('destHeaderBtn'),
  destHeaderFlag: document.getElementById('destHeaderFlag'),
  destHeaderName: document.getElementById('destHeaderName'),

  // Price comparison
  localAmountInput: document.getElementById('localAmountInput'),
  altAmountInput: document.getElementById('altAmountInput'),
  localFlag: document.getElementById('localFlag'),
  localCurrency: document.getElementById('localCurrency'),
  altFlag: document.getElementById('altFlag'),
  altCurrency: document.getElementById('altCurrency'),
  localHomeFlag: document.getElementById('localHomeFlag'),
  localHomeAmount: document.getElementById('localHomeAmount'),
  altHomeFlag: document.getElementById('altHomeFlag'),
  altHomeAmount: document.getElementById('altHomeAmount'),
  surchargeIndicator: document.getElementById('surchargeIndicator'),
  localSurchargeIndicator: document.getElementById('localSurchargeIndicator'),
  dealIndicator: document.getElementById('dealIndicator'),
  dealText: document.getElementById('dealText'),
  quickAmounts: document.getElementById('quickAmounts'),
  altPriceCard: document.getElementById('altPriceCard'),

  // Home currency card
  homeCurrencyCard: document.getElementById('homeCurrencyCard'),
  homeCardFlag: document.getElementById('homeCardFlag'),
  homeCardCurrency: document.getElementById('homeCardCurrency'),
  homeAmountInput: document.getElementById('homeAmountInput'),
  homeToLocalFlag: document.getElementById('homeToLocalFlag'),
  homeToLocalAmount: document.getElementById('homeToLocalAmount'),
  homeToAltFlag: document.getElementById('homeToAltFlag'),
  homeToAltAmount: document.getElementById('homeToAltAmount'),
  homeToAltWrapper: document.getElementById('homeToAltWrapper'),

  // Lock toggle and surcharge
  lockToggleBtn: document.getElementById('lockToggleBtn'),
  lockIcon: document.getElementById('lockIcon'),
  lockText: document.getElementById('lockText'),
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

  // Scams/Safety
  generalScams: document.getElementById('generalScams'),
  destinationSection: document.getElementById('destinationSection'),
  destTitleFlag: document.getElementById('destTitleFlag'),
  destTitleText: document.getElementById('destTitleText'),
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
  homeSettingBtn: document.getElementById('homeSettingBtn'),
  destSettingBtn: document.getElementById('destSettingBtn'),
  updateRatesBtn: document.getElementById('updateRatesBtn'),
  settingsLastUpdated: document.getElementById('settingsLastUpdated'),
  homeSettingFlag: document.getElementById('homeSettingFlag'),
  homeSettingCode: document.getElementById('homeSettingCode'),
  homeSettingName: document.getElementById('homeSettingName'),
  destSettingFlag: document.getElementById('destSettingFlag'),
  destSettingName: document.getElementById('destSettingName'),

  // QR Code Modal
  qrModal: document.getElementById('qrModal'),
  closeQrModal: document.getElementById('closeQrModal'),
  shareQrBtn: document.getElementById('shareQrBtn'),
  qrCanvas: document.getElementById('qrCanvas'),
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
    // Fallback to emoji if no ISO code
    return currency?.flag || '🌍';
  }

  // Use flag-icons CSS library
  const sizeClass = size === 'lg' ? 'fi-lg' : (size === 'sm' ? 'fi-sm' : '');
  return `<span class="fi fi-${currency.code} ${sizeClass}"></span>`;
}

function setFlagElement(element, currencyCode, size = 'md') {
  if (!element) return;
  const currency = state.currencies[currencyCode];
  if (!currency || !currency.code) {
    // Fallback to emoji
    element.innerHTML = '';
    element.textContent = currency?.flag || '🌍';
  } else {
    const sizeClass = size === 'lg' ? 'fi-lg' : (size === 'sm' ? 'fi-sm' : '');
    element.innerHTML = `<span class="fi fi-${currency.code} ${sizeClass}"></span>`;
  }
}

function setCountryFlag(element, countryName, size = 'md') {
  if (!element) return;
  const countryData = state.countries[countryName];
  if (countryData && countryData.code) {
    // Use country code directly (e.g., "FR" for France) instead of currency code
    const sizeClass = size === 'lg' ? 'fi-lg' : (size === 'sm' ? 'fi-sm' : '');
    element.innerHTML = `<span class="fi fi-${countryData.code.toLowerCase()} ${sizeClass}"></span>`;
  } else if (countryData) {
    // Fallback to currency flag if no country code
    setFlagElement(element, countryData.currency, size);
  } else {
    element.innerHTML = '';
    element.textContent = '🌍';
  }
}

// =============================================
// INITIALIZATION
// =============================================

async function init() {
  initTheme();
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
}

function checkFirstLoad() {
  const hasVisited = localStorage.getItem('holibobsSetupComplete');
  isFirstLoad = !hasVisited;
}

function displayVersion() {
  if (elements.appVersion) {
    elements.appVersion.textContent = `v${APP_VERSION}`;
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
    lastRateUpdate: state.lastRateUpdate
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

  // Price inputs
  elements.localAmountInput.addEventListener('input', (e) => {
    state.localAmount = parseFloat(e.target.value) || 0;
    if (state.pricesLocked) {
      syncLockedPrices('local');
    }
    calculatePrices();
  });

  elements.altAmountInput.addEventListener('input', (e) => {
    state.altAmount = parseFloat(e.target.value) || 0;
    if (state.pricesLocked) {
      syncLockedPrices('alt');
    }
    calculatePrices();
  });

  // Home amount input
  elements.homeAmountInput.addEventListener('input', (e) => {
    state.homeAmount = parseFloat(e.target.value) || 0;
    calculateHomeConversions();
  });

  // +/- buttons for home amount
  document.querySelectorAll('.home-adjust').forEach(btn => {
    btn.addEventListener('click', () => {
      const isPlus = btn.classList.contains('plus');
      adjustHomeAmount(isPlus ? 1 : -1);
    });
  });

  // +/- buttons (event delegation)
  document.querySelectorAll('.price-adjust').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      const isPlus = btn.classList.contains('plus');
      adjustPrice(target, isPlus ? 1 : -1);
    });
  });

  // Quick amounts
  elements.quickAmounts.addEventListener('click', (e) => {
    const btn = e.target.closest('.quick-btn');
    if (btn) {
      const amount = parseFloat(btn.dataset.amount);
      state.localAmount = amount;
      elements.localAmountInput.value = amount;
      calculatePrices();
    }
  });

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
  elements.destSettingBtn.addEventListener('click', () => {
    closeSettingsModal();
    openDestinationModal('settings');
  });
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

  // Update banner
  elements.updateBtn.addEventListener('click', applyUpdate);

  // Lock toggle
  elements.lockToggleBtn.addEventListener('click', togglePriceLock);

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
}

// =============================================
// PRICE CALCULATION
// =============================================

function adjustHomeAmount(direction) {
  const currentAmount = state.homeAmount;
  let step = 5;
  if (currentAmount >= 500) step = 50;
  else if (currentAmount >= 100) step = 20;
  else if (currentAmount >= 50) step = 10;
  else step = 5;

  let newAmount = currentAmount + (direction * step);
  if (newAmount < 0) newAmount = 0;

  // Round to the nearest step for clean numbers
  newAmount = Math.round(newAmount / step) * step;

  state.homeAmount = newAmount;
  elements.homeAmountInput.value = newAmount;
  calculateHomeConversions();
}

function calculateHomeConversions() {
  const { homeAmount, localCurrency, altCurrency, homeCurrency, rates, currencies } = state;

  if (!rates[localCurrency] || !rates[altCurrency] || !rates[homeCurrency]) {
    return;
  }

  // Convert home currency to USD first, then to local and alt
  const homeInUsd = homeAmount / rates[homeCurrency];
  const homeInLocal = homeInUsd * rates[localCurrency];
  const homeInAlt = homeInUsd * rates[altCurrency];

  // Get currency info
  const localInfo = currencies[localCurrency];
  const altInfo = currencies[altCurrency];
  const localSymbol = localInfo?.symbol || '';
  const altSymbol = altInfo?.symbol || '';

  // Format conversions
  const localFormatted = formatNumber(homeInLocal, localCurrency);
  const altFormatted = formatNumber(homeInAlt, altCurrency);

  // Update displays
  elements.homeToLocalAmount.textContent = `≈ ${localSymbol}${localFormatted} ${localCurrency}`;
  elements.homeToAltAmount.textContent = `≈ ${altSymbol}${altFormatted} ${altCurrency}`;

  saveState();
}

function adjustPrice(target, direction) {
  const currentAmount = target === 'local' ? state.localAmount : state.altAmount;
  let step = 10;
  if (currentAmount >= 1000) step = 100;
  else if (currentAmount >= 100) step = 50;
  else if (currentAmount >= 50) step = 10;
  else step = 5;

  let newAmount = currentAmount + (direction * step);
  if (newAmount < 0) newAmount = 0;

  // Round to the nearest step for clean numbers
  newAmount = Math.round(newAmount / step) * step;

  if (target === 'local') {
    state.localAmount = newAmount;
    elements.localAmountInput.value = newAmount;
  } else {
    state.altAmount = newAmount;
    elements.altAmountInput.value = newAmount;
  }

  if (state.pricesLocked) {
    syncLockedPrices(target);
  }
  calculatePrices();
}

function togglePriceLock() {
  state.pricesLocked = !state.pricesLocked;
  updateLockUI();

  const lockedIcon = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>';
  const unlockedIcon = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 019.9-1"/>';

  if (state.pricesLocked) {
    // Sync alt to local when locking
    syncLockedPrices('local');
    calculatePrices();
    showToast('Prices linked at exchange rate', 3000, lockedIcon);
  } else {
    showToast('Prices unlinked', 3000, unlockedIcon);
  }
}

function updateLockUI() {
  if (state.pricesLocked) {
    elements.lockToggleBtn.classList.add('locked');
    elements.lockText.textContent = 'Linked';
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
  const { localCurrency, altCurrency, rates } = state;

  if (!rates[localCurrency] || !rates[altCurrency]) return;

  // Exchange rate from local to alt
  const localToUsd = 1 / rates[localCurrency];
  const usdToAlt = rates[altCurrency];
  const localToAlt = localToUsd * usdToAlt;

  if (source === 'local') {
    // Calculate alt from local - round to whole number for cleaner display
    let altAmount = state.localAmount * localToAlt;
    state.altAmount = altAmount >= 10 ? Math.round(altAmount) : Math.round(altAmount * 10) / 10;
    elements.altAmountInput.value = state.altAmount;
  } else {
    // Calculate local from alt - round to whole number for cleaner display
    let localAmount = state.altAmount / localToAlt;
    state.localAmount = localAmount >= 10 ? Math.round(localAmount) : Math.round(localAmount * 10) / 10;
    elements.localAmountInput.value = state.localAmount;
  }
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
  const homeSymbol = homeInfo?.symbol || '';

  // Update displays
  elements.localHomeAmount.textContent = `${homeSymbol}${formatNumber(localInHome, homeCurrency)}`;
  elements.altHomeAmount.textContent = `${homeSymbol}${formatNumber(altInHome, homeCurrency)}`;

  // Show surcharge indication if applicable (on both local and alt cards)
  const surchargeIndicators = [elements.surchargeIndicator, elements.localSurchargeIndicator];

  if (surchargeAmount > 0) {
    // Calculate the fee amount in home currency (use local price as reference)
    const localInUsdBase = localAmount / rates[localCurrency];
    const localInHomeBase = localInUsdBase * rates[homeCurrency];
    const feeInHome = localInHome - localInHomeBase;
    const feeFormatted = `${homeSymbol}${formatNumber(feeInHome, homeCurrency)}`;

    const surchargeLabel = surchargeType === 'percent'
      ? `+${surchargeAmount}% fee (${feeFormatted})`
      : `+${homeSymbol}${surchargeAmount} fee`;
    const oldLabel = elements.surchargeIndicator.textContent;

    // Update both surcharge indicators
    surchargeIndicators.forEach(indicator => {
      if (!indicator) return;
      indicator.classList.remove('animate-out');
      indicator.textContent = surchargeLabel;

      // Trigger animation if surcharge changed
      if (oldLabel !== surchargeLabel) {
        indicator.classList.remove('animate');
        void indicator.offsetWidth;
        indicator.classList.add('animate');
      }
    });
  } else {
    // Animate out if there was a previous surcharge
    surchargeIndicators.forEach(indicator => {
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

  // Update deal indicator
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

  saveState();
}

function formatNumber(num, currency) {
  if (isNaN(num)) return '--';
  let decimals = 2;
  const noDecimalCurrencies = ['JPY', 'KRW', 'VND', 'IDR', 'CLP', 'HUF'];
  if (noDecimalCurrencies.includes(currency)) decimals = 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function updateQuickAmounts() {
  const { localCurrency } = state;
  let denominations = [50, 100, 200, 500, 1000];

  const highValueCurrencies = ['JPY', 'KRW', 'VND', 'IDR', 'CLP', 'HUF', 'COP'];
  if (highValueCurrencies.includes(localCurrency)) {
    denominations = [500, 1000, 2000, 5000, 10000];
  }

  elements.quickAmounts.innerHTML = denominations.map(amount =>
    `<button class="quick-btn" data-amount="${amount}">${amount >= 1000 ? (amount/1000) + 'k' : amount}</button>`
  ).join('');
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
    const currency = state.currencies[data.currency];
    const flagHtml = data.code
      ? `<span class="fi fi-${data.code.toLowerCase()} fi-lg"></span>`
      : (currency?.flag || '🌍');
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
    const currency = state.currencies[data.currency];
    const flagHtml = data.code
      ? `<span class="fi fi-${data.code.toLowerCase()} fi-lg"></span>`
      : (currency?.flag || '🌍');
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
  }

  saveState();
  closeDestinationModal();

  if (currentModalContext === 'setup') {
    updateSetupDisplay();
  } else {
    render();
  }
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
      : currency.flag;
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
  const home = state.currencies[state.homeCurrency];
  if (home) {
    setFlagElement(elements.homeSettingFlag, state.homeCurrency, 'lg');
    elements.homeSettingCode.textContent = state.homeCurrency;
    elements.homeSettingName.textContent = home.name;
  }

  if (state.destinationCountry) {
    setCountryFlag(elements.destSettingFlag, state.destinationCountry, 'lg');
    elements.destSettingName.textContent = state.destinationCountry;
  } else {
    elements.destSettingFlag.innerHTML = '';
    elements.destSettingFlag.textContent = '🌍';
    elements.destSettingName.textContent = 'Select destination';
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
  const url = window.location.href;
  elements.qrUrl.textContent = url;

  // Generate QR code using qrcode library
  if (typeof QRCode !== 'undefined' && elements.qrCanvas) {
    try {
      QRCode.toCanvas(elements.qrCanvas, url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#1a1a2e',
          light: '#ffffff'
        }
      }, function(error) {
        if (error) {
          console.error('QR code generation error:', error);
          // Fallback: show URL prominently
          elements.qrCanvas.style.display = 'none';
        }
      });
    } catch (e) {
      console.error('QR code error:', e);
    }
  } else {
    console.log('QRCode library not available or canvas not found');
  }
}

function copyShareUrl() {
  const url = window.location.origin + window.location.pathname;
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

  if (state.destinationCountry && state.scams.countries) {
    const countryScams = state.scams.countries[state.destinationCountry];
    if (countryScams) {
      elements.destinationSection.style.display = 'block';
      elements.destTitleFlag.textContent = countryScams.flag || '';
      elements.destTitleText.textContent = `${state.destinationCountry} Safety`;

      if (countryScams.tips) {
        elements.countryTips.innerHTML = `<ul>${countryScams.tips.map(tip => `<li>${tip}</li>`).join('')}</ul>`;
      }

      if (countryScams.scams) {
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
      }
    } else {
      elements.destinationSection.style.display = 'none';
    }
  } else {
    elements.destinationSection.style.display = 'none';
  }

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
  }
  // If no saved theme, let system preference handle it via CSS
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const isDark = currentTheme === 'dark';
  const newTheme = isDark ? 'light' : 'dark';

  // Get button position for animation origin
  const btn = elements.themeToggleBtn;
  const rect = btn.getBoundingClientRect();
  const overlay = elements.themeTransition;

  // Set CSS variables for animation origin
  overlay.style.setProperty('--reveal-x', `${window.innerWidth - rect.right + rect.width / 2}px`);
  overlay.style.setProperty('--reveal-y', `${rect.top + rect.height / 2}px`);

  // Set the reveal color based on target theme
  const revealColor = newTheme === 'dark' ? '#0f1419' : '#fff9e6';
  overlay.style.setProperty('--reveal-color', revealColor);

  // Add animation classes
  btn.classList.add('animating');
  overlay.classList.remove('fade-out', 'to-dark', 'to-light');
  overlay.classList.add('transitioning', newTheme === 'dark' ? 'to-dark' : 'to-light');

  // Create stars for night mode transition
  if (newTheme === 'dark') {
    createStars();
    // Add a shooting star after a delay
    setTimeout(() => createShootingStar(), 400);
  }

  // Apply the theme partway through the animation
  setTimeout(() => {
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('holibobsTheme', newTheme);
  }, 400);

  // Clean up animation
  setTimeout(() => {
    overlay.classList.add('fade-out');
    btn.classList.remove('animating');
  }, 800);

  setTimeout(() => {
    overlay.classList.remove('transitioning', 'fade-out', 'to-dark', 'to-light');
    elements.starsContainer.innerHTML = '';
  }, 1100);

  // Show toast after animation
  setTimeout(() => {
    if (newTheme === 'dark') {
      showToast('Night mode enabled');
    } else {
      showToast('Day mode - high contrast for sunny days!');
    }
  }, 500);
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
        // Reload to get the new version
        window.location.reload();
      });

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

function showUpdateBanner() {
  elements.updateBanner.classList.add('active');
}

function applyUpdate() {
  if (waitingServiceWorker) {
    // Tell the waiting service worker to take over
    waitingServiceWorker.postMessage('skipWaiting');
    elements.updateBanner.classList.remove('active');
  } else {
    // Fallback: hard reload bypassing cache
    window.location.reload(true);
  }
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
// RENDER
// =============================================

function render() {
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
  setFlagElement(elements.altFlag, state.altCurrency, 'lg');
  elements.altCurrency.textContent = `${altInfo?.symbol || ''} ${state.altCurrency}`;

  setFlagElement(elements.localHomeFlag, state.homeCurrency);
  setFlagElement(elements.altHomeFlag, state.homeCurrency);

  // Set input values
  elements.localAmountInput.value = state.localAmount;
  elements.altAmountInput.value = state.altAmount;
  elements.homeAmountInput.value = state.homeAmount;

  // Update home currency card
  setFlagElement(elements.homeCardFlag, state.homeCurrency, 'lg');
  elements.homeCardCurrency.textContent = `${homeInfo?.symbol || ''} ${state.homeCurrency}`;
  setFlagElement(elements.homeToLocalFlag, state.localCurrency);
  setFlagElement(elements.homeToAltFlag, state.altCurrency);

  // Show/hide alt card based on destination
  const countryInfo = state.destinationCountry ? state.countries[state.destinationCountry] : null;
  const hasAltCurrency = countryInfo?.alsoAccepted && countryInfo.alsoAccepted.length > 0;
  elements.altPriceCard.style.display = hasAltCurrency || !state.destinationCountry ? 'block' : 'none';

  // Show/hide alt conversion in home card based on destination
  elements.homeToAltWrapper.style.display = hasAltCurrency || !state.destinationCountry ? 'flex' : 'none';

  updateQuickAmounts();
  updateLockUI();
  updateSurchargeUI();
  calculatePrices();
  calculateHomeConversions();
  renderPaymentInfo();
  renderScams();
  updateRateStatus();
  updateSettingsDisplay();
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
