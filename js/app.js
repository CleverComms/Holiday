/**
 * Holiday Currency Converter - Main Application
 * Offline-first PWA for currency conversion and travel safety
 */

// =============================================
// STATE & CONFIGURATION
// =============================================

const APP_VERSION = '1.0.0';
const RATE_UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in ms
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

let state = {
  homeCurrency: 'USD',
  destinationCountry: null,
  destinationCurrency: null,
  fromCurrency: 'USD',
  toCurrency: 'MXN',
  amount: 100,
  showUsdEquivalent: true,
  compareCurrencies: ['EUR', 'GBP', 'MXN', 'JPY'],
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
  // Tabs
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),

  // Converter
  amountInput: document.getElementById('amountInput'),
  clearAmount: document.getElementById('clearAmount'),
  fromCurrencyBtn: document.getElementById('fromCurrencyBtn'),
  toCurrencyBtn: document.getElementById('toCurrencyBtn'),
  swapCurrencies: document.getElementById('swapCurrencies'),
  resultValue: document.getElementById('resultValue'),
  resultCurrency: document.getElementById('resultCurrency'),
  rateDisplay: document.getElementById('rateDisplay'),
  quickBtns: document.querySelectorAll('.quick-btn'),
  alsoInUsd: document.getElementById('alsoInUsd'),
  usdEquivalent: document.getElementById('usdEquivalent'),

  // From currency display
  fromFlag: document.getElementById('fromFlag'),
  fromCode: document.getElementById('fromCode'),
  fromName: document.getElementById('fromName'),

  // To currency display
  toFlag: document.getElementById('toFlag'),
  toCode: document.getElementById('toCode'),
  toName: document.getElementById('toName'),

  // Compare
  compareAmount: document.getElementById('compareAmount'),
  compareCurrencyBtn: document.getElementById('compareCurrencyBtn'),
  compareFlag: document.getElementById('compareFlag'),
  compareCode: document.getElementById('compareCode'),
  compareList: document.getElementById('compareList'),
  addCompareBtn: document.getElementById('addCompareBtn'),

  // Scams
  destinationBtn: document.getElementById('destinationBtn'),
  destFlag: document.getElementById('destFlag'),
  destName: document.getElementById('destName'),
  generalScams: document.getElementById('generalScams'),
  destinationSection: document.getElementById('destinationSection'),
  destTitleFlag: document.getElementById('destTitleFlag'),
  destTitleText: document.getElementById('destTitleText'),
  countryTips: document.getElementById('countryTips'),
  countryScams: document.getElementById('countryScams'),

  // Rate status
  rateStatus: document.getElementById('rateStatus'),
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

  settingsModal: document.getElementById('settingsModal'),
  settingsBtn: document.getElementById('settingsBtn'),
  closeSettingsModal: document.getElementById('closeSettingsModal'),
  homeSettingBtn: document.getElementById('homeSettingBtn'),
  destSettingBtn: document.getElementById('destSettingBtn'),
  showUsdToggle: document.getElementById('showUsdToggle'),
  updateRatesBtn: document.getElementById('updateRatesBtn'),
  settingsLastUpdated: document.getElementById('settingsLastUpdated'),

  // Settings display
  homeSettingFlag: document.getElementById('homeSettingFlag'),
  homeSettingCode: document.getElementById('homeSettingCode'),
  homeSettingName: document.getElementById('homeSettingName'),
  destSettingFlag: document.getElementById('destSettingFlag'),
  destSettingName: document.getElementById('destSettingName'),

  // A2HS
  a2hsBanner: document.getElementById('a2hsBanner'),
  a2hsInstall: document.getElementById('a2hsInstall'),
  a2hsDismiss: document.getElementById('a2hsDismiss'),
  iosA2hsModal: document.getElementById('iosA2hsModal'),
  closeIosModal: document.getElementById('closeIosModal'),

  // Refresh rates
  refreshRatesBtn: document.getElementById('refreshRatesBtn'),

  // Toast
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toastMessage')
};

