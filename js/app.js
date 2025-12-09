/**
 * Holibobs - Travel Money App
 * Compare prices in local currency vs your home currency
 */

// =============================================
// STATE & CONFIGURATION
// =============================================

const APP_VERSION = '2.1.0';
const RATE_UPDATE_INTERVAL = 24 * 60 * 60 * 1000;
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

let state = {
  homeCurrency: 'GBP',
  destinationCountry: null,
  localCurrency: 'MXN',
  altCurrency: 'USD',
  localAmount: 500,
  altAmount: 30,
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
  // Tabs
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),

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
  dealIndicator: document.getElementById('dealIndicator'),
  dealText: document.getElementById('dealText'),
  quickAmounts: document.getElementById('quickAmounts'),
  altPriceCard: document.getElementById('altPriceCard'),

  // Lock toggle and surcharge
  lockToggleBtn: document.getElementById('lockToggleBtn'),
  lockIcon: document.getElementById('lockIcon'),
  lockText: document.getElementById('lockText'),
  surchargeToggleBtn: document.getElementById('surchargeToggleBtn'),
  surchargeRow: document.getElementById('surchargeRow'),
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
  toastMessage: document.getElementById('toastMessage'),

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
// INITIALIZATION
// =============================================

async function init() {
  initTheme();
  checkFirstLoad();
  loadState();
  await loadDataFiles();
  setupEventListeners();
  displayVersion();

  if (isFirstLoad) {
    showSetupWizard();
    detectUserLocation(true); // On first load, detect for setup wizard
  } else {
    render();
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
    elements.setupHomeFlag.textContent = home.flag;
    elements.setupHomeCode.textContent = state.homeCurrency;
    elements.setupHomeName.textContent = home.name;
  }

  if (state.destinationCountry) {
    const countryData = state.countries[state.destinationCountry];
    const currency = state.currencies[countryData?.currency];
    elements.setupDestFlag.textContent = currency?.flag || '🌍';
    elements.setupDestName.textContent = state.destinationCountry;
  } else {
    elements.setupDestFlag.textContent = '🌍';
    elements.setupDestName.textContent = 'Tap to select destination';
  }
}

