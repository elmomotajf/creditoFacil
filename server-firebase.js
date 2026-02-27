import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcryptjs from 'bcryptjs';
import multer from 'multer';
import AWS from 'aws-sdk';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import {
  initializeFirebase,
  isFirebaseReady,
  getFirebaseInitErrorMessage,
  db,
  createLoan,
  getLoans,
  getLoanById,
  updateLoan,
  deleteLoan,
  createInstallment,
  updateInstallment,
  getProfitTrends,
  getUpcomingPayments,
  createPaymentProof
} from './firebase-service.js';
import {
  calculatePaymentStatusFromInstallments,
  deriveLoanStatus,
  generateInstallmentDates,
  normalizeLoanStatus,
} from './utils/loan-utils.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
initializeFirebase();
const upload = multer({ storage: multer.memoryStorage() });
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  console.warn('⚠️ JWT_SECRET is not configured. Authentication endpoints will fail until it is provided.');
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()) : true,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Configure AWS S3 (only if real credentials are provided)
const hasAwsCredentials =
  process.env.AWS_ACCESS_KEY_ID &&
  !process.env.AWS_ACCESS_KEY_ID.startsWith('your-') &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  !process.env.AWS_SECRET_ACCESS_KEY.startsWith('your-');

let s3 = null;
if (hasAwsCredentials) {
  s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
  console.log('✅ AWS S3 configured');
} else {
  console.warn('⚠️ AWS S3 not configured (placeholder credentials detected). File uploads will be disabled.');
}

// Configure Google Calendar OAuth
let oauth2Client = null;
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback'}`
  );
}

if (oauth2Client) {
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens && Object.keys(tokens).length > 0) {
      try {
        await saveGoogleTokens(tokens);
      } catch (error) {
        console.error('Error saving refreshed Google tokens:', error.message);
      }
    }
  });
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Try again later.' },
});

function getInstallmentArray(installments) {
  if (!installments) {
    return [];
  }

  return Array.isArray(installments) ? installments : Object.values(installments);
}

function parseDateInput(dateValue) {
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return new Date(`${dateValue}T00:00:00.000Z`);
  }

  return new Date(dateValue);
}

function validateCreateLoanPayload(payload) {
  const errors = [];
  const friendName = String(payload.friendName || '').trim();
  const initialValue = Number.parseFloat(payload.initialValue);
  const interestRate = Number.parseFloat(payload.interestRate);
  const latePaymentPenalty = Number.parseFloat(payload.latePaymentPenalty || 0);
  const numberOfInstallments = Number.parseInt(payload.numberOfInstallments, 10);
  const loanDate = parseDateInput(payload.loanDate);
  const finalPaymentDate = parseDateInput(payload.finalPaymentDate);

  if (!friendName) errors.push('friendName is required');
  if (!Number.isFinite(initialValue) || initialValue <= 0) errors.push('initialValue must be greater than 0');
  if (!Number.isFinite(interestRate) || interestRate < 0) errors.push('interestRate must be 0 or greater');
  if (!Number.isFinite(latePaymentPenalty) || latePaymentPenalty < 0) errors.push('latePaymentPenalty must be 0 or greater');
  if (!Number.isInteger(numberOfInstallments) || numberOfInstallments < 1 || numberOfInstallments > 360) {
    errors.push('numberOfInstallments must be between 1 and 360');
  }
  if (Number.isNaN(loanDate.getTime())) errors.push('loanDate is invalid');
  if (Number.isNaN(finalPaymentDate.getTime())) errors.push('finalPaymentDate is invalid');
  if (!Number.isNaN(loanDate.getTime()) && !Number.isNaN(finalPaymentDate.getTime()) && finalPaymentDate <= loanDate) {
    errors.push('finalPaymentDate must be after loanDate');
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      friendName,
      initialValue,
      interestRate,
      latePaymentPenalty,
      numberOfInstallments,
      loanDate,
      finalPaymentDate,
      notes: String(payload.notes || '').trim(),
    },
  };
}

