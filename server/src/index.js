/**
 * Clarity Todo - Express API Server
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(express.json());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Auth middleware - verify Supabase JWT
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// TASKS API ROUTES
// ============================================

// Get all tasks for authenticated user
app.get('/api/tasks', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Create a new task
app.post('/api/tasks', authenticate, async (req, res) => {
    try {
        const { text, due_date, is_recurring, recurrence_pattern } = req.body;

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({ error: 'Task text is required' });
        }

        if (text.length > 200) {
            return res.status(400).json({ error: 'Task text must be 200 characters or less' });
        }

        // Validate recurrence pattern
        const validPatterns = ['daily', 'weekly', 'monthly', 'yearly'];
        if (is_recurring && recurrence_pattern && !validPatterns.includes(recurrence_pattern)) {
            return res.status(400).json({ error: 'Invalid recurrence pattern' });
        }

        const taskData = {
            user_id: req.user.id,
            text: text.trim(),
            completed: false,
            due_date: due_date || null,
            is_recurring: Boolean(is_recurring),
            recurrence_pattern: is_recurring ? recurrence_pattern : null
        };

        const { data, error } = await supabase
            .from('tasks')
            .insert(taskData)
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Update a task
app.put('/api/tasks/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { text, completed, due_date, is_recurring, recurrence_pattern } = req.body;

        // Build update object
        const updates = {};

        if (text !== undefined) {
            if (typeof text !== 'string' || text.trim().length === 0) {
                return res.status(400).json({ error: 'Task text cannot be empty' });
            }
            if (text.length > 200) {
                return res.status(400).json({ error: 'Task text must be 200 characters or less' });
            }
            updates.text = text.trim();
        }

        if (completed !== undefined) {
            updates.completed = Boolean(completed);
        }

        if (due_date !== undefined) {
            updates.due_date = due_date;
        }

        if (is_recurring !== undefined) {
            updates.is_recurring = Boolean(is_recurring);
            if (!is_recurring) {
                updates.recurrence_pattern = null;
            }
        }

        if (recurrence_pattern !== undefined) {
            const validPatterns = ['daily', 'weekly', 'monthly', 'yearly'];
            if (recurrence_pattern && !validPatterns.includes(recurrence_pattern)) {
                return res.status(400).json({ error: 'Invalid recurrence pattern' });
            }
            updates.recurrence_pattern = recurrence_pattern;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        // Get the current task first to check for recurring task completion
        let currentTask = null;
        if (updates.completed === true) {
            const { data: taskData } = await supabase
                .from('tasks')
                .select('*')
                .eq('id', id)
                .eq('user_id', req.user.id)
                .single();
            currentTask = taskData;
        }

        const { data, error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // If completing a recurring task, create the next instance
        if (updates.completed === true && currentTask?.is_recurring && currentTask?.recurrence_pattern) {
            const nextDueDate = calculateNextDueDate(currentTask.due_date, currentTask.recurrence_pattern);

            await supabase
                .from('tasks')
                .insert({
                    user_id: req.user.id,
                    text: currentTask.text,
                    completed: false,
                    due_date: nextDueDate,
                    is_recurring: true,
                    recurrence_pattern: currentTask.recurrence_pattern,
                    parent_task_id: id
                });
        }

        res.json(data);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Helper function to calculate next due date
function calculateNextDueDate(currentDueDate, pattern) {
    const date = currentDueDate ? new Date(currentDueDate) : new Date();

    switch (pattern) {
        case 'daily':
            date.setDate(date.getDate() + 1);
            break;
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'yearly':
            date.setFullYear(date.getFullYear() + 1);
            break;
    }

    return date.toISOString().split('T')[0];
}

// Delete a task
app.delete('/api/tasks/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { deleteSeries } = req.query;

        if (deleteSeries === 'true') {
            // Delete all tasks in the series (parent and children)
            const { data: task } = await supabase
                .from('tasks')
                .select('parent_task_id')
                .eq('id', id)
                .eq('user_id', req.user.id)
                .single();

            if (task) {
                const parentId = task.parent_task_id || id;

                // Delete children first
                await supabase
                    .from('tasks')
                    .delete()
                    .eq('parent_task_id', parentId)
                    .eq('user_id', req.user.id);

                // Delete parent
                await supabase
                    .from('tasks')
                    .delete()
                    .eq('id', parentId)
                    .eq('user_id', req.user.id);
            }
        } else {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', id)
                .eq('user_id', req.user.id);

            if (error) throw error;
        }

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Delete all completed tasks for user
app.delete('/api/tasks/completed/all', authenticate, async (req, res) => {
    try {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('user_id', req.user.id)
            .eq('completed', true);

        if (error) throw error;

        res.status(204).send();
    } catch (error) {
        console.error('Error clearing completed tasks:', error);
        res.status(500).json({ error: 'Failed to clear completed tasks' });
    }
});

// ============================================
// USER PREFERENCES API ROUTES
// ============================================

// Get user preferences
app.get('/api/preferences', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', req.user.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        // Return default preferences if none exist
        res.json(data || { theme: 'dark' });
    } catch (error) {
        console.error('Error fetching preferences:', error);
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});

// Update user preferences
app.put('/api/preferences', authenticate, async (req, res) => {
    try {
        const { theme } = req.body;

        if (theme && !['dark', 'light'].includes(theme)) {
            return res.status(400).json({ error: 'Invalid theme value' });
        }

        // Upsert preferences
        const { data, error } = await supabase
            .from('user_preferences')
            .upsert({
                user_id: req.user.id,
                theme: theme || 'dark'
            }, {
                onConflict: 'user_id'
            })
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

// ============================================
// USER INFO ENDPOINT
// ============================================

app.get('/api/user', authenticate, async (req, res) => {
    res.json({
        id: req.user.id,
        email: req.user.email,
        name: req.user.user_metadata?.full_name || req.user.user_metadata?.name || null,
        avatar: req.user.user_metadata?.avatar_url || req.user.user_metadata?.picture || null
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Clarity API server running on port ${PORT}`);
});
