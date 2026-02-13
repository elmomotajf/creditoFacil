// Application State
const app = {
  currentPage: 'login',
  token: localStorage.getItem('token'),
  passwordSet: false,
  loans: [],
  currentLoan: null,
};

// API Base URL
const API_URL = '';

// Initialize App
async function initApp() {
  // Check if password is set
  try {
    const response = await fetch(`${API_URL}/api/auth/status`);
    const data = await response.json();
    app.passwordSet = data.passwordSet;

    if (app.token) {
      app.currentPage = 'dashboard';
      loadDashboard();
    } else if (app.passwordSet) {
      showLoginPage();
    } else {
      showPasswordSetupPage();
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    showLoginPage();
  }
}

// ==================== Authentication ====================

function showPasswordSetupPage() {
  const app_div = document.getElementById('app');
  app_div.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <h1>🔐 Configurar Senha</h1>
        <p>Defina uma senha forte para acessar seu sistema de empréstimos</p>
        <form id="setupPasswordForm" onsubmit="handlePasswordSetup(event)">
          <div class="form-group">
            <label for="password">Senha</label>
            <input type="password" id="password" name="password" required minlength="8" placeholder="Mínimo 8 caracteres">
            <div class="error-message" id="passwordError"></div>
          </div>
          <div class="form-group">
            <label for="confirmPassword">Confirmar Senha</label>
            <input type="password" id="confirmPassword" name="confirmPassword" required minlength="8" placeholder="Confirme a senha">
            <div class="error-message" id="confirmError"></div>
          </div>
          <button type="submit" class="btn btn-primary">Configurar Senha</button>
        </form>
      </div>
    </div>
  `;
}

function showLoginPage() {
  const app_div = document.getElementById('app');
  app_div.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <h1>🔑 Acessar Sistema</h1>
        <p>Digite sua senha para acessar o gerenciador de empréstimos</p>
        <form id="loginForm" onsubmit="handleLogin(event)">
          <div class="form-group">
            <label for="loginPassword">Senha</label>
            <input type="password" id="loginPassword" name="password" required placeholder="Digite sua senha">
            <div class="error-message" id="loginError"></div>
          </div>
          <button type="submit" class="btn btn-primary">Entrar</button>
        </form>
      </div>
    </div>
  `;
}

async function handlePasswordSetup(event) {
  event.preventDefault();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    document.getElementById('confirmError').textContent = 'As senhas não correspondem';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/setup-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      app.passwordSet = true;
      showLoginPage();
    } else {
      const error = await response.json();
      document.getElementById('passwordError').textContent = error.error;
    }
  } catch (error) {
    console.error('Error setting password:', error);
    document.getElementById('passwordError').textContent = 'Erro ao configurar senha';
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const password = document.getElementById('loginPassword').value;

  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      const data = await response.json();
      app.token = data.token;
      localStorage.setItem('token', data.token);
      app.currentPage = 'dashboard';
      loadDashboard();
    } else {
      const error = await response.json();
      document.getElementById('loginError').textContent = error.error || 'Senha incorreta';
    }
  } catch (error) {
    console.error('Error during login:', error);
    document.getElementById('loginError').textContent = 'Erro ao fazer login';
  }
}

// ==================== Dashboard ====================

async function loadDashboard() {
  const app_div = document.getElementById('app');
  app_div.innerHTML = `
    <div class="dashboard">
      <button class="burger-menu" id="burgerMenuBtn" aria-label="Abrir menu">
        <span></span><span></span><span></span>
      </button>
      <div class="sidebar" id="sidebarMenu">
        <div class="sidebar-header">
          <div class="sidebar-logo">💰</div>
          <div class="sidebar-title">Payment Tracker</div>
        </div>
        <ul class="nav-menu">
          <li class="nav-item">
            <button class="nav-link active" onclick="navigateTo('dashboard')">📊 Dashboard</button>
          </li>
          <li class="nav-item">
            <button class="nav-link" onclick="navigateTo('loans')">📋 Empréstimos</button>
          </li>
          <li class="nav-item">
            <button class="nav-link" onclick="navigateTo('upcoming')">📅 Próximos Pagamentos</button>
          </li>
        </ul>
        <div class="sidebar-footer">
          <button class="nav-link" onclick="handleLogout()">🚪 Sair</button>
        </div>
      </div>
      <div class="main-content">
        <div class="header">
          <h1>Dashboard</h1>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="showCreateLoanModal()">+ Novo Empréstimo</button>
          </div>
        </div>
        <div id="content"></div>
      </div>
    </div>
  `;

  // Burger menu toggle
  const burgerBtn = document.getElementById('burgerMenuBtn');
  const sidebarMenu = document.getElementById('sidebarMenu');
  if (burgerBtn && sidebarMenu) {
    burgerBtn.addEventListener('click', () => {
      sidebarMenu.classList.toggle('open');
      burgerBtn.classList.toggle('active');
    });
  }

  loadDashboardContent();
}

