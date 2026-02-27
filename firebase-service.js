import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

function normalizePrivateKey(value) {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;

  return unquoted.replace(/\\n/g, '\n');
}

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read service account key
const serviceAccountKey = {
  type: process.env.FIREBASE_TYPE || process.env.TYPE || 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID || process.env.PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || process.env.PRIVATE_KEY_ID,
  private_key: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY || process.env.PRIVATE_KEY),
  client_email: process.env.FIREBASE_CLIENT_EMAIL || process.env.CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID || process.env.CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI || process.env.AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI || process.env.TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || process.env.AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || process.env.CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || process.env.UNIVERSE_DOMAIN,
};

// Initialize Firebase Admin SDK
let firebaseApp = null;
let firebaseInitError = null;

export function initializeFirebase() {
  if (!firebaseApp) {
    const databaseURL = process.env.FIREBASE_DATABASE_URL;
    const requiredVars = [
      ['FIREBASE_PROJECT_ID', serviceAccountKey.project_id],
      ['FIREBASE_PRIVATE_KEY_ID', serviceAccountKey.private_key_id],
      ['FIREBASE_PRIVATE_KEY', serviceAccountKey.private_key],
      ['FIREBASE_CLIENT_EMAIL', serviceAccountKey.client_email],
      ['FIREBASE_CLIENT_ID', serviceAccountKey.client_id],
      ['FIREBASE_DATABASE_URL', databaseURL],
    ];
    const missingVars = requiredVars.filter(([, value]) => !value).map(([name]) => name);

    if (!databaseURL) {
      console.warn('⚠️ FIREBASE_DATABASE_URL is not configured. Realtime Database calls may fail.');
    }

    if (missingVars.length > 0) {
      firebaseInitError = new Error(`Missing Firebase env vars: ${missingVars.join(', ')}`);
      console.error('❌ Firebase initialization failed:', firebaseInitError.message);
      return null;
    }

    try {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountKey),
        ...(databaseURL ? { databaseURL } : {}),
      });
      firebaseInitError = null;
      console.log('✅ Firebase initialized successfully');
    } catch (error) {
      firebaseInitError = error;
      firebaseApp = null;
      console.error('❌ Firebase initialization failed:', error.message);
    }
  }
  return firebaseApp;
}

export function isFirebaseReady() {
  return !!firebaseApp;
}

export function getFirebaseInitErrorMessage() {
  return firebaseInitError?.message || null;
}

export const db = () => {
  if (!firebaseApp) {
    throw new Error('Firebase is not initialized');
  }
  return admin.database(firebaseApp);
};

// ==================== LOANS OPERATIONS ====================

export async function createLoan(loanData) {
  const loansRef = db().ref('loans');
  const newLoanRef = loansRef.push();
  const loanId = newLoanRef.key;
  
  const loan = {
    id: loanId,
    ...loanData,
    installments: {}, // Initialize empty installments object
    createdAt: admin.database.ServerValue.TIMESTAMP,
    updatedAt: admin.database.ServerValue.TIMESTAMP,
  };
  
  await newLoanRef.set(loan);
  return loan;
}

export async function getLoans() {
  const snapshot = await db().ref('loans').orderByChild('createdAt').once('value');
  const loans = [];
  
  snapshot.forEach((childSnapshot) => {
    loans.push(childSnapshot.val());
  });
  
  return loans.reverse();
}

export async function getLoanById(loanId) {
  const snapshot = await db().ref(`loans/${loanId}`).once('value');
  return snapshot.val();
}

export async function updateLoan(loanId, updates) {
  const updates_obj = {
    ...updates,
    updatedAt: admin.database.ServerValue.TIMESTAMP,
  };
  
  await db().ref(`loans/${loanId}`).update(updates_obj);
  return getLoanById(loanId);
}

export async function deleteLoan(loanId) {
  await db().ref(`loans/${loanId}`).remove();
}

// ==================== INSTALLMENTS OPERATIONS ====================

export async function createInstallment(loanId, installmentData) {
  const installmentsRef = db().ref(`loans/${loanId}/installments`);
  const newInstallmentRef = installmentsRef.push();
  const installmentId = newInstallmentRef.key;
  
  const installment = {
    id: installmentId,
    ...installmentData,
    proofs: {}, // Initialize empty proofs object
    createdAt: admin.database.ServerValue.TIMESTAMP,
    updatedAt: admin.database.ServerValue.TIMESTAMP,
  };
  
  await newInstallmentRef.set(installment);
  return installment;
}

