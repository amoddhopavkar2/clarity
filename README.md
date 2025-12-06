# Clarity

A modern, minimalist to-do list application with a beautiful glassmorphism design.

![Clarity](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- Add, edit, and delete tasks
- Mark tasks as complete/incomplete
- Filter tasks by status (All, Active, Completed)
- Clear all completed tasks
- Data persists in localStorage
- Smooth animations and transitions
- Responsive design for mobile and desktop
- Keyboard accessible

## Quick Start

### Option 1: Open directly

Simply open `index.html` in your browser.

### Option 2: Local server

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx serve .
```

Then visit `http://localhost:8000`

## Deploy

### GitHub Pages

1. Push to GitHub
2. Go to Settings > Pages
3. Select "Deploy from a branch"
4. Choose `main` branch and `/ (root)`
5. Save

Your app will be live at `https://<username>.github.io/clarity`

### Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

Drag and drop the project folder to [Netlify Drop](https://app.netlify.com/drop).

### Vercel

```bash
npx vercel
```

## Tech Stack

- HTML5
- CSS3 (Custom Properties, Flexbox, Grid, Animations)
- Vanilla JavaScript (ES6+)
- localStorage API

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