// Current modal context
let currentModalContext = null;
let deferredPrompt = null;

// =============================================
// INITIALIZATION
// =============================================

async function init() {
  // Load saved state
  loadState();

  // Load data files
  await loadDataFiles();

  // Set up event listeners
  setupEventListeners();

  // Initial render
  render();

  // Check for rate updates
  checkRateUpdates();

  // Register service worker
  registerServiceWorker();

  // Setup A2HS
  setupAddToHomeScreen();
}

function loadState() {
  const saved = localStorage.getItem('holidayState');
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
    destinationCurrency: state.destinationCurrency,
    fromCurrency: state.fromCurrency,
    toCurrency: state.toCurrency,
    amount: state.amount,
    showUsdEquivalent: state.showUsdEquivalent,
    compareCurrencies: state.compareCurrencies,
    rates: state.rates,
    lastRateUpdate: state.lastRateUpdate
  };
  localStorage.setItem('holidayState', JSON.stringify(toSave));
}

async function loadDataFiles() {
  try {
    // Load currencies and countries
    const currenciesResponse = await fetch('data/currencies.json');
    const currenciesData = await currenciesResponse.json();
    state.currencies = currenciesData.currencies;
    state.countries = currenciesData.countries;

    // Load rates (from storage first, then file as fallback)
    if (!state.rates || Object.keys(state.rates).length === 0) {
      const ratesResponse = await fetch('data/rates.json');
      const ratesData = await ratesResponse.json();
      state.rates = ratesData.rates;
      state.lastRateUpdate = ratesData.lastUpdated;
    }

    // Load scams
    const scamsResponse = await fetch('data/scams.json');
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
  // Tab navigation
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Amount input
  elements.amountInput.addEventListener('input', handleAmountChange);
  elements.clearAmount.addEventListener('click', () => {
    elements.amountInput.value = '';
    state.amount = 0;
    convert();
  });

  // Quick amounts
  elements.quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.amountInput.value = btn.dataset.amount;
      state.amount = parseFloat(btn.dataset.amount);
      convert();
    });
  });

  // Currency selection
  elements.fromCurrencyBtn.addEventListener('click', () => openCurrencyModal('from'));
  elements.toCurrencyBtn.addEventListener('click', () => openCurrencyModal('to'));
  elements.swapCurrencies.addEventListener('click', swapCurrencies);

  // Compare
  elements.compareAmount.addEventListener('input', handleCompareAmountChange);
  elements.compareCurrencyBtn.addEventListener('click', () => openCurrencyModal('compare'));
  elements.addCompareBtn.addEventListener('click', () => openCurrencyModal('addCompare'));

  // Destination
  elements.destinationBtn.addEventListener('click', () => openDestinationModal('destination'));

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
  elements.showUsdToggle.addEventListener('change', () => {
    state.showUsdEquivalent = elements.showUsdToggle.checked;
    saveState();
    updateUsdEquivalent();
  });
  elements.updateRatesBtn.addEventListener('click', () => {
    closeSettingsModal();
    updateExchangeRates();
  });

  // Refresh rates button
  elements.refreshRatesBtn.addEventListener('click', updateExchangeRates);

  // A2HS
  elements.a2hsInstall.addEventListener('click', installApp);
  elements.a2hsDismiss.addEventListener('click', dismissA2hs);
  elements.closeIosModal.addEventListener('click', () => {
    elements.iosA2hsModal.classList.remove('active');
  });

  // PWA install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showA2hsBanner();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCurrencyModal();
      closeDestinationModal();
      closeSettingsModal();
      elements.iosA2hsModal.classList.remove('active');
    }
  });
}

// =============================================
// TAB NAVIGATION
// =============================================