export async function getInstallments(loanId) {
  const snapshot = await db().ref(`loans/${loanId}/installments`).once('value');
  const installments = [];
  
  snapshot.forEach((childSnapshot) => {
    installments.push(childSnapshot.val());
  });
  
  return installments;
}

export async function updateInstallment(loanId, installmentId, updates) {
  const updates_obj = {
    ...updates,
    updatedAt: admin.database.ServerValue.TIMESTAMP,
  };
  
  await db().ref(`loans/${loanId}/installments/${installmentId}`).update(updates_obj);
  const snapshot = await db().ref(`loans/${loanId}/installments/${installmentId}`).once('value');
  return snapshot.val();
}

export async function deleteInstallment(loanId, installmentId) {
  await db().ref(`loans/${loanId}/installments/${installmentId}`).remove();
}

// ==================== PAYMENT PROOFS OPERATIONS ====================

export async function createPaymentProof(loanId, installmentId, proofData) {
  const proofsRef = db().ref(`loans/${loanId}/installments/${installmentId}/proofs`);
  const newProofRef = proofsRef.push();
  const proofId = newProofRef.key;
  
  const proof = {
    id: proofId,
    ...proofData,
    createdAt: admin.database.ServerValue.TIMESTAMP,
  };
  
  await newProofRef.set(proof);
  return proof;
}

export async function getPaymentProofs(loanId, installmentId) {
  const snapshot = await db().ref(`loans/${loanId}/installments/${installmentId}/proofs`).once('value');
  const proofs = [];
  
  snapshot.forEach((childSnapshot) => {
    proofs.push(childSnapshot.val());
  });
  
  return proofs;
}

export async function deletePaymentProof(loanId, installmentId, proofId) {
  await db().ref(`loans/${loanId}/installments/${installmentId}/proofs/${proofId}`).remove();
}

// ==================== DASHBOARD STATISTICS ====================

export async function getDashboardStats() {
  const loansSnapshot = await db().ref('loans').once('value');
  const loans = [];
  
  loansSnapshot.forEach((childSnapshot) => {
    loans.push(childSnapshot.val());
  });
  
  const totalLoans = loans.length;
  const totalValue = loans.reduce((sum, loan) => sum + parseFloat(loan.initialValue || 0), 0);
  const totalProfit = loans.reduce((sum, loan) => sum + parseFloat(loan.profit || 0), 0);
  
  // Count loans by status
  const activeLoans = loans.filter(l => l.status === 'active').length;
  const completedLoans = loans.filter(l => l.status === 'completed').length;
  
  // Count overdue installments
  let overdueLoans = 0;
  loans.forEach(loan => {
    if (loan.installments) {
      Object.values(loan.installments).forEach(inst => {
        if (inst.status === 'overdue') {
          overdueLoans++;
        }
      });
    }
  });
  
  return {
    totalLoans,
    totalValue,
    totalProfit,
    activeLoans,
    completedLoans,
    overdueLoans,
  };
}

// ==================== PROFIT TRENDS ====================

export async function getProfitTrends() {
  const loansSnapshot = await db().ref('loans').once('value');
  const loans = [];
  
  loansSnapshot.forEach((childSnapshot) => {
    loans.push(childSnapshot.val());
  });
  
  // Sort by creation date
  loans.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  
  const trends = loans.map((loan, index) => {
    const cumulativeProfit = loans
      .slice(0, index + 1)
      .reduce((sum, l) => sum + parseFloat(l.profit || 0), 0);
    
    return {
      date: loan.loanDate ? new Date(loan.loanDate).toISOString().split('T')[0] : new Date(loan.createdAt).toISOString().split('T')[0],
      profit: cumulativeProfit,
      loanName: loan.friendName,
    };
  });
  
  return trends;
}

// ==================== UPCOMING PAYMENTS ====================

