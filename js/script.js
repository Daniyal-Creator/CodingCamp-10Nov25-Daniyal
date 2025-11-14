let todos = [];
let completedTodos = [];
let editingId = null;
let currentFilter = 'semua';
let currentSort = 'priority';
let currentTab = 'active';

const CACHE_KEY = 'todos_cache';
const COMPLETED_KEY = 'completed_cache';
const CACHE_EXPIRY = 1000 * 60 * 60;

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showAlert(message) {
  const alertBox = document.getElementById('alertBox');
  alertBox.textContent = message;
  alertBox.className = 'alert success';
  alertBox.style.display = 'block';
  
  setTimeout(() => {
    alertBox.style.display = 'none';
  }, 3500);
}

function getCachedData(key) {
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  
  try {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
}

function setCachedData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

function loadData() {
  const cachedTodos = getCachedData(CACHE_KEY);
  const cachedCompleted = getCachedData(COMPLETED_KEY);
  
  if (cachedTodos) todos = cachedTodos;
  if (cachedCompleted) completedTodos = cachedCompleted;
  
  updateCounts();
  renderTodos();
}

function saveData() {
  setCachedData(CACHE_KEY, todos);
  setCachedData(COMPLETED_KEY, completedTodos);
}

function updateCounts() {
  const countSemua = todos.length;
  const countPenting = todos.filter(t => t.priority === 'penting').length;
  const countLumayan = todos.filter(t => t.priority === 'lumayan').length;
  const countTidak = todos.filter(t => t.priority === 'tidak').length;
  
  document.getElementById('count-semua').textContent = countSemua;
  document.getElementById('count-penting').textContent = countPenting;
  document.getElementById('count-lumayan').textContent = countLumayan;
  document.getElementById('count-tidak').textContent = countTidak;
  
  document.getElementById('activeBadge').textContent = countSemua;
  document.getElementById('historyBadge').textContent = completedTodos.length;
}

function switchTab(tab) {
  currentTab = tab;
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });
  
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
    content.hidden = true;
  });
  
  if (tab === 'active') {
    const activePanel = document.getElementById('panel-active');
    activePanel.classList.add('active');
    activePanel.hidden = false;
  } else {
    const historyPanel = document.getElementById('panel-history');
    historyPanel.classList.add('active');
    historyPanel.hidden = false;
    renderHistory();
  }
}