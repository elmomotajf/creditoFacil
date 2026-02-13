import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcryptjs from 'bcryptjs';
import multer from 'multer';
import AWS from 'aws-sdk';
import { google } from 'googleapis';
// import { OAuth2Client } from 'google-auth-library'; // Not needed for current implementation

const { PrismaClient } = pkg;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
import { initializeFirebase, db, createLoan, getLoans, getLoanById, updateLoan, deleteLoan, updateInstallment, uploadPaymentProof, getDashboardSummary, getUpcomingPayments, getProfitTrends } from './firebase-service.js';
initializeFirebase();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Configure Google Calendar OAuth
let oauth2Client = null;
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback'}`
  );
}

let googleCalendarToken = null;

// Store password hash in memory (for single user)
let passwordHash = null;
let isPasswordSet = false;

// Calculate payment status based on installments
function calculatePaymentStatus(installments) {
  if (!installments || installments.length === 0) {
    return 'pending';
  }

  const now = new Date();
  let totalInstallments = installments.length;
  let paidInstallments = 0;
  let overdueInstallments = 0;

  installments.forEach((inst) => {
    if (inst.status === 'paid') {
      paidInstallments++;
    } else if (inst.status === 'overdue' || (inst.status === 'pending' && new Date(inst.dueDate) < now)) {
      overdueInstallments++;
    }
  });

  if (paidInstallments === totalInstallments) {
    return 'paid';
  } else if (overdueInstallments > 0) {
    return 'overdue';
  } else {
    return 'pending';
  }
}

// Initialize password from environment or database
async function initializePassword() {
  try {
    // In production, you might want to store this in a config table
    // For now, we'll use environment variable if available
    if (process.env.ADMIN_PASSWORD_HASH) {
      passwordHash = process.env.ADMIN_PASSWORD_HASH;
      isPasswordSet = true;
    }
  } catch (error) {
    console.error('Error initializing password:', error);
  }
}

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Simple token validation (in production, use JWT)
  if (token !== process.env.SESSION_TOKEN) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  next();
};

// Routes