async function getSavedGoogleTokens() {
  const snapshot = await db().ref('system/googleCalendarTokens').once('value');
  return snapshot.val();
}

async function saveGoogleTokens(tokens) {
  const currentTokens = await getSavedGoogleTokens();
  const mergedTokens = {
    ...(currentTokens || {}),
    ...(tokens || {}),
  };

  if (!mergedTokens.refresh_token && currentTokens?.refresh_token) {
    mergedTokens.refresh_token = currentTokens.refresh_token;
  }

  await db().ref('system/googleCalendarTokens').set({
    ...mergedTokens,
    updatedAt: Date.now(),
  });

  return mergedTokens;
}

async function getGoogleCalendarClient() {
  if (!oauth2Client) {
    return { error: 'Google Calendar not configured' };
  }

  const tokens = await getSavedGoogleTokens();
  if (!tokens?.access_token && !tokens?.refresh_token) {
    return { error: 'Google Calendar not authenticated' };
  }

  oauth2Client.setCredentials(tokens);

  try {
    await oauth2Client.getAccessToken();
  } catch (error) {
    return { error: 'Google Calendar token refresh failed', details: error.message };
  }

  const latestTokens = await saveGoogleTokens(oauth2Client.credentials);
  oauth2Client.setCredentials(latestTokens);

  return {
    client: oauth2Client,
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
  };
}

// ==================== FIREBASE PASSWORD FUNCTIONS ====================

async function getPasswordFromFirebase() {
  try {
    const snapshot = await db().ref('system/passwordHash').once('value');
    return snapshot.val();
  } catch (error) {
    console.error('Error getting password from Firebase:', error);
    return null;
  }
}