function switchTab(tabId) {
  elements.tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  elements.tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tabId}Tab`);
  });
}

// =============================================
// CURRENCY CONVERSION
// =============================================

function handleAmountChange(e) {
  state.amount = parseFloat(e.target.value) || 0;
  convert();
}

function handleCompareAmountChange(e) {
  state.amount = parseFloat(e.target.value) || 0;
  elements.amountInput.value = state.amount;
  convert();
  renderCompareList();
}

function convert() {
  const { amount, fromCurrency, toCurrency, rates } = state;

  if (!rates[fromCurrency] || !rates[toCurrency]) {
    elements.resultValue.textContent = '--';
    return;
  }

  // Convert via USD base
  const amountInUsd = amount / rates[fromCurrency];
  const result = amountInUsd * rates[toCurrency];

  // Update result display
  elements.resultValue.textContent = formatNumber(result, toCurrency);
  elements.resultCurrency.textContent = toCurrency;

  // Update rate display
  const rate = rates[toCurrency] / rates[fromCurrency];
  elements.rateDisplay.textContent = `1 ${fromCurrency} = ${formatNumber(rate, toCurrency)} ${toCurrency}`;

  // Update USD equivalent
  updateUsdEquivalent();

  saveState();
}

function swapCurrencies() {
  const temp = state.fromCurrency;
  state.fromCurrency = state.toCurrency;
  state.toCurrency = temp;

  updateCurrencyDisplay();
  convert();
}

function updateCurrencyDisplay() {
  const from = state.currencies[state.fromCurrency];
  const to = state.currencies[state.toCurrency];

  if (from) {
    elements.fromFlag.textContent = from.flag;
    elements.fromCode.textContent = state.fromCurrency;
    elements.fromName.textContent = from.name;
  }

  if (to) {
    elements.toFlag.textContent = to.flag;
    elements.toCode.textContent = state.toCurrency;
    elements.toName.textContent = to.name;
  }

  // Update compare section
  const home = state.currencies[state.homeCurrency];
  if (home) {
    elements.compareFlag.textContent = home.flag;
    elements.compareCode.textContent = state.homeCurrency;
  }
}

function updateUsdEquivalent() {
  if (!state.showUsdEquivalent || state.fromCurrency === 'USD') {
    elements.alsoInUsd.style.display = 'none';
    return;
  }

  elements.alsoInUsd.style.display = 'flex';
  const amountInUsd = state.amount / state.rates[state.fromCurrency];
  elements.usdEquivalent.textContent = `$${formatNumber(amountInUsd, 'USD')}`;
}

function formatNumber(num, currency) {
  if (isNaN(num)) return '--';

  // Determine decimal places based on currency
  let decimals = 2;
  const noDecimalCurrencies = ['JPY', 'KRW', 'VND', 'IDR', 'CLP', 'HUF', 'ISK'];
  if (noDecimalCurrencies.includes(currency)) {
    decimals = 0;
  } else if (num >= 1000) {
    decimals = 2;
  } else if (num >= 100) {
    decimals = 2;
  } else if (num >= 1) {
    decimals = 2;
  } else {
    decimals = 4;
  }

  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// =============================================
// COMPARE LIST
// =============================================

function renderCompareList() {
  const { amount, homeCurrency, compareCurrencies, rates, currencies } = state;

  elements.compareList.innerHTML = compareCurrencies.map(code => {
    const currency = currencies[code];
    if (!currency || !rates[code]) return '';

    const amountInUsd = amount / rates[homeCurrency];
    const converted = amountInUsd * rates[code];
    const rate = rates[code] / rates[homeCurrency];

    return `
      <div class="compare-card" data-currency="${code}">
        <span class="compare-flag">${currency.flag}</span>
        <div class="compare-info">
          <div class="compare-currency">${code}</div>
          <div class="compare-name">${currency.name}</div>
        </div>
        <div class="compare-value">
          <div class="compare-amount">${currency.symbol}${formatNumber(converted, code)}</div>
          <div class="compare-rate">1 ${homeCurrency} = ${formatNumber(rate, code)}</div>
        </div>
        <button class="compare-remove" onclick="removeCompare('${code}')" aria-label="Remove ${code}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');
}

function removeCompare(code) {
  state.compareCurrencies = state.compareCurrencies.filter(c => c !== code);
  saveState();
  renderCompareList();
}

