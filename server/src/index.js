/**
 * Clarity Todo - Express API Server
 * Simplified version - just tasks, no complex features
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// Disable ETag generation to prevent 304 responses
app.set('etag', false);

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(express.json());

// CORS configuration
const allowedOrigins = [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'https://clarity-todo.netlify.app'
].filter(Boolean);

console.log('Allowed CORS origins:', allowedOrigins);

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200, // Return 200 instead of 204 for OPTIONS
    maxAge: 86400 // Cache preflight for 24 hours
}));

// Explicit OPTIONS handler for all routes (belt and suspenders)
app.options('*', cors());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
    next();
});

// Disable caching for all API routes
app.use('/api', (req, res, next) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    next();
});

// Auth middleware - verify Supabase JWT
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('Auth failed: Missing or invalid authorization header');
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.log('Auth failed: Invalid or expired token', error);
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
        console.log('Fetching tasks for user:', req.user.id);

        const { data, error } = await supabase
            .from('tasks')
            .select('id, user_id, text, completed, created_at')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error fetching tasks:', error);
            throw error;
        }

        console.log('Found tasks:', data?.length || 0);
        res.json(data || []);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Create a new task
app.post('/api/tasks', authenticate, async (req, res) => {
    try {
        const { text } = req.body;

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({ error: 'Task text is required' });
        }

        if (text.length > 200) {
            return res.status(400).json({ error: 'Task text must be 200 characters or less' });
        }

        console.log('Creating task for user:', req.user.id);

        const { data, error } = await supabase
            .from('tasks')
            .insert({
                user_id: req.user.id,
                text: text.trim(),
                completed: false
            })
            .select('id, user_id, text, completed, created_at')
            .single();

        if (error) {
            console.error('Supabase error creating task:', error);
            throw error;
        }

        console.log('Created task:', data.id);
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
        const { text, completed } = req.body;

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

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        console.log('Updating task:', id, 'for user:', req.user.id);

        const { data, error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select('id, user_id, text, completed, created_at')
            .single();

        if (error) {
            console.error('Supabase error updating task:', error);
            throw error;
        }

        if (!data) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(data);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Delete all completed tasks for user
// IMPORTANT: This route must be defined BEFORE /api/tasks/:id
// because Express matches routes in order and :id would match "completed"
app.delete('/api/tasks/completed/all', authenticate, async (req, res) => {
    try {
        console.log('Clearing completed tasks for user:', req.user.id);

        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('user_id', req.user.id)
            .eq('completed', true);

        if (error) {
            console.error('Supabase error clearing completed:', error);
            throw error;
        }

        res.status(204).send();
    } catch (error) {
        console.error('Error clearing completed tasks:', error);
        res.status(500).json({ error: 'Failed to clear completed tasks' });
    }
});

// Delete a task
app.delete('/api/tasks/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        console.log('Deleting task:', id, 'for user:', req.user.id);

        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);

        if (error) {
            console.error('Supabase error deleting task:', error);
            throw error;
        }

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
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

// 404 handler for undefined routes
app.use((req, res) => {
    console.log('404 - Route not found:', req.method, req.path);
    res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Clarity API server running on port ${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Client URL:', process.env.CLIENT_URL || 'http://localhost:5173');
});