// 1. Password Setup (first time only)
app.post('/api/auth/setup-password', async (req, res) => {
  try {
    if (isPasswordSet) {
      return res.status(400).json({ error: 'Password already set' });
    }

    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const hash = await bcryptjs.hash(password, 10);
    passwordHash = hash;
    isPasswordSet = true;

    res.json({ success: true, message: 'Password set successfully' });
  } catch (error) {
    console.error('Error setting password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Password Login
app.post('/api/auth/login', async (req, res) => {
  try {
    if (!isPasswordSet) {
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

    // Generate a simple session token
    const token = Buffer.from(`${Date.now()}:${Math.random()}`).toString('base64');
    process.env.SESSION_TOKEN = token;

    res.json({ success: true, token });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Check if password is set
app.get('/api/auth/status', (req, res) => {
  res.json({ passwordSet: isPasswordSet });
});

// 4. Create Loan
app.post('/api/loans', authMiddleware, async (req, res) => {
  try {
    const {
      friendName,
      initialValue,
      interestRate,
      loanDate,
      finalPaymentDate,
      latePaymentPenalty,
      numberOfInstallments,
      notes,
    } = req.body;

    const startDate = new Date(loanDate);
    const endDate = new Date(finalPaymentDate);
    
    if (endDate <= startDate) {
      return res.status(400).json({ error: 'Data final deve ser apos a data inicial' });
    }

    const totalValue = parseFloat(initialValue) * (1 + parseFloat(interestRate) / 100);
    const profit = totalValue - parseFloat(initialValue);

    const loan = await prisma.loan.create({
      data: {
        friendName,
        initialValue: parseFloat(initialValue),
        interestRate: parseFloat(interestRate),
        latePaymentPenalty: parseFloat(latePaymentPenalty) || 0,
        totalValue,
        profit,
        totalLateFees: 0,
        loanDate: startDate,
        finalPaymentDate: endDate,
        notes,
      },
    });

    const installmentValue = totalValue / numberOfInstallments;
    const installmentDays = Math.floor(
      (endDate - startDate) / (1000 * 60 * 60 * 24)
    ) / numberOfInstallments;

    for (let i = 1; i <= numberOfInstallments; i++) {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + Math.floor(installmentDays * i));

      await prisma.installment.create({
        data: {
          loanId: loan.id,
          installmentNumber: i,
          value: installmentValue,
          dueDate,
        },
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
    const loans = await prisma.loan.findMany({
      include: {
        installments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const loansWithStatus = loans.map((loan) => ({
      ...loan,
      paymentStatus: calculatePaymentStatus(loan.installments),
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

    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        installments: {
          include: {
            paymentProofs: true,
          },
        },
      },
    });

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loanWithStatus = {
      ...loan,
      paymentStatus: calculatePaymentStatus(loan.installments),
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

    const loan = await prisma.loan.update({
      where: { id },
      data: {
        friendName,
        status,
        notes,
      },
    });

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

    await prisma.loan.delete({
      where: { id },
    });

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
    const { status } = req.body;

    const installment = await prisma.installment.update({
      where: { id },
      data: {
        status,
        paidDate: status === 'paid' ? new Date() : null,
      },
    });

    res.json(installment);
  } catch (error) {
    console.error('Error updating installment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 10. Upload Payment Proof
app.post('/api/upload-proof', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { installmentId } = req.body;

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

    // Save proof to database
    const proof = await prisma.paymentProof.create({
      data: {
        installmentId,
        imageUrl: s3Result.Location,
        imageKey: s3Result.Key,
      },
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
    const loans = await prisma.loan.findMany({
      include: {
        installments: true,
      },
    });

    const totalLoans = loans.length;
    const activeLoans = loans.filter((l) => l.status === 'active').length;
    const completedLoans = loans.filter((l) => l.status === 'completed').length;

    let totalProfit = 0;
    let overduePayments = 0;

    loans.forEach((loan) => {
      totalProfit += parseFloat(loan.profit);
      loan.installments.forEach((inst) => {
        if (inst.status === 'overdue') {
          overduePayments += 1;
        }
      });
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
    const installments = await prisma.installment.findMany({
      where: {
        status: 'pending',
      },
      include: {
        loan: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
      take: 10,
    });

    res.json(installments);
  } catch (error) {
    console.error('Error fetching upcoming payments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 13. Get Profit Trends
app.get('/api/dashboard/profit-trends', authMiddleware, async (req, res) => {
  try {
    const loans = await prisma.loan.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });

    const trends = loans.map((loan) => ({
      date: loan.loanDate.toISOString().split('T')[0],
      profit: parseFloat(loan.profit),
    }));

    res.json(trends);
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
  });

  res.json({ authUrl });
});

// 15. Google Calendar OAuth Callback
app.get('/api/google/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!oauth2Client || !code) {
      return res.status(400).json({ error: 'Missing code or OAuth client' });
    }

    const { tokens } = await oauth2Client.getToken(code);
    googleCalendarToken = tokens;
    oauth2Client.setCredentials(tokens);

    // Redirect to dashboard with success message
    res.redirect('/?google_sync=success');
  } catch (error) {
    console.error('Error during Google OAuth callback:', error);
    res.redirect('/?google_sync=error');
  }
});

// 16. Sync Loans to Google Calendar
app.post('/api/google/sync-loans', authMiddleware, async (req, res) => {
  try {
    if (!oauth2Client || !googleCalendarToken) {
      return res.status(400).json({ error: 'Google Calendar not authenticated' });
    }

    oauth2Client.setCredentials(googleCalendarToken);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const loans = await prisma.loan.findMany({
      include: { installments: true },
    });

    const createdEvents = [];

    for (const loan of loans) {
      // Create event for loan final payment date
      const event = {
        summary: `Empréstimo - ${loan.friendName} (Vencimento Final)`,
        description: `Valor Total: R$ ${parseFloat(loan.totalValue).toFixed(2)}\nLucro: R$ ${parseFloat(loan.profit).toFixed(2)}`,
        start: {
          date: loan.finalPaymentDate.toISOString().split('T')[0],
        },
        end: {
          date: new Date(loan.finalPaymentDate.getTime() + 86400000).toISOString().split('T')[0],
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
app.post('/api/google/sync-installments', authMiddleware, async (req, res) => {
  try {
    if (!oauth2Client || !googleCalendarToken) {
      return res.status(400).json({ error: 'Google Calendar not authenticated' });
    }

    oauth2Client.setCredentials(googleCalendarToken);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const installments = await prisma.installment.findMany({
      include: { loan: true },
      where: { status: 'pending' },
    });

    const createdEvents = [];

    for (const installment of installments) {
      const event = {
        summary: `Parcela ${installment.installmentNumber} - ${installment.loan.friendName}`,
        description: `Valor: R$ ${parseFloat(installment.value).toFixed(2)}\nEmpréstimo: ${installment.loan.friendName}`,
        start: {
          date: installment.dueDate.toISOString().split('T')[0],
        },
        end: {
          date: new Date(installment.dueDate.getTime() + 86400000).toISOString().split('T')[0],
        },
        colorId: '5', // Yellow
      };

      const createdEvent = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      createdEvents.push(createdEvent.data);
    }

    res.json({ success: true, eventsCreated: createdEvents.length });
  } catch (error) {
    console.error('Error syncing installments to Google Calendar:', error);
    res.status(500).json({ error: 'Failed to sync installments' });
  }
});

// 18. Check Google Calendar Auth Status
app.get('/api/google/auth-status', (req, res) => {
  res.json({ authenticated: !!googleCalendarToken });
});

// Start server
const PORT = process.env.PORT || 3000;

initializePassword().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
