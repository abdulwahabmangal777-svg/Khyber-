import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import apiRouter from './server/routes';
import { initDatabase } from './server/db';
import { setupLiveApiWebSocket } from './server/ai/liveApi';
import { startIqamaScheduler } from './server/iqamaNotifications';
import { initReportSchedulerEngine } from './server/reportScheduler';

// Configure Google Maps Platform API key (User provided project key)
const USER_MAPS_KEY = 'AIzaSyAaQD83aR4m4jgb3lirlkDeys4A1Q4V_ZY';
process.env.VITE_GOOGLE_MAPS_API_KEY = USER_MAPS_KEY;
process.env.GOOGLE_MAPS_API_KEY = USER_MAPS_KEY;

async function startServer() {
  // Initialize embedded relational database
  initDatabase();

  // Initialize automated Three-Stage Iqama reminder & ERP Webhook scheduler
  startIqamaScheduler();

  // Initialize automated weekly & monthly recurring fleet report scheduler
  initReportSchedulerEngine();

  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // JSON & URL-encoded request body parsing
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Routes MUST be mounted before Vite / static handlers
  app.use('/api', apiRouter);

  // Setup Live API WebSocket bridge for gemini-3.1-flash-live-preview
  setupLiveApiWebSocket(server);

  // Health check endpoint (for Cloud Run probes and external uptime monitors)
  app.get(['/health', '/api/health'], (req, res) => {
    res.json({
      status: 'ok',
      service: 'Saudi Fleet & Workforce Management System',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Google AdSense & AdMob crawler verification (ads.txt and app-ads.txt)
  app.get('/ads.txt', (req, res) => {
    res.type('text/plain');
    const filePath = path.join(process.cwd(), 'public', 'ads.txt');
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.send('google.com, pub-1036802722878553, DIRECT, f08c47fec0942fa0\n');
    }
  });

  app.get('/app-ads.txt', (req, res) => {
    res.type('text/plain');
    const filePath = path.join(process.cwd(), 'public', 'app-ads.txt');
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.send('# Google Mobile Ads / Google AdMob app-ads.txt\n# Package Name: com.khyber.logistics\n# AdMob Application ID: ca-app-pub-1036802722878553~9890117209\n# AdMob Ad Unit ID: ca-app-pub-1036802722878553/8632875853\ngoogle.com, pub-1036802722878553, DIRECT, f08c47fec0942fa0\n');
    }
  });

  // Serve public assets (e.g. logos, icons)
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : fs.existsSync(path.join(__dirname, 'index.html'))
        ? __dirname
        : path.resolve('dist');
    const indexPath = path.join(distPath, 'index.html');
    
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Application build files not found. Please run npm run build.');
      }
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` Fleet & Workforce Management System (Saudi Arabia) `);
    console.log(` Server running on http://0.0.0.0:${PORT}            `);
    console.log(` Live API WebSocket on ws://0.0.0.0:${PORT}/api/live-assistant `);
    console.log(`====================================================`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