async function loadDashboardContent() {
  try {
    const response = await fetch(`${API_URL}/api/dashboard/summary`, {
      headers: { 'Authorization': `Bearer ${app.token}` },
    });

    if (response.ok) {
      const summary = await response.json();
      const content = document.getElementById('content');

      content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 style="margin: 0; color: var(--text-primary);">Dashboard</h2>
          <button class="btn btn-primary" onclick="syncGoogleCalendar()" style="display: flex; align-items: center; gap: 8px;">
            <span>📅</span>
            <span>Sincronizar Google Calendar</span>
          </button>
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total de Empréstimos</div>
            <div class="stat-value">${summary.totalLoans}</div>
          </div>
          <div class="stat-card success">
            <div class="stat-label">Empréstimos Ativos</div>
            <div class="stat-value">${summary.activeLoans}</div>
          </div>
          <div class="stat-card success">
            <div class="stat-label">Empréstimos Concluídos</div>
            <div class="stat-value">${summary.completedLoans}</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-label">Pagamentos Atrasados</div>
            <div class="stat-value">${summary.overduePayments}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Lucro Total</div>
            <div class="stat-value">R$ ${parseFloat(summary.totalProfit).toFixed(2)}</div>
          </div>
        </div>

        <div class="chart-container">
          <h3 class="chart-title">Evolução do Lucro</h3>
          <canvas id="profitChart" style="max-height: 300px;"></canvas>
        </div>

        <div class="chart-container">
          <h3 class="chart-title">Próximos Pagamentos</h3>
          <div id="upcomingPayments"></div>
        </div>
      `;

      loadProfitChart();
      loadUpcomingPayments();
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

async function loadUpcomingPayments() {
  try {
    const response = await fetch(`${API_URL}/api/dashboard/upcoming-payments`, {
      headers: { 'Authorization': `Bearer ${app.token}` },
    });

    if (response.ok) {
      const payments = await response.json();
      const container = document.getElementById('upcomingPayments');

      if (payments.length === 0) {
        container.innerHTML = '<p class="text-center">Nenhum pagamento pendente</p>';
        return;
      }

      let html = `
        <table class="table">
          <thead>
            <tr>
              <th>Amigo</th>
              <th>Parcela</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
      `;

      payments.forEach((payment) => {
        const dueDate = new Date(payment.dueDate).toLocaleDateString('pt-BR');
        html += `
          <tr>
            <td>${payment.loan.friendName}</td>
            <td>#${payment.installmentNumber}</td>
            <td>R$ ${parseFloat(payment.value).toFixed(2)}</td>
            <td>${dueDate}</td>
            <td><span class="status-badge status-${payment.status}">${payment.status}</span></td>
            <td>
              <button class="btn btn-small btn-success" onclick="markAsPaid('${payment.id}')">Pagar</button>
            </td>
          </tr>
        `;
      });

      html += `
          </tbody>
        </table>
      `;

      container.innerHTML = html;
    }
  } catch (error) {
    console.error('Error loading upcoming payments:', error);
  }
}

async function navigateTo(page) {
  app.currentPage = page;
  const content = document.getElementById('content');

  // Update active nav link
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.remove('active');
  });
  event.target.classList.add('active');

  if (page === 'dashboard') {
    loadDashboardContent();
  } else if (page === 'loans') {
    loadLoansPage();
  } else if (page === 'upcoming') {
    loadUpcomingPaymentsPage();
  }
}

async function loadLoansPage() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    const response = await fetch(`${API_URL}/api/loans`, {
      headers: { 'Authorization': `Bearer ${app.token}` },
    });

    if (response.ok) {
      const loans = await response.json();
      app.loans = loans;

      if (loans.length === 0) {
        content.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            <h3 class="empty-title">Nenhum empréstimo cadastrado</h3>
            <p class="empty-text">Comece criando seu primeiro empréstimo</p>
            <button class="btn btn-primary" onclick="showCreateLoanModal()">Criar Empréstimo</button>
          </div>
        `;
        return;
      }

      // Calculate status counts
      const statusCounts = {
        all: loans.length,
        pending: loans.filter(l => l.status === 'pending').length,
        paid: loans.filter(l => l.status === 'paid').length,
        overdue: loans.filter(l => l.status === 'overdue').length,
      };

      // Calculate payment status counts
      const paymentStatusCounts = {
        all: loans.length,
        paid: loans.filter(l => l.paymentStatus === 'paid').length,
        pending: loans.filter(l => l.paymentStatus === 'pending').length,
        overdue: loans.filter(l => l.paymentStatus === 'overdue').length,
      };

      let html = `
        <div class="search-bar-container">
          <input 
            type="text" 
            id="loanSearchInput" 
            class="search-bar" 
            placeholder="🔍 Buscar por nome do amigo..." 
            onkeyup="filterLoansBySearch()"
          />
          <span id="searchResultCount" class="search-result-count"></span>
        </div>
        <div class="filter-container">
          <div class="filter-section">
            <h4 class="filter-title">Status do Empréstimo</h4>
            <div class="filter-buttons">
            <button class="filter-btn active" onclick="filterLoans('all')" data-filter="all">
              📊 Todos <span class="filter-count">${statusCounts.all}</span>
            </button>
            <button class="filter-btn" onclick="filterLoans('pending')" data-filter="pending">
              ⏳ Pendentes <span class="filter-count">${statusCounts.pending}</span>
            </button>
            <button class="filter-btn" onclick="filterLoans('paid')" data-filter="paid">
              ✅ Pagos <span class="filter-count">${statusCounts.paid}</span>
            </button>
            <button class="filter-btn" onclick="filterLoans('overdue')" data-filter="overdue">
              ⚠️ Atrasados <span class="filter-count">${statusCounts.overdue}</span>
            </button>
            </div>
          </div>
          <div class="filter-section">
            <h4 class="filter-title">Status de Pagamento</h4>
            <div class="filter-buttons">
            <button class="filter-btn" onclick="filterByPaymentStatus('all')" data-payment-filter="all">
              📊 Todos <span class="filter-count">${paymentStatusCounts.all}</span>
            </button>
            <button class="filter-btn" onclick="filterByPaymentStatus('paid')" data-payment-filter="paid">
              💰 Totalmente Pagos <span class="filter-count">${paymentStatusCounts.paid}</span>
            </button>
            <button class="filter-btn" onclick="filterByPaymentStatus('pending')" data-payment-filter="pending">
              ⏳ Pagamento Pendente <span class="filter-count">${paymentStatusCounts.pending}</span>
            </button>
            <button class="filter-btn" onclick="filterByPaymentStatus('overdue')" data-payment-filter="overdue">
              ⚠️ Com Atraso <span class="filter-count">${paymentStatusCounts.overdue}</span>
            </button>
            </div>
          </div>
        </div>
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Amigo</th>
                <th>Valor Inicial</th>
                <th>Juros</th>
                <th>Valor Total</th>
                <th>Lucro</th>
                <th>Status</th>
                <th>Vencimento</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
      `;

      loans.forEach((loan) => {
        const dueDate = new Date(loan.finalPaymentDate).toLocaleDateString('pt-BR');
        const statusLabel = getStatusLabel(loan.status);
        const paymentStatusLabel = getPaymentStatusLabel(loan.paymentStatus);
        html += `
          <tr class="loan-row" data-status="${loan.status}" data-payment-status="${loan.paymentStatus}" data-friend-name="${loan.friendName}">
            <td>${loan.friendName}</td>
            <td>R$ ${parseFloat(loan.initialValue).toFixed(2)}</td>
            <td>${parseFloat(loan.interestRate).toFixed(2)}%</td>
            <td>R$ ${parseFloat(loan.totalValue).toFixed(2)}</td>
            <td>R$ ${parseFloat(loan.profit).toFixed(2)}</td>
            <td>
              <span class="status-badge status-${loan.status}">${statusLabel}</span>
              <span class="status-badge status-payment-${loan.paymentStatus}" style="margin-left: 8px;">${paymentStatusLabel}</span>
            </td>
            <td>${dueDate}</td>
            <td>
              <button class="btn btn-small btn-secondary" onclick="viewLoanDetails('${loan.id}')">Ver</button>
              <button class="btn btn-small btn-primary" onclick="editLoan('${loan.id}')">Editar</button>
              <button class="btn btn-small btn-danger" onclick="deleteLoan('${loan.id}')">Excluir</button>
            </td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;

      content.innerHTML = html;
    }
  } catch (error) {
    console.error('Error loading loans:', error);
    content.innerHTML = '<p class="text-center">Erro ao carregar empréstimos</p>';
  }
}

async function loadUpcomingPaymentsPage() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    const response = await fetch(`${API_URL}/api/dashboard/upcoming-payments`, {
      headers: { 'Authorization': `Bearer ${app.token}` },
    });

    if (response.ok) {
      const payments = await response.json();

      if (payments.length === 0) {
        content.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">✅</div>
            <h3 class="empty-title">Nenhum pagamento pendente</h3>
            <p class="empty-text">Todos os pagamentos estão em dia!</p>
          </div>
        `;
        return;
      }

      let html = `
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Amigo</th>
                <th>Parcela</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
      `;

      payments.forEach((payment) => {
        const dueDate = new Date(payment.dueDate).toLocaleDateString('pt-BR');
        html += `
          <tr>
            <td>${payment.loan.friendName}</td>
            <td>#${payment.installmentNumber}</td>
            <td>R$ ${parseFloat(payment.value).toFixed(2)}</td>
            <td>${dueDate}</td>
            <td><span class="status-badge status-${payment.status}">${payment.status}</span></td>
            <td>
              <button class="btn btn-small btn-success" onclick="markAsPaid('${payment.id}')">Marcar como Pago</button>
            </td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;

      content.innerHTML = html;
    }
  } catch (error) {
    console.error('Error loading upcoming payments:', error);
    content.innerHTML = '<p class="text-center">Erro ao carregar pagamentos</p>';
  }
}

// ==================== Modals ====================

function showCreateLoanModal() {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'createLoanModal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Novo Empréstimo</h2>
        <button class="modal-close" onclick="closeModal('createLoanModal')">×</button>
      </div>
      <div class="modal-body">
        <form id="createLoanForm" onsubmit="handleCreateLoan(event)">
          <div class="form-group">
            <label for="friendName">Nome do Amigo</label>
            <input type="text" id="friendName" name="friendName" required placeholder="Digite o nome">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="initialValue">Valor Inicial (R$)</label>
              <input type="number" id="initialValue" name="initialValue" required step="0.01" placeholder="0.00">
            </div>
            <div class="form-group">
              <label for="interestRate">Taxa de Juros (%)</label>
              <input type="number" id="interestRate" name="interestRate" required step="0.01" placeholder="0.00">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="loanDate">Data de Inicio do Emprestimo</label>
              <input type="date" id="loanDate" name="loanDate" required>
            </div>
            <div class="form-group">
              <label for="finalPaymentDate">Data Final de Pagamento</label>
              <input type="date" id="finalPaymentDate" name="finalPaymentDate" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="numberOfInstallments">Numero de Parcelas</label>
              <input type="number" id="numberOfInstallments" name="numberOfInstallments" required min="1" value="1" oninput="calculateLoanValues()">
            </div>
            <div class="form-group">
              <label for="latePaymentPenalty">Juros por Atraso (%)</label>
              <input type="number" id="latePaymentPenalty" name="latePaymentPenalty" step="0.01" placeholder="0.00" value="0" oninput="calculateLoanValues()">
            </div>
          </div>
          <div class="form-row" style="background: var(--gray-50); padding: 16px; border-radius: 8px; border: 1px solid var(--gray-200);">
            <div class="form-group">
              <label style="color: var(--text-secondary); font-size: 14px;">Valor Total (com juros)</label>
              <p id="totalValueDisplay" style="font-size: 18px; font-weight: 600; color: var(--primary); margin: 8px 0 0 0;">R$ 0,00</p>
            </div>
            <div class="form-group">
              <label style="color: var(--text-secondary); font-size: 14px;">Lucro Estimado</label>
              <p id="profitDisplay" style="font-size: 18px; font-weight: 600; color: var(--success); margin: 8px 0 0 0;">R$ 0,00</p>
            </div>
          </div>
          <div class="form-group">
            <label for="notes">Notas (Opcional)</label>
            <textarea id="notes" name="notes" placeholder="Adicione notas sobre o empréstimo" style="padding: 12px 16px; border: 2px solid var(--gray-300); border-radius: 8px; font-family: inherit; resize: vertical; min-height: 80px;"></textarea>
          </div>
          <div id="createLoanError" class="error-message"></div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('createLoanModal')">Cancelar</button>
        <button class="btn btn-primary" onclick="document.getElementById('createLoanForm').dispatchEvent(new Event('submit'))">Criar Empréstimo</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.remove();
  }
}

async function handleCreateLoan(event) {
  event.preventDefault();

  const friendName = document.getElementById('friendName').value;
  const initialValue = document.getElementById('initialValue').value;
  const interestRate = document.getElementById('interestRate').value;
  const loanDate = document.getElementById('loanDate').value;
  const finalPaymentDate = document.getElementById('finalPaymentDate').value;
  const latePaymentPenalty = document.getElementById('latePaymentPenalty').value;
  const numberOfInstallments = parseInt(document.getElementById('numberOfInstallments').value);
  const notes = document.getElementById('notes').value;

  if (new Date(finalPaymentDate) <= new Date(loanDate)) {
    document.getElementById('createLoanError').textContent = 'Data final deve ser apos a data inicial';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/loans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${app.token}`,
      },
      body: JSON.stringify({
        friendName,
        initialValue,
        interestRate,
        loanDate,
        finalPaymentDate,
        latePaymentPenalty,
        numberOfInstallments,
        notes,
      }),
    });

    if (response.ok) {
      closeModal('createLoanModal');
      loadLoansPage();
    } else {
      const error = await response.json();
      document.getElementById('createLoanError').textContent = error.error || 'Erro ao criar empréstimo';
    }
  } catch (error) {
    console.error('Error creating loan:', error);
    document.getElementById('createLoanError').textContent = 'Erro ao criar empréstimo';
  }
}

