import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import express from 'express';
import session from 'express-session';
import methodOverride from 'method-override';
import { attachViewData } from './middleware/view-data.js';
import authRoutes from './routes/auth-routes.js';
import executiveRoutes from './routes/executive-routes.js';
import representativeRoutes from './routes/representative-routes.js';
import studentRoutes from './routes/student-routes.js';
import accountRoutes from './routes/account-routes.js';
import apiRoutes from './routes/api-routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize PHP Base Layer on startup
 * This validates environment, database config, and framework coordination
 */
function initializePhpBase() {
  try {
    const phpInitPath = path.join(__dirname, 'php', 'init.php');
    console.log('\n===============================================');
    console.log(' Initializing PHP Base Layer');
    console.log('===============================================\n');

    execSync(`php "${phpInitPath}"`, { stdio: 'inherit' });
    console.log('\nOK PHP base layer initialized successfully\n');
  } catch (error) {
    console.warn('PHP initialization warning:', error.message);
    console.log('  Continuing without PHP base layer validation...\n');
  }
}

// Initialize PHP on startup
initializePhpBase();

const app = express();
const PORT = Number.parseInt(process.env.PORT || '', 10) || 3001;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'syncclear-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' }
  })
);
app.use((req, res, next) => {
  req.flash = (type, message) => {
    if (message === undefined) {
      const messages = req.session.flash?.[type] || [];
      if (req.session.flash) req.session.flash[type] = [];
      return messages;
    }

    req.session.flash ||= {};
    req.session.flash[type] ||= [];
    req.session.flash[type].push(message);
    return req.session.flash[type];
  };
  next();
});
app.use(attachViewData);

app.use('/css', express.static(path.join(__dirname, '..', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', 'js')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

app.use('/', authRoutes);
app.use('/executive', executiveRoutes);
app.use('/representative', representativeRoutes);
app.use('/student', studentRoutes);
app.use('/account', accountRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).render('error', { title: 'Not Found', message: 'Page not found.' });
});

app.use((error, req, res, next) => {
  console.error(error);
  const wantsJson = req.headers.accept?.includes('application/json') || req.xhr;
  if (wantsJson) {
    const message =
      error?.name === 'MulterError'
        ? error.message
        : String(error?.message || 'Something went wrong.');
    return res.status(500).json({ success: false, message });
  }
  res.status(500).render('error', { title: 'Server Error', message: 'Something went wrong.' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