function completeSetup() {
  localStorage.setItem('holibobsSetupComplete', 'true');
  elements.setupModal.classList.remove('active');
  saveState();
  render();
  showToast('Welcome to Holibobs! 🦝');
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
  // Tab navigation
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

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

  // Destination (Safety tab)
  elements.destinationBtn.addEventListener('click', () => openDestinationModal('safety'));

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

  // Refresh rates
  elements.refreshRatesBtn.addEventListener('click', updateExchangeRates);

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
  elements.themeToggleBtn.addEventListener('click', toggleTheme);

  // Location banner
  elements.locationYesBtn.addEventListener('click', acceptLocationSuggestion);
  elements.locationNoBtn.addEventListener('click', dismissLocationSuggestion);

  // Update banner
  elements.updateBtn.addEventListener('click', applyUpdate);

  // Lock toggle
  elements.lockToggleBtn.addEventListener('click', togglePriceLock);

  // Surcharge controls
  elements.surchargeToggleBtn.addEventListener('click', toggleSurchargeRow);
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
// PRICE CALCULATION
// =============================================

function adjustPrice(target, direction) {
  const currentAmount = target === 'local' ? state.localAmount : state.altAmount;
  let step = 10;
  if (currentAmount >= 1000) step = 100;
  else if (currentAmount >= 100) step = 50;
  else if (currentAmount >= 50) step = 10;
  else step = 5;

  let newAmount = currentAmount + (direction * step);
  if (newAmount < 0) newAmount = 0;

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

  if (state.pricesLocked) {
    // Sync alt to local when locking
    syncLockedPrices('local');
    calculatePrices();
    showToast('Prices linked at exchange rate');
  } else {
    showToast('Prices unlocked');
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
    elements.lockText.textContent = 'Lock prices';
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
    // Calculate alt from local
    state.altAmount = Math.round(state.localAmount * localToAlt * 100) / 100;
    elements.altAmountInput.value = state.altAmount;
  } else {
    // Calculate local from alt
    state.localAmount = Math.round(state.altAmount / localToAlt * 100) / 100;
    elements.localAmountInput.value = state.localAmount;
  }
}

function toggleSurchargeRow() {
  elements.surchargeRow.classList.toggle('hidden');
  if (elements.surchargeRow.classList.contains('hidden')) {
    state.surchargeAmount = 0;
    elements.surchargeInput.value = 0;
    calculatePrices();
  }
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

  // Convert local price to home currency
  const localInUsd = localAmount / rates[localCurrency];
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

  // Show surcharge indication if applicable
  if (surchargeAmount > 0) {
    const surchargeLabel = surchargeType === 'percent' ? `+${surchargeAmount}%` : `+${homeSymbol}${surchargeAmount}`;
    elements.altHomeAmount.textContent = `${homeSymbol}${formatNumber(altInHome, homeCurrency)} (${surchargeLabel})`;
  } else {
    elements.altHomeAmount.textContent = `${homeSymbol}${formatNumber(altInHome, homeCurrency)}`;
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
    const flag = currency ? currency.flag : '🌍';
    const inWallet = state.walletCountries.includes(country);
    return `
      <div class="destination-item" data-country="${country}">
        <span class="flag">${flag}</span>
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
    const flag = currency ? currency.flag : '🌍';
    return `
      <div class="wallet-item" data-country="${country}">
        <span class="flag">${flag}</span>
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

  elements.currencyList.innerHTML = filtered.map(([code, currency]) => `
    <div class="currency-item" data-code="${code}">
      <span class="flag">${currency.flag}</span>
      <span class="code">${code}</span>
      <span class="name">${currency.name}</span>
    </div>
  `).join('');

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

  elements.settingsLastUpdated.textContent = formatLastUpdated();
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

  // Update safety tab destination button
  if (state.destinationCountry) {
    const countryData = state.countries[state.destinationCountry];
    const currency = state.currencies[countryData?.currency];
    elements.destFlag.textContent = currency?.flag || '🌍';
    elements.destName.textContent = state.destinationCountry;
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
  let newTheme;

  if (currentTheme === 'dark') {
    newTheme = 'light';
    showToast('Day mode - high contrast for sunny days!');
  } else {
    newTheme = 'dark';
    showToast('Night mode enabled');
  }

  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('holibobsTheme', newTheme);
}

// =============================================
// GEOLOCATION & LOCATION SUGGESTION
// =============================================

// Country coordinates (approximate centers, adjusted for tourist areas)
const COUNTRY_COORDS = {
  'Spain': { lat: 40.4, lng: -3.7 },
  'France': { lat: 46.2, lng: 2.2 },
  'Italy': { lat: 41.9, lng: 12.5 },
  'Germany': { lat: 51.2, lng: 10.5 },
  'Portugal': { lat: 39.4, lng: -8.2 },
  'Greece': { lat: 39.1, lng: 21.8 },
  'Netherlands': { lat: 52.1, lng: 5.3 },
  'Belgium': { lat: 50.5, lng: 4.5 },
  'United Kingdom': { lat: 55.4, lng: -3.4 },
  'Ireland': { lat: 53.1, lng: -8.0 },
  'Mexico': { lat: 21.5, lng: -88.0 }, // Adjusted toward Yucatan/Cancun tourist area
  'United States': { lat: 37.1, lng: -95.7 },
  'Canada': { lat: 56.1, lng: -106.3 },
  'Australia': { lat: -25.3, lng: 133.8 },
  'New Zealand': { lat: -40.9, lng: 174.9 },
  'Japan': { lat: 36.2, lng: 138.3 },
  'Thailand': { lat: 15.9, lng: 100.9 },
  'Indonesia': { lat: -0.8, lng: 113.9 },
  'Malaysia': { lat: 4.2, lng: 101.9 },
  'Singapore': { lat: 1.4, lng: 103.8 },
  'Philippines': { lat: 12.9, lng: 121.8 },
  'Vietnam': { lat: 14.1, lng: 108.3 },
  'South Korea': { lat: 35.9, lng: 128.0 },
  'China': { lat: 35.9, lng: 104.2 },
  'India': { lat: 20.6, lng: 79.0 },
  'UAE': { lat: 23.4, lng: 53.8 },
  'Turkey': { lat: 38.9, lng: 35.2 },
  'Egypt': { lat: 26.8, lng: 30.8 },
  'South Africa': { lat: -30.6, lng: 22.9 },
  'Morocco': { lat: 31.8, lng: -7.1 },
  'Brazil': { lat: -14.2, lng: -51.9 },
  'Argentina': { lat: -38.4, lng: -63.6 },
  'Chile': { lat: -35.7, lng: -71.5 },
  'Colombia': { lat: 4.6, lng: -74.3 },
  'Peru': { lat: -9.2, lng: -75.0 },
  'Costa Rica': { lat: 9.7, lng: -83.8 },
  'Switzerland': { lat: 46.8, lng: 8.2 },
  'Austria': { lat: 47.5, lng: 14.6 },
  'Czech Republic': { lat: 49.8, lng: 15.5 },
  'Poland': { lat: 51.9, lng: 19.1 },
  'Hungary': { lat: 47.2, lng: 19.5 },
  'Croatia': { lat: 45.1, lng: 15.2 },
  'Denmark': { lat: 56.3, lng: 9.5 },
  'Sweden': { lat: 60.1, lng: 18.6 },
  'Norway': { lat: 60.5, lng: 8.5 },
  'Finland': { lat: 61.9, lng: 25.7 },
  'Iceland': { lat: 64.9, lng: -19.0 },
  'Cuba': { lat: 21.5, lng: -77.8 },
  'Dominican Republic': { lat: 18.7, lng: -70.2 },
  'Jamaica': { lat: 18.1, lng: -77.3 },
  'Bahamas': { lat: 25.0, lng: -77.4 },
  'Maldives': { lat: 3.2, lng: 73.2 },
  'Sri Lanka': { lat: 7.9, lng: 80.8 },
  'Nepal': { lat: 28.4, lng: 84.1 },
  'Cambodia': { lat: 12.6, lng: 105.0 },
  'Bali': { lat: -8.3, lng: 115.1 }, // Part of Indonesia but popular destination
  'Hong Kong': { lat: 22.4, lng: 114.1 },
  'Taiwan': { lat: 23.7, lng: 121.0 },
  'Russia': { lat: 61.5, lng: 105.3 },
  'Kenya': { lat: -0.0, lng: 37.9 },
  'Tanzania': { lat: -6.4, lng: 34.9 },
  'Israel': { lat: 31.0, lng: 34.9 },
  'Jordan': { lat: 30.6, lng: 36.2 },
  'Qatar': { lat: 25.4, lng: 51.2 },
  'Saudi Arabia': { lat: 23.9, lng: 45.1 },
  'Oman': { lat: 21.5, lng: 55.9 },
  'Mauritius': { lat: -20.3, lng: 57.6 },
  'Seychelles': { lat: -4.7, lng: 55.5 },
  'Fiji': { lat: -17.7, lng: 178.1 }
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

        if (isSetup) {
          // Auto-suggest in setup wizard
          state.destinationCountry = nearestCountry;
          const countryData = state.countries[nearestCountry];
          if (countryData) {
            state.localCurrency = countryData.currency;
            if (countryData.alsoAccepted && countryData.alsoAccepted.length > 0) {
              state.altCurrency = countryData.alsoAccepted[0];
            }
          }
          saveState(); // Save the detected location
          updateSetupDisplay();
          showToast(`Looks like you're in ${nearestCountry}!`);
        }
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

  for (const [country, coords] of Object.entries(COUNTRY_COORDS)) {
    // Simple distance calculation (good enough for country-level)
    const distance = Math.sqrt(
      Math.pow(lat - coords.lat, 2) + Math.pow(lng - coords.lng, 2)
    );

    // Only match if reasonably close (within ~500km rough estimate)
    if (distance < minDistance && distance < 10) {
      minDistance = distance;
      nearest = country;
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

  const currency = state.currencies[countryData.currency];
  const flag = currency?.flag || '🌍';

  elements.locationBannerTitle.textContent = `Are you visiting ${country}?`;
  elements.locationBannerFlag.textContent = flag;

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
    // Fallback: just reload
    window.location.reload();
  }
}

// =============================================
// TOAST
// =============================================

function showToast(message, duration = 3000) {
  elements.toastMessage.textContent = message;
  elements.toast.classList.add('active');
  setTimeout(() => elements.toast.classList.remove('active'), duration);
}

// =============================================
// RENDER
// =============================================

function render() {
  // Update destination header
  if (state.destinationCountry) {
    const countryData = state.countries[state.destinationCountry];
    const currency = state.currencies[countryData?.currency];
    elements.destHeaderFlag.textContent = currency?.flag || '🌴';
    elements.destHeaderName.textContent = state.destinationCountry;
  } else {
    elements.destHeaderFlag.textContent = '🌴';
    elements.destHeaderName.textContent = 'Tap to select destination';
  }

  // Update price card currencies
  const localInfo = state.currencies[state.localCurrency];
  const altInfo = state.currencies[state.altCurrency];
  const homeInfo = state.currencies[state.homeCurrency];

  elements.localFlag.textContent = localInfo?.flag || '💱';
  elements.localCurrency.textContent = `${localInfo?.symbol || ''} ${state.localCurrency}`;
  elements.altFlag.textContent = altInfo?.flag || '💱';
  elements.altCurrency.textContent = `${altInfo?.symbol || ''} ${state.altCurrency}`;

  elements.localHomeFlag.textContent = homeInfo?.flag || '🏠';
  elements.altHomeFlag.textContent = homeInfo?.flag || '🏠';

  // Set input values
  elements.localAmountInput.value = state.localAmount;
  elements.altAmountInput.value = state.altAmount;

  // Show/hide alt card based on destination
  const countryInfo = state.destinationCountry ? state.countries[state.destinationCountry] : null;
  const hasAltCurrency = countryInfo?.alsoAccepted && countryInfo.alsoAccepted.length > 0;
  elements.altPriceCard.style.display = hasAltCurrency || !state.destinationCountry ? 'block' : 'none';

  updateQuickAmounts();
  updateLockUI();
  updateSurchargeUI();
  calculatePrices();
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
// START
// =============================================

document.addEventListener('DOMContentLoaded', init);
