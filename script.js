const STORAGE_KEYS = {
  tasks: 'todo.tasks',
  categories: 'todo.categories',
  theme: 'todo.theme',
  preferences: 'todo.preferences'
};

const DEFAULT_CATEGORIES = ['General'];
const PRIORITY_WEIGHT = { High: 3, Medium: 2, Low: 1 };

const state = {
  tasks: [],
  categories: [...DEFAULT_CATEGORIES],
  preferences: {
    status: 'All',
    priority: 'All',
    category: 'All',
    sortBy: 'createdAt',
    search: ''
  },
  deletedTask: null,
  deleteTimerId: null
};

const els = {
  html: document.documentElement,
  taskForm: document.getElementById('task-form'),
  title: document.getElementById('title'),
  description: document.getElementById('description'),
  priority: document.getElementById('priority'),
  dueDate: document.getElementById('due-date'),
  category: document.getElementById('category'),
  newCategory: document.getElementById('new-category'),
  addCategory: document.getElementById('add-category'),
  categoryList: document.getElementById('category-list'),
  taskList: document.getElementById('task-list'),
  emptyState: document.getElementById('empty-state'),
  statusFilter: document.getElementById('status-filter'),
  priorityFilter: document.getElementById('priority-filter'),
  categoryFilter: document.getElementById('category-filter'),
  sortBy: document.getElementById('sort-by'),
  search: document.getElementById('search'),
  stats: document.getElementById('stats'),
  themeToggle: document.getElementById('theme-toggle'),
  modal: document.getElementById('task-modal'),
  modalForm: document.getElementById('modal-form'),
  modalTaskId: document.getElementById('modal-task-id'),
  modalTitle: document.getElementById('modal-title-input'),
  modalDescription: document.getElementById('modal-description'),
  modalPriority: document.getElementById('modal-priority'),
  modalDueDate: document.getElementById('modal-due-date'),
  modalCategory: document.getElementById('modal-category'),
  modalDelete: document.getElementById('modal-delete'),
  modalClose: document.getElementById('modal-close'),
  modalSave: document.getElementById('modal-save'),
  modalHeaderTitle: document.getElementById('modal-title'),
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message'),
  undoDelete: document.getElementById('undo-delete')
};

function safeParse(json, fallback) {
  try {
    return json ? JSON.parse(json) : fallback;
  } catch {
    return fallback;
  }
}

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function persist() {
  localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(state.tasks));
  localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(state.categories));
  localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(state.preferences));
}

function loadState() {
  state.tasks = safeParse(localStorage.getItem(STORAGE_KEYS.tasks), []);
  const categories = safeParse(localStorage.getItem(STORAGE_KEYS.categories), DEFAULT_CATEGORIES);
  state.categories = [...new Set([...DEFAULT_CATEGORIES, ...categories.filter(Boolean)])];

  const loadedPreferences = safeParse(localStorage.getItem(STORAGE_KEYS.preferences), state.preferences);
  state.preferences = {
    ...state.preferences,
    ...loadedPreferences
  };

  const theme = localStorage.getItem(STORAGE_KEYS.theme) || 'light';
  setTheme(theme);
}

function setTheme(theme) {
  const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
  els.html.setAttribute('data-theme', normalizedTheme);
  localStorage.setItem(STORAGE_KEYS.theme, normalizedTheme);
  els.themeToggle.textContent = normalizedTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
}

function updateCategoryOptions() {
  const categoryOptions = state.categories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join('');
  const categoryFilterOptions = ['All', ...state.categories]
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join('');

  els.category.innerHTML = categoryOptions;
  els.modalCategory.innerHTML = categoryOptions;
  els.categoryFilter.innerHTML = categoryFilterOptions;

  if (!state.categories.includes(state.preferences.category)) {
    state.preferences.category = 'All';
  }

  els.category.value = state.categories[0];
  els.categoryFilter.value = state.preferences.category;
}

