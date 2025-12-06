/**
 * Clarity Todo - Modern Todo Application
 * A clean, minimalist todo app with smooth animations and localStorage persistence
 */

class TodoApp {
    constructor() {
        // State
        this.todos = [];
        this.currentFilter = 'all';
        this.editingId = null;

        // DOM Elements
        this.taskInput = document.getElementById('taskInput');
        this.addBtn = document.getElementById('addBtn');
        this.taskList = document.getElementById('taskList');
        this.emptyState = document.getElementById('emptyState');
        this.taskCount = document.getElementById('taskCount');
        this.clearCompletedBtn = document.getElementById('clearCompletedBtn');
        this.filterBtns = document.querySelectorAll('.filter-btn');

        // Initialize
        this.loadFromStorage();
        this.bindEvents();
        this.render();
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // LocalStorage Operations
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('clarity-todos');
            this.todos = stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Error loading todos from storage:', e);
            this.todos = [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('clarity-todos', JSON.stringify(this.todos));
        } catch (e) {
            console.error('Error saving todos to storage:', e);
        }
    }

    // Event Bindings
    bindEvents() {
        // Add task on button click
        this.addBtn.addEventListener('click', () => this.addTask());

        // Add task on Enter key
        this.taskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.addTask();
            }
        });

        // Filter buttons
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setFilter(btn.dataset.filter);
            });
        });

        // Clear completed
        this.clearCompletedBtn.addEventListener('click', () => {
            this.clearCompleted();
        });

        // Delegate task list events
        this.taskList.addEventListener('click', (e) => this.handleTaskClick(e));
        this.taskList.addEventListener('change', (e) => this.handleTaskChange(e));
        this.taskList.addEventListener('keydown', (e) => this.handleTaskKeydown(e));
    }

    // Task Operations
    addTask() {
        const text = this.taskInput.value.trim();
        if (!text) return;

        const todo = {
            id: this.generateId(),
            text: text,
            completed: false,
            createdAt: Date.now()
        };

        this.todos.unshift(todo);
        this.saveToStorage();
        this.taskInput.value = '';
        this.taskInput.focus();
        this.render();
    }

    toggleTask(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.saveToStorage();
            this.render();
        }
    }

    deleteTask(id) {
        const taskEl = this.taskList.querySelector(`[data-id="${id}"]`);
        if (taskEl) {
            taskEl.classList.add('removing');
            setTimeout(() => {
                this.todos = this.todos.filter(t => t.id !== id);
                this.saveToStorage();
                this.render();
            }, 250);
        }
    }

    startEditing(id) {
        this.editingId = id;
        this.render();

        // Focus the input after render
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

        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.text = text;
            this.saveToStorage();
        }
        this.editingId = null;
        this.render();
    }

    cancelEdit() {
        this.editingId = null;
        this.render();
    }

    // Filter Operations
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

    // Clear Operations
    clearCompleted() {
        const completedItems = this.taskList.querySelectorAll('.task-item.completed');
        completedItems.forEach(item => item.classList.add('removing'));

        setTimeout(() => {
            this.todos = this.todos.filter(t => !t.completed);
            this.saveToStorage();
            this.render();
        }, 250);
    }

    // Event Handlers
    handleTaskClick(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;

        const id = taskItem.dataset.id;

        // Delete button
        if (e.target.closest('.delete-btn')) {
            this.deleteTask(id);
            return;
        }

        // Edit button
        if (e.target.closest('.edit-btn')) {
            this.startEditing(id);
            return;
        }

        // Save button
        if (e.target.closest('.save-btn')) {
            const input = taskItem.querySelector('.task-edit-input');
            if (input) {
                this.saveEdit(id, input.value);
            }
            return;
        }

        // Cancel button
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

        // Update count text
        if (this.currentFilter === 'active') {
            this.taskCount.textContent = `${active} active task${active !== 1 ? 's' : ''}`;
        } else if (this.currentFilter === 'completed') {
            this.taskCount.textContent = `${completed} completed task${completed !== 1 ? 's' : ''}`;
        } else {
            this.taskCount.textContent = `${total} task${total !== 1 ? 's' : ''}`;
        }

        // Update clear button state
        this.clearCompletedBtn.disabled = completed === 0;
    }

    render() {
        const filteredTodos = this.getFilteredTodos();

        // Clear existing tasks
        this.taskList.innerHTML = '';

        // Show/hide empty state
        if (filteredTodos.length === 0) {
            this.emptyState.classList.remove('hidden');

            // Customize empty state message based on filter
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

            // Render tasks
            filteredTodos.forEach(todo => {
                const taskEl = this.createTaskElement(todo);
                this.taskList.appendChild(taskEl);
            });
        }

        // Update statistics
        this.updateStats();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});
