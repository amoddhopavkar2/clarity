/**
 * Clarity Todo - Modern Todo Application
 * With Supabase Authentication, Due Dates, Recurring Tasks, and Theme Support
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configuration from environment variables (Vite)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDueStatus(dateString, completed) {
    if (!dateString || completed) return '';
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    if (date < today) return 'overdue';
    if (date <= threeDaysFromNow) return 'due-soon';
    return '';
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

class Toast {
    constructor() {
        this.toast = document.getElementById('toast');
        this.message = document.getElementById('toastMessage');
        this.timeout = null;
    }

    show(message, type = 'default', duration = 3000) {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        this.message.textContent = message;
        this.toast.className = 'toast';
        if (type !== 'default') {
            this.toast.classList.add(type);
        }

        // Force reflow
        this.toast.offsetHeight;
        this.toast.classList.add('show');

        this.timeout = setTimeout(() => {
            this.toast.classList.remove('show');
            setTimeout(() => {
                this.toast.classList.add('hidden');
            }, 250);
        }, duration);
    }

    success(message) {
        this.show(message, 'success');
    }

    error(message) {
        this.show(message, 'error');
    }
}

const toast = new Toast();

// ============================================
// CONFIRMATION MODAL
// ============================================

class ConfirmModal {
    constructor() {
        this.modal = document.getElementById('confirmModal');
        this.title = document.getElementById('confirmTitle');
        this.message = document.getElementById('confirmMessage');
        this.cancelBtn = document.getElementById('confirmCancel');
        this.okBtn = document.getElementById('confirmOk');
        this.backdrop = this.modal.querySelector('.modal-backdrop');
        this.resolvePromise = null;

        this.cancelBtn.addEventListener('click', () => this.close(false));
        this.okBtn.addEventListener('click', () => this.close(true));
        this.backdrop.addEventListener('click', () => this.close(false));
    }

    show(title, message, confirmText = 'Confirm') {
        this.title.textContent = title;
        this.message.textContent = message;
        this.okBtn.textContent = confirmText;
        this.modal.classList.remove('hidden');

        return new Promise(resolve => {
            this.resolvePromise = resolve;
        });
    }

    close(result) {
        this.modal.classList.add('hidden');
        if (this.resolvePromise) {
            this.resolvePromise(result);
            this.resolvePromise = null;
        }
    }
}

const confirmModal = new ConfirmModal();

// ============================================
// MAIN APP CLASS
// ============================================

class ClarityApp {
    constructor() {
        this.user = null;
        this.session = null;
        this.todoApp = null;
        this.theme = 'dark';

        // DOM Elements
        this.authScreen = document.getElementById('authScreen');
        this.todoAppEl = document.getElementById('todoApp');
        this.googleSignInBtn = document.getElementById('googleSignInBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.userAvatar = document.getElementById('userAvatar');
        this.userName = document.getElementById('userName');
        this.themeToggleBtn = document.getElementById('themeToggleBtn');

        this.init();
    }

    async init() {
        // Load theme from localStorage first
        this.loadTheme();

        // Set up auth state listener
        supabase.auth.onAuthStateChange((event, session) => {
            this.handleAuthChange(event, session);
        });

        // Check current session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            this.handleAuthChange('INITIAL_SESSION', session);
        }

        // Bind auth events
        this.googleSignInBtn.addEventListener('click', () => this.signInWithGoogle());
        this.logoutBtn.addEventListener('click', () => this.signOut());
        this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('clarity-theme') || 'dark';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        this.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('clarity-theme', theme);
    }

    toggleTheme() {
        const newTheme = this.theme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);

        // Save to server if logged in
        if (this.session) {
            this.saveThemePreference(newTheme);
        }
    }

    async saveThemePreference(theme) {
        try {
            await fetch(`${API_URL}/api/preferences`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.session.access_token}`
                },
                body: JSON.stringify({ theme })
            });
        } catch (error) {
            console.error('Error saving theme preference:', error);
        }
    }

    async loadThemePreference() {
        try {
            const response = await fetch(`${API_URL}/api/preferences`, {
                headers: {
                    'Authorization': `Bearer ${this.session.access_token}`
                }
            });
            if (response.ok) {
                const prefs = await response.json();
                if (prefs.theme) {
                    this.setTheme(prefs.theme);
                }
            }
        } catch (error) {
            console.error('Error loading theme preference:', error);
        }
    }

    async handleAuthChange(event, session) {
        this.session = session;
        this.user = session?.user || null;

        if (this.user) {
            this.showApp();
            await this.loadThemePreference();
        } else {
            this.showAuth();
        }
    }

    async signInWithGoogle() {
        this.googleSignInBtn.disabled = true;
        this.googleSignInBtn.textContent = 'Signing in...';

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });

        if (error) {
            console.error('Error signing in:', error);
            toast.error('Failed to sign in. Please try again.');
            this.googleSignInBtn.disabled = false;
            this.googleSignInBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
            `;
        }
    }

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error);
            toast.error('Failed to sign out.');
        }
    }

    showAuth() {
        this.authScreen.classList.remove('hidden');
        this.todoAppEl.classList.add('hidden');

        if (this.todoApp) {
            this.todoApp = null;
        }
    }

    showApp() {
        this.authScreen.classList.add('hidden');
        this.todoAppEl.classList.remove('hidden');

        // Update user info
        const metadata = this.user.user_metadata;
        this.userName.textContent = metadata?.full_name || metadata?.name || this.user.email;
        this.userAvatar.src = metadata?.avatar_url || metadata?.picture || this.getDefaultAvatar();
        this.userAvatar.onerror = () => {
            this.userAvatar.src = this.getDefaultAvatar();
        };

        // Initialize todo app
        if (!this.todoApp) {
            this.todoApp = new TodoApp(this.session);
        }
    }

    getDefaultAvatar() {
        const colors = ['667eea', '764ba2', 'f093fb', 'f5576c', '00d9a5'];
        const index = this.user.email.charCodeAt(0) % colors.length;
        const initial = (this.user.user_metadata?.full_name || this.user.email)[0].toUpperCase();
        return `https://ui-avatars.com/api/?name=${initial}&background=${colors[index]}&color=fff&size=40`;
    }
}

// ============================================
// TODO APP CLASS
// ============================================

class TodoApp {
    constructor(session) {
        this.session = session;
        this.todos = [];
        this.currentFilter = 'all';
        this.currentSort = 'created';
        this.editingId = null;
        this.isLoading = false;

        // DOM Elements
        this.taskInput = document.getElementById('taskInput');
        this.addBtn = document.getElementById('addBtn');
        this.dueDateInput = document.getElementById('dueDateInput');
        this.recurringCheckbox = document.getElementById('recurringCheckbox');
        this.recurrenceSelect = document.getElementById('recurrenceSelect');
        this.taskList = document.getElementById('taskList');
        this.emptyState = document.getElementById('emptyState');
        this.loadingState = document.getElementById('loadingState');
        this.taskCount = document.getElementById('taskCount');
        this.clearCompletedBtn = document.getElementById('clearCompletedBtn');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.sortSelect = document.getElementById('sortSelect');

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadTasks();
    }

    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.session.access_token}`
        };
    }

    // API Operations
    async loadTasks() {
        this.setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/tasks`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to fetch tasks');

            this.todos = await response.json();
            this.render();
        } catch (error) {
            console.error('Error loading tasks:', error);
            toast.error('Failed to load tasks');
            this.todos = [];
            this.render();
        } finally {
            this.setLoading(false);
        }
    }

    async createTask(text, dueDate, isRecurring, recurrencePattern) {
        this.addBtn.disabled = true;

        try {
            const response = await fetch(`${API_URL}/api/tasks`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    text,
                    due_date: dueDate || null,
                    is_recurring: isRecurring,
                    recurrence_pattern: isRecurring ? recurrencePattern : null
                })
            });

            if (!response.ok) throw new Error('Failed to create task');

            const task = await response.json();
            this.todos.unshift(task);
            this.render();
            toast.success('Task created');
        } catch (error) {
            console.error('Error creating task:', error);
            toast.error('Failed to create task');
        } finally {
            this.addBtn.disabled = false;
        }
    }

    async updateTask(id, updates) {
        try {
            const response = await fetch(`${API_URL}/api/tasks/${id}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(updates)
            });

            if (!response.ok) throw new Error('Failed to update task');

            const updatedTask = await response.json();
            const index = this.todos.findIndex(t => t.id === id);
            if (index !== -1) {
                this.todos[index] = updatedTask;
            }

            // If completing a recurring task, reload to get the new instance
            if (updates.completed && updatedTask.is_recurring) {
                await this.loadTasks();
                toast.success('Task completed - next occurrence created');
            } else {
                this.render();
            }
        } catch (error) {
            console.error('Error updating task:', error);
            toast.error('Failed to update task');
        }
    }

    async deleteTaskFromServer(id, deleteSeries = false) {
        try {
            const url = deleteSeries
                ? `${API_URL}/api/tasks/${id}?deleteSeries=true`
                : `${API_URL}/api/tasks/${id}`;

            const response = await fetch(url, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to delete task');

            if (deleteSeries) {
                // Reload all tasks when deleting a series
                await this.loadTasks();
            } else {
                this.todos = this.todos.filter(t => t.id !== id);
                this.render();
            }
            toast.success(deleteSeries ? 'Recurring series deleted' : 'Task deleted');
        } catch (error) {
            console.error('Error deleting task:', error);
            toast.error('Failed to delete task');
        }
    }

    async clearCompletedFromServer() {
        try {
            const response = await fetch(`${API_URL}/api/tasks/completed/all`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to clear completed tasks');

            const count = this.todos.filter(t => t.completed).length;
            this.todos = this.todos.filter(t => !t.completed);
            this.render();
            toast.success(`Cleared ${count} completed task${count !== 1 ? 's' : ''}`);
        } catch (error) {
            console.error('Error clearing completed tasks:', error);
            toast.error('Failed to clear completed tasks');
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        if (loading) {
            this.loadingState.classList.remove('hidden');
            this.taskList.classList.add('hidden');
            this.emptyState.classList.add('hidden');
        } else {
            this.loadingState.classList.add('hidden');
            this.taskList.classList.remove('hidden');
        }
    }

    // Event Bindings
    bindEvents() {
        this.addBtn.addEventListener('click', () => this.addTask());

        this.taskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.addTask();
            }
        });

        this.recurringCheckbox.addEventListener('change', () => {
            this.recurrenceSelect.disabled = !this.recurringCheckbox.checked;
        });

        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setFilter(btn.dataset.filter);
            });
        });

        this.sortSelect.addEventListener('change', () => {
            this.currentSort = this.sortSelect.value;
            this.render();
        });

        this.clearCompletedBtn.addEventListener('click', () => {
            this.clearCompleted();
        });

        this.taskList.addEventListener('click', (e) => this.handleTaskClick(e));
        this.taskList.addEventListener('change', (e) => this.handleTaskChange(e));
        this.taskList.addEventListener('keydown', (e) => this.handleTaskKeydown(e));
    }

    // Task Operations
    addTask() {
        const text = this.taskInput.value.trim();
        if (!text) return;

        const dueDate = this.dueDateInput.value;
        const isRecurring = this.recurringCheckbox.checked;
        const recurrencePattern = this.recurrenceSelect.value;

        this.createTask(text, dueDate, isRecurring, recurrencePattern);

        // Reset inputs
        this.taskInput.value = '';
        this.dueDateInput.value = '';
        this.recurringCheckbox.checked = false;
        this.recurrenceSelect.disabled = true;
        this.recurrenceSelect.value = 'daily';
        this.taskInput.focus();
    }

    toggleTask(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            this.updateTask(id, { completed: !todo.completed });
        }
    }

    async deleteTask(id) {
        const todo = this.todos.find(t => t.id === id);

        // Show confirmation for recurring tasks
        if (todo?.is_recurring) {
            const deleteAll = await confirmModal.show(
                'Delete Recurring Task',
                'This is a recurring task. Do you want to delete just this instance or all future occurrences?',
                'Delete All'
            );

            if (deleteAll === null) return; // Cancelled

            const taskEl = this.taskList.querySelector(`[data-id="${id}"]`);
            if (taskEl) {
                taskEl.classList.add('removing');
                setTimeout(() => {
                    this.deleteTaskFromServer(id, deleteAll);
                }, 250);
            }
        } else {
            const confirmed = await confirmModal.show(
                'Delete Task',
                'Are you sure you want to delete this task?',
                'Delete'
            );

            if (!confirmed) return;

            const taskEl = this.taskList.querySelector(`[data-id="${id}"]`);
            if (taskEl) {
                taskEl.classList.add('removing');
                setTimeout(() => {
                    this.deleteTaskFromServer(id);
                }, 250);
            }
        }
    }

    startEditing(id) {
        this.editingId = id;
        this.render();

        const input = this.taskList.querySelector('.task-edit-input');
        if (input) {
            input.focus();
            input.select();
        }
    }

    saveEdit(id, newText) {
        const text = newText.trim();
        if (!text) {
            this.deleteTask(id);
            return;
        }

        this.updateTask(id, { text });
        this.editingId = null;
    }

    cancelEdit() {
        this.editingId = null;
        this.render();
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.render();
    }

    getFilteredTodos() {
        let filtered;
        switch (this.currentFilter) {
            case 'active':
                filtered = this.todos.filter(t => !t.completed);
                break;
            case 'completed':
                filtered = this.todos.filter(t => t.completed);
                break;
            default:
                filtered = [...this.todos];
        }

        // Apply sorting
        if (this.currentSort === 'due') {
            filtered.sort((a, b) => {
                // Tasks without due dates go to the end
                if (!a.due_date && !b.due_date) return 0;
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return new Date(a.due_date) - new Date(b.due_date);
            });
        }

        return filtered;
    }

    async clearCompleted() {
        const completedCount = this.todos.filter(t => t.completed).length;
        if (completedCount === 0) return;

        const confirmed = await confirmModal.show(
            'Clear Completed Tasks',
            `Are you sure you want to delete ${completedCount} completed task${completedCount !== 1 ? 's' : ''}?`,
            'Clear All'
        );

        if (!confirmed) return;

        const completedItems = this.taskList.querySelectorAll('.task-item.completed');
        completedItems.forEach(item => item.classList.add('removing'));

        setTimeout(() => {
            this.clearCompletedFromServer();
        }, 250);
    }

    // Event Handlers
    handleTaskClick(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;

        const id = taskItem.dataset.id;

        if (e.target.closest('.delete-btn')) {
            this.deleteTask(id);
            return;
        }

        if (e.target.closest('.edit-btn')) {
            this.startEditing(id);
            return;
        }

        if (e.target.closest('.save-btn')) {
            const input = taskItem.querySelector('.task-edit-input');
            if (input) {
                this.saveEdit(id, input.value);
            }
            return;
        }

        if (e.target.closest('.cancel-btn')) {
            this.cancelEdit();
            return;
        }
    }

    handleTaskChange(e) {
        if (e.target.classList.contains('task-checkbox')) {
            const taskItem = e.target.closest('.task-item');
            if (taskItem) {
                this.toggleTask(taskItem.dataset.id);
            }
        }
    }

    handleTaskKeydown(e) {
        if (e.target.classList.contains('task-edit-input')) {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;

            if (e.key === 'Enter') {
                this.saveEdit(taskItem.dataset.id, e.target.value);
            } else if (e.key === 'Escape') {
                this.cancelEdit();
            }
        }
    }

    // Rendering
    createTaskElement(todo) {
        const li = document.createElement('li');
        const dueStatus = getDueStatus(todo.due_date, todo.completed);
        li.className = `task-item${todo.completed ? ' completed' : ''}${dueStatus ? ' ' + dueStatus : ''}`;
        li.dataset.id = todo.id;

        const isEditing = this.editingId === todo.id;

        if (isEditing) {
            li.innerHTML = `
                <div class="checkbox-wrapper">
                    <input type="checkbox" class="task-checkbox" ${todo.completed ? 'checked' : ''}>
                </div>
                <input type="text" class="task-edit-input" value="${this.escapeHtml(todo.text)}">
                <div class="task-actions" style="opacity: 1;">
                    <button class="action-btn save-btn" aria-label="Save">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </button>
                    <button class="action-btn cancel-btn" aria-label="Cancel">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            `;
        } else {
            const dueDateHtml = todo.due_date ? `
                <span class="task-due-date ${dueStatus}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    ${formatDate(todo.due_date)}
                </span>
            ` : '';

            const recurringHtml = todo.is_recurring ? `
                <span class="task-recurring-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <polyline points="1 20 1 14 7 14"></polyline>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    ${capitalizeFirst(todo.recurrence_pattern || '')}
                </span>
            ` : '';

            const metaHtml = (dueDateHtml || recurringHtml) ? `
                <div class="task-meta">
                    ${dueDateHtml}
                    ${recurringHtml}
                </div>
            ` : '';

            li.innerHTML = `
                <div class="checkbox-wrapper">
                    <input type="checkbox" class="task-checkbox" ${todo.completed ? 'checked' : ''}>
                </div>
                <div class="task-content">
                    <span class="task-text">${this.escapeHtml(todo.text)}</span>
                    ${metaHtml}
                </div>
                <div class="task-actions">
                    <button class="action-btn edit-btn" aria-label="Edit task">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="action-btn delete-btn" aria-label="Delete task">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            `;
        }

        return li;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateStats() {
        const total = this.todos.length;
        const active = this.todos.filter(t => !t.completed).length;
        const completed = total - active;

        if (this.currentFilter === 'active') {
            this.taskCount.textContent = `${active} active task${active !== 1 ? 's' : ''}`;
        } else if (this.currentFilter === 'completed') {
            this.taskCount.textContent = `${completed} completed task${completed !== 1 ? 's' : ''}`;
        } else {
            this.taskCount.textContent = `${total} task${total !== 1 ? 's' : ''}`;
        }

        this.clearCompletedBtn.disabled = completed === 0;
    }

    render() {
        if (this.isLoading) return;

        const filteredTodos = this.getFilteredTodos();

        this.taskList.innerHTML = '';

        if (filteredTodos.length === 0) {
            this.emptyState.classList.remove('hidden');

            const h3 = this.emptyState.querySelector('h3');
            const p = this.emptyState.querySelector('p');

            if (this.currentFilter === 'active') {
                h3.textContent = 'All done!';
                p.textContent = 'No active tasks remaining';
            } else if (this.currentFilter === 'completed') {
                h3.textContent = 'No completed tasks';
                p.textContent = 'Complete some tasks to see them here';
            } else {
                h3.textContent = 'No tasks yet';
                p.textContent = 'Add your first task above to get started';
            }
        } else {
            this.emptyState.classList.add('hidden');

            filteredTodos.forEach(todo => {
                const taskEl = this.createTaskElement(todo);
                this.taskList.appendChild(taskEl);
            });
        }

        this.updateStats();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ClarityApp();
});