function renderCategories() {
  els.categoryList.innerHTML = state.categories
    .map((category) => {
      const isGeneral = category === 'General';
      return `
        <span class="category-pill">
          ${escapeHtml(category)}
          ${
            isGeneral
              ? ''
              : `<button type="button" data-action="remove-category" data-category="${escapeHtml(category)}" aria-label="Remove ${escapeHtml(
                  category
                )} category">×</button>`
          }
        </span>
      `;
    })
    .join('');
}

function formatDate(value) {
  if (!value) return 'No due date';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 'No due date' : date.toLocaleDateString();
}

function getFilteredTasks() {
  return state.tasks
    .filter((task) => {
      const text = `${task.title} ${task.description || ''}`.toLowerCase();
      const statusMatch =
        state.preferences.status === 'All' ||
        (state.preferences.status === 'Active' && !task.completed) ||
        (state.preferences.status === 'Completed' && task.completed);

      const priorityMatch = state.preferences.priority === 'All' || task.priority === state.preferences.priority;
      const categoryMatch = state.preferences.category === 'All' || task.category === state.preferences.category;
      const searchMatch = !state.preferences.search || text.includes(state.preferences.search.toLowerCase());

      return statusMatch && priorityMatch && categoryMatch && searchMatch;
    })
    .sort((a, b) => {
      if (state.preferences.sortBy === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return b.createdAt - a.createdAt;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }

      if (state.preferences.sortBy === 'priority') {
        return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || b.createdAt - a.createdAt;
      }

      return b.createdAt - a.createdAt;
    });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderTasks() {
  const tasks = getFilteredTasks();

  els.taskList.innerHTML = tasks
    .map(
      (task) => `
      <li class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
        <input
          type="checkbox"
          data-action="toggle"
          aria-label="Mark ${escapeHtml(task.title)} as ${task.completed ? 'incomplete' : 'complete'}"
          ${task.completed ? 'checked' : ''}
        />
        <div class="task-body">
          <strong class="task-title">${escapeHtml(task.title)}</strong>
          <p>${escapeHtml(task.description || 'No description')}</p>
          <div class="task-meta">
            <span class="meta-badge priority-${escapeHtml(task.priority)}">${escapeHtml(task.priority)}</span>
            <span class="meta-badge">${escapeHtml(task.category)}</span>
            <span class="meta-badge">${escapeHtml(formatDate(task.dueDate))}</span>
          </div>
        </div>
        <div class="task-actions">
          <button type="button" data-action="view" aria-label="View ${escapeHtml(task.title)}">View</button>
          <button type="button" data-action="edit" aria-label="Edit ${escapeHtml(task.title)}">Edit</button>
          <button type="button" data-action="delete" aria-label="Delete ${escapeHtml(task.title)}">Delete</button>
        </div>
      </li>
    `
    )
    .join('');

  els.emptyState.hidden = tasks.length > 0;
}

function renderStats() {
  const total = state.tasks.length;
  const completed = state.tasks.filter((task) => task.completed).length;
  const active = total - completed;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  els.stats.innerHTML = `
    <span class="stat-pill">Total: <strong>${total}</strong></span>
    <span class="stat-pill">Active: <strong>${active}</strong></span>
    <span class="stat-pill">Completed: <strong>${completed}</strong></span>
    <span class="stat-pill">Completion: <strong>${percent}%</strong></span>
  `;
}

function render() {
  updateCategoryOptions();
  renderCategories();
  renderTasks();
  renderStats();
  persist();
}

function addTask(event) {
  event.preventDefault();
  const title = els.title.value.trim();
  if (!title) return;

  state.tasks.push({
    id: uid(),
    title,
    description: els.description.value.trim(),
    priority: els.priority.value,
    dueDate: els.dueDate.value,
    category: els.category.value,
    completed: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  els.taskForm.reset();
  els.priority.value = 'Medium';
  els.category.value = state.categories[0];
  render();
}

function addCategory() {
  const name = els.newCategory.value.trim();
  if (!name) return;

  const exists = state.categories.some((category) => category.toLowerCase() === name.toLowerCase());
  if (exists) {
    els.newCategory.setCustomValidity('Category already exists.');
    els.newCategory.reportValidity();
    setTimeout(() => els.newCategory.setCustomValidity(''), 0);
    return;
  }

  state.categories.push(name);
  els.newCategory.value = '';
  render();
}

function removeCategory(name) {
  state.categories = state.categories.filter((category) => category !== name);
  state.tasks = state.tasks.map((task) => (task.category === name ? { ...task, category: 'General' } : task));
  render();
}

function findTask(taskId) {
  return state.tasks.find((task) => task.id === taskId);
}

function toggleTask(taskId) {
  state.tasks = state.tasks.map((task) =>
    task.id === taskId ? { ...task, completed: !task.completed, updatedAt: Date.now() } : task
  );
  render();
}

function showToast(message) {
  els.toastMessage.textContent = message;
  els.toast.hidden = false;
}

function hideToast() {
  els.toast.hidden = true;
}

function deleteTask(taskId) {
  const task = findTask(taskId);
  if (!task) return;

  state.deletedTask = { ...task };
  state.tasks = state.tasks.filter((item) => item.id !== taskId);

  if (state.deleteTimerId) clearTimeout(state.deleteTimerId);
  showToast('Task deleted.');
  state.deleteTimerId = setTimeout(() => {
    state.deletedTask = null;
    hideToast();
  }, 5000);

  if (els.modal.open) {
    els.modal.close();
  }

  render();
}

function undoDelete() {
  if (!state.deletedTask) return;
  state.tasks.push(state.deletedTask);
  state.deletedTask = null;
  if (state.deleteTimerId) clearTimeout(state.deleteTimerId);
  hideToast();
  render();
}

function openTaskModal(taskId, mode = 'edit') {
  const task = findTask(taskId);
  if (!task) return;

  els.modalTaskId.value = task.id;
  els.modalTitle.value = task.title;
  els.modalDescription.value = task.description || '';
  els.modalPriority.value = task.priority;
  els.modalDueDate.value = task.dueDate || '';
  els.modalCategory.value = task.category;

  const isReadOnly = mode === 'view';
  els.modalTitle.readOnly = isReadOnly;
  els.modalDescription.readOnly = isReadOnly;
  els.modalPriority.disabled = isReadOnly;
  els.modalDueDate.disabled = isReadOnly;
  els.modalCategory.disabled = isReadOnly;
  els.modalDelete.disabled = isReadOnly;
  els.modalForm.dataset.mode = mode;
  els.modalHeaderTitle.textContent = isReadOnly ? 'Task Details' : 'Edit Task';
  els.modalSave.hidden = isReadOnly;

  els.modal.showModal();
}

function saveModalTask(event) {
  event.preventDefault();
  if (els.modalForm.dataset.mode === 'view') {
    els.modal.close();
    return;
  }

  const task = findTask(els.modalTaskId.value);
  if (!task) return;

  const title = els.modalTitle.value.trim();
  if (!title) {
    els.modalTitle.setCustomValidity('Title is required.');
    els.modalTitle.reportValidity();
    setTimeout(() => els.modalTitle.setCustomValidity(''), 0);
    return;
  }

  task.title = title;
  task.description = els.modalDescription.value.trim();
  task.priority = els.modalPriority.value;
  task.dueDate = els.modalDueDate.value;
  task.category = els.modalCategory.value;
  task.updatedAt = Date.now();

  els.modal.close();
  render();
}

function applyPreferenceInputs() {
  els.statusFilter.value = state.preferences.status;
  els.priorityFilter.value = state.preferences.priority;
  els.sortBy.value = state.preferences.sortBy;
  els.search.value = state.preferences.search;
}

function handleTaskListClick(event) {
  const listItem = event.target.closest('li[data-task-id]');
  if (!listItem) return;
  const taskId = listItem.dataset.taskId;

  if (event.target.matches('input[data-action="toggle"]')) {
    toggleTask(taskId);
    return;
  }

  const action = event.target.dataset.action;
  if (!action) return;

  if (action === 'edit') openTaskModal(taskId, 'edit');
  if (action === 'view') openTaskModal(taskId, 'view');
  if (action === 'delete') deleteTask(taskId);
}

function attachEvents() {
  els.taskForm.addEventListener('submit', addTask);
  els.addCategory.addEventListener('click', addCategory);
  els.newCategory.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addCategory();
    }
  });

  els.categoryList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action="remove-category"]');
    if (!button) return;
    removeCategory(button.dataset.category);
  });

  els.taskList.addEventListener('click', handleTaskListClick);

  els.statusFilter.addEventListener('change', (event) => {
    state.preferences.status = event.target.value;
    render();
  });

  els.priorityFilter.addEventListener('change', (event) => {
    state.preferences.priority = event.target.value;
    render();
  });

  els.categoryFilter.addEventListener('change', (event) => {
    state.preferences.category = event.target.value;
    render();
  });

  els.sortBy.addEventListener('change', (event) => {
    state.preferences.sortBy = event.target.value;
    render();
  });

  els.search.addEventListener('input', (event) => {
    state.preferences.search = event.target.value.trim();
    renderTasks();
    persist();
  });

  els.themeToggle.addEventListener('click', () => {
    const current = els.html.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  els.modalForm.addEventListener('submit', saveModalTask);
  els.modalDelete.addEventListener('click', () => {
    deleteTask(els.modalTaskId.value);
  });
  els.modalClose.addEventListener('click', () => els.modal.close());

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && els.modal.open) {
      els.modal.close();
    }
  });

  els.undoDelete.addEventListener('click', undoDelete);
}

function init() {
  loadState();
  applyPreferenceInputs();
  render();
  attachEvents();
}

init();
