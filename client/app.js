/**
 * Clarity Todo - Modern Todo Application
 * With Supabase Authentication and API Integration
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configuration from environment variables (Vite)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class ClarityApp {
    constructor() {
        this.user = null;
        this.session = null;
        this.todoApp = null;

        // DOM Elements
        this.authScreen = document.getElementById('authScreen');
        this.todoAppEl = document.getElementById('todoApp');
        this.googleSignInBtn = document.getElementById('googleSignInBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.userAvatar = document.getElementById('userAvatar');
        this.userName = document.getElementById('userName');

        this.init();
    }

    async init() {
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
    }

    async handleAuthChange(event, session) {
        this.session = session;
        this.user = session?.user || null;

        if (this.user) {
            this.showApp();
        } else {
            this.showAuth();
        }
    }

    async signInWithGoogle() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });

        if (error) {
            console.error('Error signing in:', error);
            alert('Failed to sign in. Please try again.');
        }
    }

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error);
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
        // Generate a simple colored avatar based on user email
        const colors = ['667eea', '764ba2', 'f093fb', 'f5576c', '00d9a5'];
        const index = this.user.email.charCodeAt(0) % colors.length;
        const initial = (this.user.user_metadata?.full_name || this.user.email)[0].toUpperCase();
        return `https://ui-avatars.com/api/?name=${initial}&background=${colors[index]}&color=fff&size=40`;
    }
}

class TodoApp {
    constructor(session) {
        this.session = session;
        this.todos = [];
        this.currentFilter = 'all';
        this.editingId = null;
        this.isLoading = false;

        // DOM Elements
        this.taskInput = document.getElementById('taskInput');
        this.addBtn = document.getElementById('addBtn');
        this.taskList = document.getElementById('taskList');
        this.emptyState = document.getElementById('emptyState');
        this.loadingState = document.getElementById('loadingState');
        this.taskCount = document.getElementById('taskCount');
        this.clearCompletedBtn = document.getElementById('clearCompletedBtn');
        this.filterBtns = document.querySelectorAll('.filter-btn');

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
            this.todos = [];
            this.render();
        } finally {
            this.setLoading(false);
        }
    }

    async createTask(text) {
        try {
            const response = await fetch(`${API_URL}/api/tasks`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ text })
            });

            if (!response.ok) throw new Error('Failed to create task');

            const task = await response.json();
            this.todos.unshift(task);
            this.render();
        } catch (error) {
            console.error('Error creating task:', error);
            alert('Failed to create task. Please try again.');
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
            this.render();
        } catch (error) {
            console.error('Error updating task:', error);
            alert('Failed to update task. Please try again.');
        }
    }

    async deleteTaskFromServer(id) {
        try {
            const response = await fetch(`${API_URL}/api/tasks/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to delete task');

            this.todos = this.todos.filter(t => t.id !== id);
            this.render();
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Failed to delete task. Please try again.');
        }
    }

    async clearCompletedFromServer() {
        try {
            const response = await fetch(`${API_URL}/api/tasks/completed/all`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to clear completed tasks');

            this.todos = this.todos.filter(t => !t.completed);
            this.render();
        } catch (error) {
            console.error('Error clearing completed tasks:', error);
            alert('Failed to clear completed tasks. Please try again.');
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

        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setFilter(btn.dataset.filter);
            });
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

        this.createTask(text);
        this.taskInput.value = '';
        this.taskInput.focus();
    }

    toggleTask(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            this.updateTask(id, { completed: !todo.completed });
        }
    }

    deleteTask(id) {
        const taskEl = this.taskList.querySelector(`[data-id="${id}"]`);
        if (taskEl) {
            taskEl.classList.add('removing');
            setTimeout(() => {
                this.deleteTaskFromServer(id);
            }, 250);
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
        switch (this.currentFilter) {
            case 'active':
                return this.todos.filter(t => !t.completed);
            case 'completed':
                return this.todos.filter(t => t.completed);
            default:
                return this.todos;
        }
    }

    clearCompleted() {
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
        li.className = `task-item${todo.completed ? ' completed' : ''}`;
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
            li.innerHTML = `
                <div class="checkbox-wrapper">
                    <input type="checkbox" class="task-checkbox" ${todo.completed ? 'checked' : ''}>
                </div>
                <span class="task-text">${this.escapeHtml(todo.text)}</span>
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
