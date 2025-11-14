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

function toggleDescription(id, type) {
  const content = document.getElementById('desc-' + type + '-' + id);
  const toggle = document.getElementById('toggle-' + type + '-' + id);
  
  const isExpanded = content.classList.contains('show');
  content.classList.toggle('show');
  toggle.classList.toggle('open');
  toggle.setAttribute('aria-expanded', !isExpanded);
}

function completeTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo && confirm('Tandai kegiatan ini sebagai selesai?')) {
    todo.completedDate = new Date().toISOString();
    completedTodos.push(todo);
    todos = todos.filter(t => t.id !== id);
    
    saveData();
    showAlert('🎉 Selamat! Kegiatan berhasil diselesaikan!');
    updateCounts();
    renderTodos();
  }
}

function restoreTodo(id) {
  const todo = completedTodos.find(t => t.id === id);
  if (todo && confirm('Kembalikan kegiatan ini ke daftar aktif?')) {
    delete todo.completedDate;
    todos.push(todo);
    completedTodos = completedTodos.filter(t => t.id !== id);
    
    saveData();
    showAlert('↩️ Kegiatan dikembalikan ke daftar aktif!');
    updateCounts();
    renderHistory();
  }
}

function deleteFromHistory(id) {
  if (confirm('Hapus permanen dari histori?')) {
    completedTodos = completedTodos.filter(t => t.id !== id);
    
    saveData();
    showAlert('🗑️ Kegiatan dihapus dari histori!');
    updateCounts();
    renderHistory();
  }
}

function renderTodos() {
  const todoList = document.getElementById('todoList');
  let filteredTodos = [...todos];
  
  if (currentFilter !== 'semua') {
    filteredTodos = filteredTodos.filter(t => t.priority === currentFilter);
  }

  filteredTodos.sort((a, b) => {
    if (currentSort === 'priority') {
      const priorityOrder = { 'penting': 0, 'lumayan': 1, 'tidak': 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    } else if (currentSort === 'date-asc') {
      return new Date(a.schedule) - new Date(b.schedule);
    } else if (currentSort === 'date-desc') {
      return new Date(b.schedule) - new Date(a.schedule);
    }
    return 0;
  });

  if (filteredTodos.length === 0) {
    todoList.innerHTML = '<div class="empty-state" role="status"><h3>📝 Belum ada kegiatan</h3><p>Tambahkan kegiatan baru untuk memulai produktivitas Anda</p></div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  
  filteredTodos.forEach((todo, index) => {
    const date = new Date(todo.schedule);
    const formattedDate = date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const priorityText = {
      'penting': 'Penting',
      'lumayan': 'Lumayan',
      'tidak': 'Tidak Terlalu'
    };

    const hasDescription = todo.description && todo.description.trim() !== '';

    const card = document.createElement('article');
    card.className = 'todo-card priority-' + todo.priority;
    card.setAttribute('role', 'listitem');
    card.setAttribute('data-id', todo.id);
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';

    card.innerHTML = '<div class="card-header"><h3 class="card-title">' + escapeHtml(todo.activity) + '</h3><div class="badges-container"><span class="priority-badge badge-' + todo.priority + '">' + priorityText[todo.priority] + '</span></div></div><div class="card-meta"><time class="card-date" datetime="' + todo.schedule + '">' + formattedDate + '</time></div>' + (hasDescription ? '<button class="card-toggle" id="toggle-active-' + todo.id + '" onclick="toggleDescription(' + todo.id + ', \'active\')" aria-expanded="false" aria-controls="desc-active-' + todo.id + '">📄 Lihat Detail<span class="arrow">▼</span></button><div class="card-description" id="desc-active-' + todo.id + '">' + escapeHtml(todo.description).replace(/\n/g, '<br>') + '</div>' : '') + '<div class="card-actions" role="group" aria-label="Aksi kegiatan ' + escapeHtml(todo.activity) + '"><button class="btn btn-success" onclick="completeTodo(' + todo.id + ')" aria-label="Tandai selesai: ' + escapeHtml(todo.activity) + '">✓ Selesai</button><button class="btn btn-edit" onclick="editTodo(' + todo.id + ')" aria-label="Edit kegiatan: ' + escapeHtml(todo.activity) + '">Edit</button><button class="btn btn-delete" onclick="deleteTodo(' + todo.id + ')" aria-label="Hapus kegiatan: ' + escapeHtml(todo.activity) + '">Hapus</button></div>';
    
    fragment.appendChild(card);
    
    const delays = [0, 80, 140, 180, 240, 280, 340];
    const delay = delays[index % delays.length];
    
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease-out, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, delay);
  });
  
  todoList.innerHTML = '';
  todoList.appendChild(fragment);
}

function renderHistory() {
  const historyList = document.getElementById('historyList');
  
  document.getElementById('totalCompleted').textContent = completedTodos.length;
  
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thisWeekCount = completedTodos.filter(t => new Date(t.completedDate) >= oneWeekAgo).length;
  document.getElementById('thisWeek').textContent = thisWeekCount;

  if (completedTodos.length === 0) {
    historyList.innerHTML = '<div class="empty-state" role="status"><h3>📭 Belum ada kegiatan selesai</h3><p>Selesaikan kegiatan untuk melihat histori pencapaian Anda</p></div>';
    return;
  }

  const sortedCompleted = [...completedTodos].sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate));

  const fragment = document.createDocumentFragment();

  sortedCompleted.forEach((todo, index) => {
    const scheduleDate = new Date(todo.schedule);
    const completedDate = new Date(todo.completedDate);
    
    const formattedSchedule = scheduleDate.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const formattedCompleted = completedDate.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const priorityText = {
      'penting': 'Penting',
      'lumayan': 'Lumayan',
      'tidak': 'Tidak Terlalu'
    };

    const hasDescription = todo.description && todo.description.trim() !== '';

    const card = document.createElement('article');
    card.className = 'todo-card completed';
    card.setAttribute('role', 'listitem');
    card.setAttribute('data-id', todo.id);

    card.innerHTML = '<div class="card-header"><h3 class="card-title">' + escapeHtml(todo.activity) + '</h3><div class="badges-container"><span class="completed-badge">Selesai</span><span class="priority-badge badge-' + todo.priority + '">' + priorityText[todo.priority] + '</span></div></div><div class="card-meta"><time class="card-date" datetime="' + todo.schedule + '">' + formattedSchedule + '</time></div><time class="completed-date" datetime="' + todo.completedDate + '">Diselesaikan: ' + formattedCompleted + '</time>' + (hasDescription ? '<button class="card-toggle" id="toggle-history-' + todo.id + '" onclick="toggleDescription(' + todo.id + ', \'history\')" aria-expanded="false" aria-controls="desc-history-' + todo.id + '">📄 Lihat Detail<span class="arrow">▼</span></button><div class="card-description" id="desc-history-' + todo.id + '">' + escapeHtml(todo.description).replace(/\n/g, '<br>') + '</div>' : '') + '<div class="card-actions" role="group" aria-label="Aksi kegiatan ' + escapeHtml(todo.activity) + '"><button class="btn btn-restore" onclick="restoreTodo(' + todo.id + ')" aria-label="Kembalikan kegiatan: ' + escapeHtml(todo.activity) + '">↩️ Kembalikan</button><button class="btn btn-delete" onclick="deleteFromHistory(' + todo.id + ')" aria-label="Hapus permanen: ' + escapeHtml(todo.activity) + '">Hapus</button></div>';
    
    fragment.appendChild(card);
  });
  
  historyList.innerHTML = '';
  historyList.appendChild(fragment);
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