async function setPasswordInFirebase(passwordHash) {
  try {
    await db().ref('system').set({
      passwordHash: passwordHash,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    return true;
  } catch (error) {
    console.error('Error setting password in Firebase:', error);
    return false;
  }
}

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Unauthorized: missing bearer token' });
  }

  if (!jwtSecret) {
    return res.status(500).json({ error: 'JWT_SECRET is not configured' });
  }

  try {
    req.auth = jwt.verify(token, jwtSecret);
    next();
  } catch (_) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Routes

function ensureFirebaseReady(req, res, next) {
  if (!isFirebaseReady()) {
    return res.status(503).json({
      error: 'Firebase is not initialized',
      details: getFirebaseInitErrorMessage(),
    });
  }

  next();
}

// 1. Password Setup (first time only)
app.post('/api/auth/setup-password', ensureFirebaseReady, authLimiter, async (req, res) => {
  try {
    // Check if password already exists in Firebase
    const existingPassword = await getPasswordFromFirebase();
    
    if (existingPassword) {
      return res.status(400).json({ error: 'Password already set' });
    }

    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const hash = await bcryptjs.hash(password, 10);
    
    // Save to Firebase
    const saved = await setPasswordInFirebase(hash);
    
    if (!saved) {
      return res.status(500).json({
        error: 'Failed to save password in Firebase. Check FIREBASE_DATABASE_URL and service account credentials.'
      });
    }

    res.json({ success: true, message: 'Password set successfully' });
  } catch (error) {
    console.error('Error setting password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Password Login
app.post('/api/auth/login', ensureFirebaseReady, authLimiter, async (req, res) => {
  try {
    // Get password from Firebase
    const passwordHash = await getPasswordFromFirebase();
    
    if (!passwordHash) {
      return res.status(400).json({ error: 'Password not set up yet' });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    const isValid = await bcryptjs.compare(password, passwordHash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT_SECRET is not configured' });
    }

    const token = jwt.sign(
      { role: 'admin' },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    res.json({ success: true, token });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Check if password is set
app.get('/api/auth/status', ensureFirebaseReady, async (req, res) => {
  try {
    const passwordHash = await getPasswordFromFirebase();
    res.json({ passwordSet: !!passwordHash });
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.json({ passwordSet: false });
  }
});

// 4. Create Loan
app.post('/api/loans', authMiddleware, async (req, res) => {
  try {
    const validation = validateCreateLoanPayload(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors.join('; ') });
    }

    const {
      friendName,
      initialValue,
      interestRate,
      loanDate,
      finalPaymentDate,
      latePaymentPenalty,
      numberOfInstallments,
      notes,
    } = validation.value;

    const totalValue = initialValue * (1 + interestRate / 100);
    const profit = totalValue - initialValue;
    const installmentValue = totalValue / numberOfInstallments;
    const installmentDates = generateInstallmentDates(loanDate, finalPaymentDate, numberOfInstallments);

    // Create loan using Firebase
    const loan = await createLoan({
      friendName,
      initialValue,
      interestRate,
      latePaymentPenalty,
      totalValue,
      profit,
      totalLateFees: 0,
      loanDate: loanDate.toISOString(),
      finalPaymentDate: finalPaymentDate.toISOString(),
      status: 'active',
      notes: notes || '',
    });

    for (let i = 1; i <= numberOfInstallments; i++) {
      await createInstallment(loan.id, {
        installmentNumber: i,
        value: installmentValue,
        dueDate: installmentDates[i - 1],
        status: 'pending',
        paidDate: null,
      });
    }

    res.json({ success: true, loan });
  } catch (error) {
    console.error('Error creating loan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. Get All Loans
app.get('/api/loans', authMiddleware, async (req, res) => {
  try {
    const loans = await getLoans();

    // Calculate payment status for each loan
    const loansWithStatus = loans.map((loan) => ({
      ...loan,
      status: normalizeLoanStatus(loan.status),
      paymentStatus: calculatePaymentStatusFromInstallments(getInstallmentArray(loan.installments)),
    }));

    res.json(loansWithStatus);
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. Get Loan by ID
app.get('/api/loans/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const loan = await getLoanById(id);

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Convert installments object to array and add payment proofs
    const installmentsArray = loan.installments 
      ? Object.values(loan.installments).map(inst => ({
          ...inst,
          paymentProofs: inst.proofs ? Object.values(inst.proofs) : []
        }))
      : [];

    const loanWithStatus = {
      ...loan,
      installments: installmentsArray,
      status: normalizeLoanStatus(loan.status),
      paymentStatus: calculatePaymentStatusFromInstallments(getInstallmentArray(loan.installments)),
    };

    res.json(loanWithStatus);
  } catch (error) {
    console.error('Error fetching loan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. Update Loan
app.put('/api/loans/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { friendName, status, notes } = req.body;

    const updates = {};
    if (typeof friendName === 'string' && friendName.trim()) {
      updates.friendName = friendName.trim();
    }
    if (typeof notes === 'string') {
      updates.notes = notes.trim();
    }
    if (status) {
      updates.status = normalizeLoanStatus(status);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const loan = await updateLoan(id, updates);

    res.json(loan);
  } catch (error) {
    console.error('Error updating loan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 8. Delete Loan
app.delete('/api/loans/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    await deleteLoan(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting loan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 9. Update Installment Status
app.put('/api/installments/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, loanId } = req.body;

    if (!loanId) {
      return res.status(400).json({ error: 'loanId is required' });
    }

    if (!['pending', 'paid', 'overdue'].includes(status)) {
      return res.status(400).json({ error: 'status must be one of: pending, paid, overdue' });
    }

    const installment = await updateInstallment(loanId, id, {
      status,
      paidDate: status === 'paid' ? new Date().toISOString() : null,
    });

    const loan = await getLoanById(loanId);
    if (loan) {
      const installmentArray = getInstallmentArray(loan.installments);
      const nextLoanStatus = deriveLoanStatus(installmentArray, loan.status);
      if (nextLoanStatus !== loan.status) {
        await updateLoan(loanId, { status: nextLoanStatus });
      }
    }

    res.json(installment);
  } catch (error) {
    console.error('Error updating installment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 10. Upload Payment Proof
app.post('/api/upload-proof', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!s3) {
      return res.status(503).json({ error: 'File upload is not configured. AWS S3 credentials are missing.' });
    }

    const { installmentId, loanId } = req.body;

    if (!loanId || !installmentId) {
      return res.status(400).json({ error: 'loanId and installmentId are required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileName = `proofs/${Date.now()}-${req.file.originalname}`;

    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    const s3Result = await s3.upload(params).promise();

    // Save proof to Firebase
    const proof = await createPaymentProof(loanId, installmentId, {
      imageUrl: s3Result.Location,
      imageKey: s3Result.Key,
      uploadedAt: Date.now(),
    });

    res.json({ success: true, proof });
  } catch (error) {
    console.error('Error uploading proof:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 11. Dashboard Summary
app.get('/api/dashboard/summary', authMiddleware, async (req, res) => {
  try {
    const loans = await getLoans();

    const totalLoans = loans.length;
    const activeLoans = loans.filter((l) => l.status === 'active').length;
    const completedLoans = loans.filter((l) => l.status === 'completed').length;

    let totalProfit = 0;
    let overduePayments = 0;

    loans.forEach((loan) => {
      totalProfit += parseFloat(loan.profit || 0);
      
      if (loan.installments) {
        Object.values(loan.installments).forEach((inst) => {
          if (inst.status === 'overdue' || (inst.status === 'pending' && new Date(inst.dueDate) < new Date())) {
            overduePayments += 1;
          }
        });
      }
    });

    res.json({
      totalLoans,
      activeLoans,
      completedLoans,
      totalProfit,
      overduePayments,
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 12. Get Upcoming Payments
app.get('/api/dashboard/upcoming-payments', authMiddleware, async (req, res) => {
  try {
    const upcomingPayments = await getUpcomingPayments();

    // Limit to 10 and format
    const formattedPayments = upcomingPayments.slice(0, 10).map(payment => ({
      ...payment,
      loan: {
        friendName: payment.friendName
      }
    }));

    res.json(formattedPayments);
  } catch (error) {
    console.error('Error fetching upcoming payments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 13. Get Profit Trends
app.get('/api/dashboard/profit-trends', authMiddleware, async (req, res) => {
  try {
    const trends = await getProfitTrends();

    const formattedTrends = trends.map((trend) => ({
      date: trend.date,
      dailyProfit: parseFloat(trend.dailyProfit),
      cumulativeProfit: parseFloat(trend.cumulativeProfit),
    }));

    res.json(formattedTrends);
  } catch (error) {
    console.error('Error fetching profit trends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Google Calendar Integration ====================

// 14. Get Google Calendar Auth URL
app.get('/api/google/auth-url', (req, res) => {
  if (!oauth2Client) {
    return res.status(400).json({ error: 'Google Calendar not configured' });
  }

  const scopes = ['https://www.googleapis.com/auth/calendar'];
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    include_granted_scopes: true,
  });

  res.json({ authUrl });
});

// 15. Google Calendar OAuth Callback
app.get('/api/google/callback', ensureFirebaseReady, async (req, res) => {
  try {
    const { code } = req.query;

    if (!oauth2Client || !code) {
      return res.status(400).json({ error: 'Missing code or OAuth client' });
    }

    const { tokens } = await oauth2Client.getToken(code);
  const savedTokens = await saveGoogleTokens(tokens);
  oauth2Client.setCredentials(savedTokens);

    // Redirect to dashboard with success message
    res.redirect('/?google_sync=success');
  } catch (error) {
    console.error('Error during Google OAuth callback:', error);
    res.redirect('/?google_sync=error');
  }
});

// 16. Sync Loans to Google Calendar
app.post('/api/google/sync-loans', ensureFirebaseReady, authMiddleware, async (req, res) => {
  try {
    const { calendar, error } = await getGoogleCalendarClient();
    if (!calendar) {
      return res.status(400).json({ error: error || 'Google Calendar not authenticated' });
    }

    const loans = await getLoans();

    const createdEvents = [];

    for (const loan of loans) {
      // Create event for loan final payment date
      const event = {
        summary: `Empréstimo - ${loan.friendName} (Vencimento Final)`,
        description: `Valor Total: R$ ${parseFloat(loan.totalValue).toFixed(2)}\nLucro: R$ ${parseFloat(loan.profit).toFixed(2)}`,
        start: {
          date: new Date(loan.finalPaymentDate).toISOString().split('T')[0],
        },
        end: {
          date: new Date(new Date(loan.finalPaymentDate).getTime() + 86400000).toISOString().split('T')[0],
        },
        colorId: '2', // Blue
      };

      const createdEvent = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      createdEvents.push(createdEvent.data);
    }

    res.json({ success: true, eventsCreated: createdEvents.length });
  } catch (error) {
    console.error('Error syncing loans to Google Calendar:', error);
    res.status(500).json({ error: 'Failed to sync loans' });
  }
});

// 17. Sync Installments to Google Calendar
app.post('/api/google/sync-installments', ensureFirebaseReady, authMiddleware, async (req, res) => {
  try {
    const { calendar, error } = await getGoogleCalendarClient();
    if (!calendar) {
      return res.status(400).json({ error: error || 'Google Calendar not authenticated' });
    }

    const upcomingPayments = await getUpcomingPayments();

    const createdEvents = [];

    for (const installment of upcomingPayments) {
      if (installment.status === 'pending') {
        const event = {
          summary: `Parcela ${installment.installmentNumber} - ${installment.friendName}`,
          description: `Valor: R$ ${parseFloat(installment.value).toFixed(2)}\nEmpréstimo: ${installment.friendName}`,
          start: {
            date: new Date(installment.dueDate).toISOString().split('T')[0],
          },
          end: {
            date: new Date(new Date(installment.dueDate).getTime() + 86400000).toISOString().split('T')[0],
          },
          colorId: '5', // Yellow
        };

        const createdEvent = await calendar.events.insert({
          calendarId: 'primary',
          resource: event,
        });

        createdEvents.push(createdEvent.data);
      }
    }

    res.json({ success: true, eventsCreated: createdEvents.length });
  } catch (error) {
    console.error('Error syncing installments to Google Calendar:', error);
    res.status(500).json({ error: 'Failed to sync installments' });
  }
});

// 18. Check Google Calendar Auth Status
app.get('/api/google/auth-status', ensureFirebaseReady, async (req, res) => {
  try {
    const tokens = await getSavedGoogleTokens();
    res.json({ authenticated: !!(tokens?.refresh_token || tokens?.access_token) });
  } catch (_error) {
    res.status(500).json({ authenticated: false, error: 'Failed to check Google auth status' });
  }
});

// 19. Health Check
app.get('/api/health', async (req, res) => {
  const basePayload = {
    status: 'ok',
    service: 'creditoFacil',
    environment: process.env.VERCEL ? 'vercel' : 'local',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  };

  try {
    await db().ref('system').child('healthcheck').once('value');
    return res.status(200).json({
      ...basePayload,
      firebase: 'ok',
    });
  } catch (_error) {
    return res.status(503).json({
      ...basePayload,
      status: 'degraded',
      firebase: 'error',
      error: 'Firebase connection failed',
    });
  }
});

// Fallback: serve index.html for non-API routes (SPA support)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PREFERRED_PORT = Number(process.env.PORT) || 3000;
const MAX_PORT_ATTEMPTS = 10;

function startServer(port, attempts = 0) {
  const server = app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📊 Using Firebase Realtime Database`);
    console.log(`🔐 Password storage: Firebase`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && !process.env.PORT && attempts < MAX_PORT_ATTEMPTS) {
      const nextPort = port + 1;
      console.warn(`⚠️ Port ${port} is in use. Trying ${nextPort}...`);
      startServer(nextPort, attempts + 1);
      return;
    }

    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  });
}

if (!process.env.VERCEL) {
  startServer(PREFERRED_PORT);
}

// Graceful shutdown
if (!process.env.VERCEL) {
  process.on('SIGINT', () => {
    console.log('👋 Shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('👋 Shutting down gracefully...');
    process.exit(0);
  });
}

export default app;