function addCompare(code) {
  if (!state.compareCurrencies.includes(code)) {
    state.compareCurrencies.push(code);
    saveState();
    renderCompareList();
  }
}

// Make removeCompare globally accessible
window.removeCompare = removeCompare;

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

  const filtered = entries.filter(([code, currency]) => {
    if (!filter) return true;
    return code.toLowerCase().includes(filterLower) ||
           currency.name.toLowerCase().includes(filterLower);
  });

  // Sort by most commonly used first
  const commonCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];
  filtered.sort((a, b) => {
    const aCommon = commonCurrencies.indexOf(a[0]);
    const bCommon = commonCurrencies.indexOf(b[0]);
    if (aCommon !== -1 && bCommon !== -1) return aCommon - bCommon;
    if (aCommon !== -1) return -1;
    if (bCommon !== -1) return 1;
    return a[1].name.localeCompare(b[1].name);
  });

  elements.currencyList.innerHTML = filtered.map(([code, currency]) => `
    <div class="currency-item" data-code="${code}">
      <span class="flag">${currency.flag}</span>
      <span class="code">${code}</span>
      <span class="name">${currency.name}</span>
    </div>
  `).join('');

  // Add click listeners
  elements.currencyList.querySelectorAll('.currency-item').forEach(item => {
    item.addEventListener('click', () => selectCurrency(item.dataset.code));
  });
}

function filterCurrencies(e) {
  renderCurrencyList(e.target.value);
}

function selectCurrency(code) {
  switch (currentModalContext) {
    case 'from':
      state.fromCurrency = code;
      break;
    case 'to':
      state.toCurrency = code;
      break;
    case 'compare':
      state.homeCurrency = code;
      state.fromCurrency = code;
      break;
    case 'home':
      state.homeCurrency = code;
      state.fromCurrency = code;
      break;
    case 'addCompare':
      addCompare(code);
      break;
  }

  saveState();
  closeCurrencyModal();
  render();
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

  const filtered = entries.filter(([country]) => {
    if (!filter) return true;
    return country.toLowerCase().includes(filterLower);
  });

  // Sort alphabetically
  filtered.sort((a, b) => a[0].localeCompare(b[0]));

  elements.destinationList.innerHTML = filtered.map(([country, data]) => {
    const currency = state.currencies[data.currency];
    const flag = currency ? currency.flag : '🌍';
    return `
      <div class="destination-item" data-country="${country}">
        <span class="flag">${flag}</span>
        <span class="name">${country}</span>
      </div>
    `;
  }).join('');

  // Add click listeners
  elements.destinationList.querySelectorAll('.destination-item').forEach(item => {
    item.addEventListener('click', () => selectDestination(item.dataset.country));
  });
}

function filterDestinations(e) {
  renderDestinationList(e.target.value);
}

function selectDestination(country) {
  state.destinationCountry = country;
  const countryData = state.countries[country];
  if (countryData) {
    state.destinationCurrency = countryData.currency;
    state.toCurrency = countryData.currency;

    // Add destination currency to compare if not there
    if (!state.compareCurrencies.includes(countryData.currency)) {
      state.compareCurrencies.unshift(countryData.currency);
      // Keep USD in compare list
      if (!state.compareCurrencies.includes('USD') && countryData.currency !== 'USD') {
        state.compareCurrencies.push('USD');
      }
    }
  }

  saveState();
  closeDestinationModal();
  render();
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
    elements.homeSettingFlag.textContent = home.flag;
    elements.homeSettingCode.textContent = state.homeCurrency;
    elements.homeSettingName.textContent = home.name;
  }

  if (state.destinationCountry) {
    const countryData = state.countries[state.destinationCountry];
    const currency = state.currencies[countryData?.currency];
    elements.destSettingFlag.textContent = currency?.flag || '🌍';
    elements.destSettingName.textContent = state.destinationCountry;
  } else {
    elements.destSettingFlag.textContent = '🌍';
    elements.destSettingName.textContent = 'Select destination';
  }

  elements.showUsdToggle.checked = state.showUsdEquivalent;
  elements.settingsLastUpdated.textContent = formatLastUpdated();
}