export async function getUpcomingPayments() {
  const loansSnapshot = await db().ref('loans').once('value');
  const upcomingPayments = [];
  
  // BUG FIX: Iterate correctly over Firebase snapshot
  loansSnapshot.forEach((loanSnapshot) => {
    const loan = loanSnapshot.val();
    const loanId = loanSnapshot.key;
    
    if (loan.installments) {
      Object.entries(loan.installments).forEach(([installmentId, installment]) => {
        if (installment.status !== 'paid') {
          upcomingPayments.push({
            ...installment,
            id: installmentId,
            loanId: loanId,
            friendName: loan.friendName,
          });
        }
      });
    }
  });
  
  // Sort by due date
  return upcomingPayments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

// ==================== NOTIFICATIONS (Future Feature) ====================

export async function createNotification(notificationData) {
  const notificationsRef = db().ref('notifications');
  const newNotificationRef = notificationsRef.push();
  const notificationId = newNotificationRef.key;
  
  const notification = {
    id: notificationId,
    ...notificationData,
    createdAt: admin.database.ServerValue.TIMESTAMP,
  };
  
  await newNotificationRef.set(notification);
  return notification;
}

export async function getNotifications(loanId = null) {
  let query = db().ref('notifications');
  
  if (loanId) {
    query = query.orderByChild('loanId').equalTo(loanId);
  }
  
  const snapshot = await query.once('value');
  const notifications = [];
  
  snapshot.forEach((childSnapshot) => {
    notifications.push(childSnapshot.val());
  });
  
  return notifications;
}

// ==================== COMMUNICATIONS (Future Feature) ====================

export async function createCommunication(communicationData) {
  const communicationsRef = db().ref('communications');
  const newCommunicationRef = communicationsRef.push();
  const communicationId = newCommunicationRef.key;
  
  const communication = {
    id: communicationId,
    ...communicationData,
    sentAt: admin.database.ServerValue.TIMESTAMP,
  };
  
  await newCommunicationRef.set(communication);
  return communication;
}

export async function getCommunications(loanId) {
  const snapshot = await db().ref('communications')
    .orderByChild('loanId')
    .equalTo(loanId)
    .once('value');
  
  const communications = [];
  
  snapshot.forEach((childSnapshot) => {
    communications.push(childSnapshot.val());
  });
  
  return communications.sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0));
}

// ==================== UTILITY FUNCTIONS ====================

// Check overdue installments and update status
export async function checkAndUpdateOverdueInstallments() {
  const loansSnapshot = await db().ref('loans').once('value');
  const now = new Date();
  let updatedCount = 0;
  
  loansSnapshot.forEach((loanSnapshot) => {
    const loan = loanSnapshot.val();
    const loanId = loanSnapshot.key;
    
    if (loan.installments) {
      Object.entries(loan.installments).forEach(async ([installmentId, installment]) => {
        if (installment.status === 'pending' && new Date(installment.dueDate) < now) {
          await updateInstallment(loanId, installmentId, { status: 'overdue' });
          updatedCount++;
        }
      });
    }
  });
  
  return updatedCount;
}

// Get loan statistics by friend
export async function getFriendStatistics(friendName) {
  const loansSnapshot = await db().ref('loans')
    .orderByChild('friendName')
    .equalTo(friendName)
    .once('value');
  
  const loans = [];
  loansSnapshot.forEach((childSnapshot) => {
    loans.push(childSnapshot.val());
  });
  
  const totalLoans = loans.length;
  const totalBorrowed = loans.reduce((sum, loan) => sum + parseFloat(loan.initialValue || 0), 0);
  const totalProfit = loans.reduce((sum, loan) => sum + parseFloat(loan.profit || 0), 0);
  
  let totalInstallments = 0;
  let paidInstallments = 0;
  let overdueInstallments = 0;
  
  loans.forEach(loan => {
    if (loan.installments) {
      Object.values(loan.installments).forEach(inst => {
        totalInstallments++;
        if (inst.status === 'paid') paidInstallments++;
        if (inst.status === 'overdue') overdueInstallments++;
      });
    }
  });
  
  const onTimeRate = totalInstallments > 0 
    ? ((paidInstallments / totalInstallments) * 100).toFixed(2)
    : 0;
  
  return {
    friendName,
    totalLoans,
    totalBorrowed,
    totalProfit,
    totalInstallments,
    paidInstallments,
    overdueInstallments,
    onTimeRate,
    creditScore: Math.max(0, Math.min(100, 100 - (overdueInstallments / totalInstallments * 50)))
  };
}

export default {
  initializeFirebase,
  db,
  // Loans
  createLoan,
  getLoans,
  getLoanById,
  updateLoan,
  deleteLoan,
  // Installments
  createInstallment,
  getInstallments,
  updateInstallment,
  deleteInstallment,
  // Payment Proofs
  createPaymentProof,
  getPaymentProofs,
  deletePaymentProof,
  // Dashboard
  getDashboardStats,
  getProfitTrends,
  getUpcomingPayments,
  // Notifications
  createNotification,
  getNotifications,
  // Communications
  createCommunication,
  getCommunications,
  // Utilities
  checkAndUpdateOverdueInstallments,
  getFriendStatistics,
};