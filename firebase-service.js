import admin from 'firebase-admin';
import serviceAccountKey from './serviceAccountKey.json';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Firebase Admin SDK
let firebaseApp = null;

export function initializeFirebase() {
  if (!firebaseApp) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountKey),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }
  return firebaseApp;
}

export const db = () => admin.database();

// Loans operations
export async function createLoan(loanData) {
  const loansRef = db().ref('loans');
  const newLoanRef = loansRef.push();
  const loanId = newLoanRef.key;
  
  const loan = {
    id: loanId,
    ...loanData,
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

// Installments operations
export async function createInstallment(loanId, installmentData) {
  const installmentsRef = db().ref(`loans/${loanId}/installments`);
  const newInstallmentRef = installmentsRef.push();
  const installmentId = newInstallmentRef.key;
  
  const installment = {
    id: installmentId,
    ...installmentData,
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

// Payment Proofs operations
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

// Dashboard statistics
export async function getDashboardStats() {
  const loansSnapshot = await db().ref('loans').once('value');
  const loans = [];
  
  loansSnapshot.forEach((childSnapshot) => {
    loans.push(childSnapshot.val());
  });
  
  const totalLoans = loans.length;
  const totalValue = loans.reduce((sum, loan) => sum + parseFloat(loan.initialValue || 0), 0);
  const totalProfit = loans.reduce((sum, loan) => sum + parseFloat(loan.profit || 0), 0);
  
  const activeLoans = loans.filter(l => l.status === 'pending').length;
  const completedLoans = loans.filter(l => l.status === 'paid').length;
  const overdueLoans = loans.filter(l => l.status === 'overdue').length;
  
  return {
    totalLoans,
    totalValue,
    totalProfit,
    activeLoans,
    completedLoans,
    overdueLoans,
  };
}

// Profit trends
export async function getProfitTrends() {
  const loansSnapshot = await db().ref('loans').once('value');
  const loans = [];
  
  loansSnapshot.forEach((childSnapshot) => {
    loans.push(childSnapshot.val());
  });
  
  const trends = loans
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((loan, index) => {
      const cumulativeProfit = loans
        .slice(0, index + 1)
        .reduce((sum, l) => sum + parseFloat(l.profit || 0), 0);
      
      return {
        date: new Date(loan.createdAt).toLocaleDateString('pt-BR'),
        profit: cumulativeProfit,
        loanName: loan.friendName,
      };
    });
  
  return trends;
}

// Upcoming payments
export async function getUpcomingPayments() {
  const loansSnapshot = await db().ref('loans').once('value');
  const upcomingPayments = [];
  
  await Promise.all(
    Array.from(loansSnapshot.val() || {}).map(async ([loanId, loan]) => {
      const installmentsSnapshot = await db().ref(`loans/${loanId}/installments`).once('value');
      
      installmentsSnapshot.forEach((installmentSnapshot) => {
        const installment = installmentSnapshot.val();
        if (installment.status !== 'paid') {
          upcomingPayments.push({
            ...installment,
            loanId,
            friendName: loan.friendName,
          });
        }
      });
    })
  );
  
  return upcomingPayments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}