document.getElementById('todoForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const activity = document.getElementById('activity').value.trim();
  const description = document.getElementById('description').value.trim();
  const schedule = document.getElementById('schedule').value;
  const priority = document.getElementById('priority').value;

  let isValid = true;

  if (!activity) {
    setFieldError('activity', 'Judul kegiatan wajib diisi');
    isValid = false;
  } else {
    clearFieldError('activity');
  }

  if (!schedule) {
    setFieldError('schedule', 'Jadwal wajib diisi');
    isValid = false;
  } else {
    clearFieldError('schedule');
  }

  if (!priority) {
    setFieldError('priority', 'Prioritas wajib dipilih');
    isValid = false;
  } else {
    clearFieldError('priority');
  }

  if (!isValid) return;

  if (editingId !== null) {
    const index = todos.findIndex(t => t.id === editingId);
    if (index !== -1) {
      todos[index] = {
        id: editingId,
        activity,
        description,
        schedule,
        priority
      };
    }
    editingId = null;
    document.getElementById('submitBtn').querySelector('.btn-text').textContent = 'Tambah Kegiatan';
    showAlert('✅ Kegiatan berhasil diupdate!');
  } else {
    const newTodo = {
      id: Date.now(),
      activity,
      description,
      schedule,
      priority
    };
    todos.push(newTodo);
    showAlert('✅ Kegiatan berhasil ditambahkan!');
  }

  saveData();
  this.reset();
  updateCharCount();
  updateCounts();
  renderTodos();
});

function setFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const error = document.getElementById(fieldId + '-error');
  
  input.classList.add('error');
  input.setAttribute('aria-invalid', 'true');
  if (error) {
    error.textContent = message;
  }
}

function clearFieldError(fieldId) {
  const input = document.getElementById(fieldId);
  const error = document.getElementById(fieldId + '-error');
  
  input.classList.remove('error');
  input.setAttribute('aria-invalid', 'false');
  if (error) {
    error.textContent = '';
  }
}

function editTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    document.getElementById('activity').value = todo.activity;
    document.getElementById('description').value = todo.description || '';
    document.getElementById('schedule').value = todo.schedule;
    document.getElementById('priority').value = todo.priority;
    document.getElementById('submitBtn').querySelector('.btn-text').textContent = 'Update Kegiatan';
    editingId = id;
    
    updateCharCount();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setTimeout(() => {
      document.getElementById('activity').focus();
    }, 300);
  }
}

function deleteTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo && confirm('Apakah Anda yakin ingin menghapus kegiatan "' + todo.activity + '"?')) {
    todos = todos.filter(t => t.id !== id);
    
    saveData();
    showAlert('🗑️ Kegiatan berhasil dihapus!');
    updateCounts();
    renderTodos();
  }
}

function filterTodos(filter) {
  currentFilter = filter;
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    const isActive = btn.dataset.filter === filter;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive);
  });
  
  renderTodos();
}

function sortTodos(sort) {
  currentSort = sort;
  
  document.querySelectorAll('.sort-btn').forEach(btn => {
    const isActive = btn.dataset.sort === sort;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive);
  });
  
  renderTodos();
}

function updateCharCount() {
  const description = document.getElementById('description');
  const charCount = document.querySelector('.char-count');
  if (description && charCount) {
    charCount.textContent = description.value.length + ' / 500';
  }
}

document.getElementById('description').addEventListener('input', debounce(updateCharCount, 100));

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.tab);
  });
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    filterTodos(btn.dataset.filter);
  });
});

document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    sortTodos(btn.dataset.sort);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (editingId !== null) {
      editingId = null;
      document.getElementById('todoForm').reset();
      document.getElementById('submitBtn').querySelector('.btn-text').textContent = 'Tambah Kegiatan';
      updateCharCount();
    }
  }
  
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('activity').focus();
  }
});

loadData();
renderTodos();