// =============================================
// SCAMS/SAFETY
// =============================================

function renderScams() {
  // General scams
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

  // Destination scams
  if (state.destinationCountry && state.scams.countries) {
    const countryScams = state.scams.countries[state.destinationCountry];

    if (countryScams) {
      elements.destinationSection.style.display = 'block';
      elements.destTitleFlag.textContent = countryScams.flag || '';
      elements.destTitleText.textContent = `${state.destinationCountry} Safety`;

      // Tips
      if (countryScams.tips) {
        elements.countryTips.innerHTML = `
          <ul>
            ${countryScams.tips.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
        `;
      }

      // Country-specific scams
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

  // Update destination button
  if (state.destinationCountry) {
    const countryData = state.countries[state.destinationCountry];
    const currency = state.currencies[countryData?.currency];
    elements.destFlag.textContent = currency?.flag || '🌍';
    elements.destName.textContent = state.destinationCountry;
  } else {
    elements.destFlag.textContent = '🌍';
    elements.destName.textContent = 'Select Destination';
  }
}

// =============================================
// EXCHANGE RATE UPDATES
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
    convert();
    renderCompareList();

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
  const timeSinceUpdate = now - lastUpdate;

  if (timeSinceUpdate > RATE_UPDATE_INTERVAL) {
    updateExchangeRates();
  }
}

function updateRateStatus() {
  elements.lastUpdated.textContent = formatLastUpdated();
  elements.settingsLastUpdated.textContent = formatLastUpdated();

  const indicator = document.querySelector('.status-indicator');
  indicator.classList.remove('updating');

  if (navigator.onLine) {
    indicator.classList.add('online');
    indicator.classList.remove('offline');
  } else {
    indicator.classList.add('offline');
    indicator.classList.remove('online');
  }
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
  // Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return; // Already installed
  }

  // Check if dismissed recently
  const dismissed = localStorage.getItem('a2hsDismissed');
  if (dismissed) {
    const dismissedTime = new Date(dismissed);
    const now = new Date();
    const hoursSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60);
    if (hoursSinceDismissed < 24) {
      return; // Don't show again for 24 hours
    }
  }

  // iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

  if (isIOS && isSafari && !navigator.standalone) {
    // Show iOS instructions after a delay
    setTimeout(() => {
      elements.iosA2hsModal.classList.add('active');
    }, 3000);
  }
}

function showA2hsBanner() {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return;
  }
  elements.a2hsBanner.classList.add('active');
}

async function installApp() {
  if (!deferredPrompt) {
    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      elements.a2hsBanner.classList.remove('active');
      elements.iosA2hsModal.classList.add('active');
    }
    return;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === 'accepted') {
    showToast('App installed! Find it on your home screen.');
  }

  deferredPrompt = null;
  elements.a2hsBanner.classList.remove('active');
}

function dismissA2hs() {
  elements.a2hsBanner.classList.remove('active');
  localStorage.setItem('a2hsDismissed', new Date().toISOString());
}

// =============================================
// SERVICE WORKER
// =============================================

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('sw.js');
      console.log('Service Worker registered:', registration);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('New version available! Refresh to update.');
          }
        });
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

// =============================================
// TOAST NOTIFICATIONS
// =============================================

function showToast(message, duration = 3000) {
  elements.toastMessage.textContent = message;
  elements.toast.classList.add('active');

  setTimeout(() => {
    elements.toast.classList.remove('active');
  }, duration);
}

// =============================================
// RENDER
// =============================================

function render() {
  updateCurrencyDisplay();
  convert();
  renderCompareList();
  renderScams();
  updateRateStatus();
  updateSettingsDisplay();
}

// =============================================
// ONLINE/OFFLINE DETECTION
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
// START APPLICATION
// =============================================

document.addEventListener('DOMContentLoaded', init);