async function viewLoanDetails(loanId) {
  try {
    const response = await fetch(`${API_URL}/api/loans/${loanId}`, {
      headers: { 'Authorization': `Bearer ${app.token}` },
    });

    if (response.ok) {
      const loan = await response.json();
      app.currentLoan = loan;

      const modal = document.createElement('div');
      modal.className = 'modal active';
      modal.id = 'loanDetailsModal';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title">Detalhes do Empréstimo - ${loan.friendName}</h2>
            <button class="modal-close" onclick="closeModal('loanDetailsModal')">×</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label>Data de Inicio</label>
                <p style="font-size: 14px; font-weight: 500;">${new Date(loan.loanDate).toLocaleDateString('pt-BR')}</p>
              </div>
              <div class="form-group">
                <label>Data Final</label>
                <p style="font-size: 14px; font-weight: 500;">${new Date(loan.finalPaymentDate).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div class="form-group">
              <label>Valor Inicial</label>
              <p style="font-size: 18px; font-weight: 600;">R$ ${parseFloat(loan.initialValue).toFixed(2)}</p>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Taxa de Juros</label>
                <p style="font-size: 18px; font-weight: 600;">${parseFloat(loan.interestRate).toFixed(2)}%</p>
              </div>
              <div class="form-group">
                <label>Juros por Atraso</label>
                <p style="font-size: 18px; font-weight: 600;">${parseFloat(loan.latePaymentPenalty).toFixed(2)}%</p>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Lucro</label>
                <p style="font-size: 18px; font-weight: 600; color: var(--success);">R$ ${parseFloat(loan.profit).toFixed(2)}</p>
              </div>
              <div class="form-group">
                <label>Multas Acumuladas</label>
                <p style="font-size: 18px; font-weight: 600; color: var(--warning);">R$ ${parseFloat(loan.totalLateFees).toFixed(2)}</p>
              </div>
            </div>
            <div class="form-group">
              <label>Valor Total</label>
              <p style="font-size: 18px; font-weight: 600;">R$ ${parseFloat(loan.totalValue).toFixed(2)}</p>
            </div>
            <div class="form-group">
              <label>Status</label>
              <p><span class="status-badge status-${loan.status}">${loan.status}</span></p>
            </div>
            <div class="form-group">
              <label>Parcelas</label>
              <table class="table" style="margin-top: 12px;">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Valor</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${loan.installments.map((inst) => `
                    <tr>
                      <td>${inst.installmentNumber}</td>
                      <td>R$ ${parseFloat(inst.value).toFixed(2)}</td>
                      <td>${new Date(inst.dueDate).toLocaleDateString('pt-BR')}</td>
                      <td><span class="status-badge status-${inst.status}">${inst.status}</span></td>
                      <td>
                        ${inst.status === 'pending' ? `<button class="btn btn-small btn-success" onclick="markAsPaid('${inst.id}')">Pagar</button>` : ''}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal('loanDetailsModal')">Fechar</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
    }
  } catch (error) {
    console.error('Error loading loan details:', error);
  }
}

async function markAsPaid(installmentId) {
  try {
    const response = await fetch(`${API_URL}/api/installments/${installmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${app.token}`,
      },
      body: JSON.stringify({ status: 'paid' }),
    });

    if (response.ok) {
      // Reload the current page
      if (app.currentPage === 'dashboard') {
        loadDashboardContent();
      } else if (app.currentPage === 'loans') {
        loadLoansPage();
      } else if (app.currentPage === 'upcoming') {
        loadUpcomingPaymentsPage();
      }
    }
  } catch (error) {
    console.error('Error marking as paid:', error);
  }
}

async function deleteLoan(loanId) {
  if (!confirm('Tem certeza que deseja excluir este empréstimo?')) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/loans/${loanId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${app.token}` },
    });

    if (response.ok) {
      loadLoansPage();
    }
  } catch (error) {
    console.error('Error deleting loan:', error);
  }
}

function handleLogout() {
  localStorage.removeItem('token');
  app.token = null;
  app.currentPage = 'login';
  showLoginPage();
}

// ==================== Profit Chart ====================

async function loadProfitChart() {
  try {
    const response = await fetch(`${API_URL}/api/dashboard/profit-trends`, {
      headers: { 'Authorization': `Bearer ${app.token}` },
    });

    if (response.ok) {
      const trends = await response.json();
      const canvas = document.getElementById('profitChart');

      if (!canvas || trends.length === 0) {
        return;
      }

      const profitMap = {};
      let accumulatedProfit = 0;

      trends.forEach((trend) => {
        accumulatedProfit += trend.profit;
        profitMap[trend.date] = accumulatedProfit;
      });

      const dates = Object.keys(profitMap).sort();
      const profits = dates.map(date => profitMap[date]);

      const ctx = canvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
      gradient.addColorStop(1, 'rgba(99, 102, 241, 0.01)');

      new Chart(canvas, {
        type: 'line',
        data: {
          labels: dates,
          datasets: [{
            label: 'Lucro Acumulado (R$)',
            data: profits,
            borderColor: '#6366f1',
            backgroundColor: gradient,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#4f46e5',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              labels: {
                font: { size: 14, weight: 600 },
                color: '#374151',
                padding: 20,
              },
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              titleFont: { size: 14, weight: 600 },
              bodyFont: { size: 13 },
              borderColor: '#6366f1',
              borderWidth: 1,
              displayColors: true,
              callbacks: {
                label: function (context) {
                  return 'R$ ' + parseFloat(context.parsed.y).toFixed(2);
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0, 0, 0, 0.05)', drawBorder: false },
              ticks: {
                color: '#6b7280',
                font: { size: 12 },
                callback: function (value) { return 'R$ ' + value.toFixed(0); },
              },
            },
            x: {
              grid: { display: false },
              ticks: { color: '#6b7280', font: { size: 12 } },
            },
          },
        },
      });
    }
  } catch (error) {
    console.error('Error loading profit chart:', error);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initApp);


// ==================== Filter Functions ====================

function getStatusLabel(status) {
  const labels = {
    'pending': 'Pendente',
    'paid': 'Pago',
    'overdue': 'Atrasado'
  };
  return labels[status] || status;
}

function getPaymentStatusLabel(status) {
  const labels = {
    'pending': 'Pagamento Pendente',
    'paid': 'Totalmente Pago',
    'overdue': 'Com Atraso'
  };
  return labels[status] || status;
}

function filterLoans(status) {
  app.currentFilter = status;
  const rows = document.querySelectorAll('.loan-row');
  const buttons = document.querySelectorAll('.filter-btn');
  
  // Update button states
  buttons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.filter === status) {
      btn.classList.add('active');
    }
  });
  
  // Filter rows
  rows.forEach(row => {
    if (status === 'all' || row.dataset.status === status) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

function filterByPaymentStatus(paymentStatus) {
  app.currentPaymentFilter = paymentStatus;
  const rows = document.querySelectorAll('.loan-row');
  const buttons = document.querySelectorAll('.filter-btn[data-payment-filter]');
  
  buttons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.paymentFilter === paymentStatus) {
      btn.classList.add('active');
    }
  });
  
  rows.forEach(row => {
    if (paymentStatus === 'all' || row.dataset.paymentStatus === paymentStatus) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

function filterLoansBySearch() {
  const searchInput = document.getElementById('loanSearchInput');
  const searchTerm = searchInput.value.toLowerCase();
  const rows = document.querySelectorAll('.loan-row');
  let visibleCount = 0;
  
  rows.forEach(row => {
    const friendName = row.dataset.friendName.toLowerCase();
    const isVisible = friendName.includes(searchTerm);
    
    if (isVisible && row.style.display !== 'none') {
      row.style.display = '';
      visibleCount++;
    } else if (!isVisible) {
      row.style.display = 'none';
    }
  });
  
  const resultCount = document.getElementById('searchResultCount');
  if (searchTerm) {
    resultCount.textContent = visibleCount + ' resultado' + (visibleCount !== 1 ? 's' : '');
  } else {
    resultCount.textContent = '';
  }
}

// ==================== Google Calendar Integration ====================

async function syncGoogleCalendar() {
  try {
    // Check if already authenticated
    const statusResponse = await fetch(`${API_URL}/api/google/auth-status`);
    const status = await statusResponse.json();

    if (!status.authenticated) {
      // Get auth URL and redirect
      const response = await fetch(`${API_URL}/api/google/auth-url`);
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        alert('Google Calendar não está configurado. Adicione as credenciais do Google Cloud Console.');
      }
    } else {
      // Already authenticated, sync loans and installments
      await syncLoansToCalendar();
      await syncInstallmentsToCalendar();
    }
  } catch (error) {
    console.error('Error syncing Google Calendar:', error);
    alert('Erro ao sincronizar com Google Calendar');
  }
}

async function syncLoansToCalendar() {
  try {
    const response = await fetch(`${API_URL}/api/google/sync-loans`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${app.token}` },
    });

    if (response.ok) {
      const data = await response.json();
      alert(`${data.eventsCreated} eventos de empréstimos sincronizados com sucesso!`);
    } else {
      alert('Erro ao sincronizar empréstimos');
    }
  } catch (error) {
    console.error('Error syncing loans:', error);
  }
}

async function syncInstallmentsToCalendar() {
  try {
    const response = await fetch(`${API_URL}/api/google/sync-installments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${app.token}` },
    });

    if (response.ok) {
      const data = await response.json();
      alert(`${data.eventsCreated} eventos de parcelas sincronizados com sucesso!`);
    } else {
      alert('Erro ao sincronizar parcelas');
    }
  } catch (error) {
    console.error('Error syncing installments:', error);
  }
}

// ==================== Real-time Calculations ====================

function calculateLoanValues() {
  const initialValue = parseFloat(document.getElementById('initialValue')?.value || 0);
  const interestRate = parseFloat(document.getElementById('interestRate')?.value || 0);
  
  if (initialValue > 0 && interestRate >= 0) {
    const totalValue = initialValue * (1 + interestRate / 100);
    const profit = totalValue - initialValue;
    
    const totalDisplay = document.getElementById('totalValueDisplay');
    const profitDisplay = document.getElementById('profitDisplay');
    
    if (totalDisplay) {
      totalDisplay.textContent = 'R$ ' + totalValue.toFixed(2).replace('.', ',');
    }
    if (profitDisplay) {
      profitDisplay.textContent = 'R$ ' + profit.toFixed(2).replace('.', ',');
    }
  }
}

// Add event listeners to input fields for real-time calculation
document.addEventListener('DOMContentLoaded', function() {
  // Wait for modal to be created, then add listeners
  setTimeout(() => {
    const initialValueInput = document.getElementById('initialValue');
    const interestRateInput = document.getElementById('interestRate');
    
    if (initialValueInput) {
      initialValueInput.addEventListener('input', calculateLoanValues);
    }
    if (interestRateInput) {
      interestRateInput.addEventListener('input', calculateLoanValues);
    }
  }, 100);
});

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', initApp);
