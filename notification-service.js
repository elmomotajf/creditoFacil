// ==================== SISTEMA DE NOTIFICAÇÕES POR EMAIL ====================
// Arquivo: notification-service.js
// Este arquivo implementa o sistema de notificações por email usando Nodemailer e Node-Cron

import nodemailer from 'nodemailer';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configurar transporte de email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Verificar configuração do email
export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    console.log('✅ Servidor de email configurado corretamente');
    return true;
  } catch (error) {
    console.error('❌ Erro na configuração de email:', error);
    return false;
  }
}

// Enviar email de lembrete de parcela próxima do vencimento
export async function sendPaymentReminderEmail(installment, loan) {
  const daysUntilDue = Math.ceil((new Date(installment.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; border-radius: 5px; }
        .highlight { color: #667eea; font-weight: bold; font-size: 18px; }
        .urgent { color: #e74c3c; font-weight: bold; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 Lembrete de Pagamento</h1>
        </div>
        <div class="content">
          <p>Olá ${loan.friendName},</p>
          
          <p>Este é um lembrete amigável sobre a parcela do seu empréstimo que está ${daysUntilDue === 0 ? 'vencendo hoje' : `vencendo em ${daysUntilDue} dia(s)`}.</p>
          
          <div class="info-box">
            <p><strong>Detalhes da Parcela:</strong></p>
            <p class="highlight">Parcela #${installment.installmentNumber}</p>
            <p>Valor: <span class="highlight">R$ ${parseFloat(installment.value).toFixed(2)}</span></p>
            <p>Vencimento: <span class="${daysUntilDue <= 1 ? 'urgent' : ''}">
              ${new Date(installment.dueDate).toLocaleDateString('pt-BR')}
            </span></p>
          </div>
          
          <div class="info-box">
            <p><strong>Resumo do Empréstimo:</strong></p>
            <p>Valor Total: R$ ${parseFloat(loan.totalValue).toFixed(2)}</p>
            <p>Taxa de Juros: ${parseFloat(loan.interestRate).toFixed(2)}%</p>
            ${loan.latePaymentPenalty > 0 ? `<p class="urgent">Multa por Atraso: ${parseFloat(loan.latePaymentPenalty).toFixed(2)}%</p>` : ''}
          </div>
          
          <p>Para evitar multas por atraso, por favor efetue o pagamento até a data de vencimento.</p>
          
          <p style="text-align: center;">
            <a href="${process.env.APP_URL || 'http://localhost:3000'}" class="button">Acessar Sistema</a>
          </p>
          
          <p>Dúvidas? Estou à disposição!</p>
          
          <p>Atenciosamente,<br>Sistema Payment Tracker</p>
        </div>
        <div class="footer">
          <p>Este é um email automático. Por favor, não responda.</p>
          <p>© ${new Date().getFullYear()} Payment Tracker - Sistema de Gerenciamento de Empréstimos</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Payment Tracker" <${process.env.SMTP_USER}>`,
    to: loan.friendEmail || process.env.DEFAULT_NOTIFICATION_EMAIL, // Precisaria adicionar campo email no schema
    subject: `💰 Lembrete: Parcela #${installment.installmentNumber} vence em ${daysUntilDue} dia(s)`,
    html: emailHtml,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email enviado para ${loan.friendName}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Erro ao enviar email para ${loan.friendName}:`, error);
    return { success: false, error: error.message };
  }
}

// Enviar email de parcela vencida
export async function sendOverduePaymentEmail(installment, loan) {
  const daysOverdue = Math.ceil((new Date() - new Date(installment.dueDate)) / (1000 * 60 * 60 * 24));
  const lateFee = parseFloat(installment.value) * (parseFloat(loan.latePaymentPenalty) / 100);
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .warning-box { background: #fff3cd; border-left: 4px solid #e74c3c; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .urgent { color: #e74c3c; font-weight: bold; font-size: 18px; }
        .button { display: inline-block; padding: 12px 30px; background: #e74c3c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Pagamento em Atraso</h1>
        </div>
        <div class="content">
          <p>Olá ${loan.friendName},</p>
          
          <div class="warning-box">
            <p class="urgent">⚠️ ATENÇÃO: Parcela Vencida</p>
            <p>A parcela #${installment.installmentNumber} do seu empréstimo está atrasada há ${daysOverdue} dia(s).</p>
          </div>
          
          <p><strong>Detalhes da Parcela Vencida:</strong></p>
          <p>Valor Original: R$ ${parseFloat(installment.value).toFixed(2)}</p>
          <p>Data de Vencimento: ${new Date(installment.dueDate).toLocaleDateString('pt-BR')}</p>
          ${lateFee > 0 ? `<p class="urgent">Multa por Atraso: R$ ${lateFee.toFixed(2)}</p>` : ''}
          ${lateFee > 0 ? `<p class="urgent">Valor Total a Pagar: R$ ${(parseFloat(installment.value) + lateFee).toFixed(2)}</p>` : ''}
          
          <p>Para regularizar sua situação e evitar cobranças adicionais, por favor efetue o pagamento o quanto antes.</p>
          
          <p style="text-align: center;">
            <a href="${process.env.APP_URL || 'http://localhost:3000'}" class="button">Pagar Agora</a>
          </p>
          
          <p>Em caso de dúvidas ou dificuldades, entre em contato comigo para negociarmos.</p>
          
          <p>Atenciosamente,<br>Sistema Payment Tracker</p>
        </div>
        <div class="footer">
          <p>Este é um email automático. Por favor, não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Payment Tracker" <${process.env.SMTP_USER}>`,
    to: loan.friendEmail || process.env.DEFAULT_NOTIFICATION_EMAIL,
    subject: `⚠️ URGENTE: Parcela #${installment.installmentNumber} vencida há ${daysOverdue} dia(s)`,
    html: emailHtml,
    priority: 'high',
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email de cobrança enviado para ${loan.friendName}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Erro ao enviar email de cobrança:`, error);
    return { success: false, error: error.message };
  }
}

// Job agendado: Verificar pagamentos próximos (executa todos os dias às 9h)
export function schedulePaymentReminders() {
  // Executar todos os dias às 9h
  cron.schedule('0 9 * * *', async () => {
    console.log('🔔 Executando verificação de pagamentos próximos...');
    
    try {
      // Buscar parcelas que vencem em 3 dias
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      threeDaysFromNow.setHours(23, 59, 59, 999);
      
      const upcomingPayments = await prisma.installment.findMany({
        where: {
          status: 'pending',
          dueDate: {
            gte: new Date(),
            lte: threeDaysFromNow,
          },
        },
        include: {
          loan: true,
        },
      });
      
      console.log(`📧 Encontradas ${upcomingPayments.length} parcelas próximas do vencimento`);
      
      for (const payment of upcomingPayments) {
        await sendPaymentReminderEmail(payment, payment.loan);
        // Aguardar 1 segundo entre cada email para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log('✅ Verificação de pagamentos próximos concluída');
    } catch (error) {
      console.error('❌ Erro ao verificar pagamentos próximos:', error);
    }
  });
  
  console.log('✅ Job de lembretes agendado (executa diariamente às 9h)');
}

// Job agendado: Verificar pagamentos vencidos (executa todos os dias às 10h)
export function scheduleOverduePaymentNotifications() {
  // Executar todos os dias às 10h
  cron.schedule('0 10 * * *', async () => {
    console.log('⚠️ Executando verificação de pagamentos vencidos...');
    
    try {
      const overduePayments = await prisma.installment.findMany({
        where: {
          status: 'pending',
          dueDate: {
            lt: new Date(),
          },
        },
        include: {
          loan: true,
        },
      });
      
      console.log(`📧 Encontradas ${overduePayments.length} parcelas vencidas`);
      
      for (const payment of overduePayments) {
        // Atualizar status para overdue
        await prisma.installment.update({
          where: { id: payment.id },
          data: { status: 'overdue' },
        });
        
        // Enviar notificação
        await sendOverduePaymentEmail(payment, payment.loan);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log('✅ Verificação de pagamentos vencidos concluída');
    } catch (error) {
      console.error('❌ Erro ao verificar pagamentos vencidos:', error);
    }
  });
  
  console.log('✅ Job de cobranças agendado (executa diariamente às 10h)');
}

// Inicializar todos os jobs
export function initializeNotificationSystem() {
  console.log('🚀 Inicializando sistema de notificações...');
  
  verifyEmailConfig().then(isValid => {
    if (isValid) {
      schedulePaymentReminders();
      scheduleOverduePaymentNotifications();
      console.log('✅ Sistema de notificações inicializado com sucesso');
    } else {
      console.warn('⚠️ Sistema de notificações não inicializado - configure o SMTP');
    }
  });
}

// ==================== COMO USAR ====================
/*

1. Instalar dependências:
   npm install nodemailer node-cron

2. Adicionar ao .env:
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=seu-email@gmail.com
   SMTP_PASSWORD=sua-senha-de-app
   APP_URL=http://localhost:3000
   DEFAULT_NOTIFICATION_EMAIL=email-backup@example.com

3. No server.js, adicionar:
   import { initializeNotificationSystem } from './notification-service.js';
   
   // Após inicializar o servidor
   initializeNotificationSystem();

4. Para Gmail:
   - Ativar "verificação em duas etapas"
   - Gerar "senha de app" em https://myaccount.google.com/apppasswords
   - Usar a senha de app no .env

5. Atualizar o schema.prisma para incluir email do amigo:
   model Loan {
     // ... campos existentes
     friendEmail  String?  @db.VarChar(255)
   }

*/