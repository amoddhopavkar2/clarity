# Clarity

A modern, minimalist to-do list application with Google authentication and cloud sync.

![Clarity](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Google Sign-In**: Secure authentication with your Google account
- **Cloud Sync**: Tasks sync across all your devices
- **Beautiful UI**: Glassmorphism design with smooth animations
- **Full CRUD**: Add, edit, delete, and complete tasks
- **Filters**: View all, active, or completed tasks
- **Responsive**: Works on mobile and desktop
- **Keyboard Accessible**: Full keyboard navigation support

## Tech Stack

### Frontend
- Vanilla JavaScript (ES6+)
- Vite (build tool)
- Supabase Auth (authentication)

### Backend
- Node.js + Express
- Supabase (PostgreSQL database)

### Deployment
- **Frontend**: Netlify
- **Backend**: Railway
- **Database**: Supabase

## Project Structure

```
clarity/
├── client/                 # Frontend application
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── package.json
│   └── vite.config.js
├── server/                 # Backend API
│   ├── src/
│   │   └── index.js
│   ├── package.json
│   └── railway.json
├── netlify.toml            # Netlify deployment config
├── supabase-schema.sql     # Database schema
└── package.json            # Root package.json
```

## Quick Start

### Prerequisites

- Node.js v18 or higher
- A Supabase account (free tier available)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/clarity.git
   cd clarity
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL from `supabase-schema.sql` in the SQL Editor
   - Enable Google OAuth in Authentication > Providers

4. **Configure environment variables**
   ```bash
   # Client
   cp client/.env.example client/.env
   # Edit client/.env with your Supabase URL and anon key

   # Server
   cp server/.env.example server/.env
   # Edit server/.env with your Supabase URL and service role key
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

## Deployment

### Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL from `supabase-schema.sql` in the SQL Editor
3. Enable Google OAuth in Authentication > Providers

### Backend (Railway)
1. Connect your repo at [railway.app](https://railway.app)
2. Set root directory to `server`
3. Add environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CLIENT_URL`

### Frontend (Netlify)
1. Connect your repo at [netlify.com](https://netlify.com)
2. Add environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`

## Environment Variables

### Client (Frontend)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `VITE_API_URL` | Backend API URL |

### Server (Backend)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret) |
| `CLIENT_URL` | Frontend URL (for CORS) |
| `PORT` | Server port (default: 3001) |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/tasks` | Get all tasks for user |
| POST | `/api/tasks` | Create a new task |
| PUT | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task |
| DELETE | `/api/tasks/completed/all` | Clear completed tasks |
| GET | `/api/user` | Get current user info |

All `/api/*` endpoints require authentication via Bearer token.

## Security

- Row Level Security (RLS) ensures users can only access their own data
- Service role key is only used server-side
- All API endpoints validate JWT tokens
- CORS configured for specific origins only

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
