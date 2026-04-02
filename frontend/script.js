const API_BASE = "http://127.0.0.1:8000";
let jwtToken = localStorage.getItem('finance_token') || null;
let currentUser = JSON.parse(localStorage.getItem('finance_user')) || null;
let currentPage = 1;
const PAGE_SIZE = 5;

// --- DOM Elements ---
const authScreen = document.getElementById('auth-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const logoutBtn = document.getElementById('logout-btn');
const loader = document.getElementById('loader');

// --- Utilities ---
const setLoader = (show) => {
    if (show) loader.classList.remove('hidden');
    else loader.classList.add('hidden');
};

const showToast = (message, type = 'success') => {
    const container = document.getElementById('notification-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// --- Authentication Logic ---

const checkAuth = () => {
    if (jwtToken && currentUser) {
        authScreen.classList.add('hidden');
        dashboardScreen.classList.remove('hidden');
        document.getElementById('user-name-display').innerText = `Hi, ${currentUser.username}`;
        document.getElementById('user-role-badge').innerText = currentUser.role;
        applyUIPermissions(currentUser.role);
        fetchSummary();
        fetchTransactions();
    } else {
        authScreen.classList.remove('hidden');
        dashboardScreen.classList.add('hidden');
    }
};

const applyUIPermissions = (role) => {
    const adminPanel = document.getElementById('admin-panel');
    const contentLayout = document.querySelector('.content-layout');
    
    // Reset defaults
    adminPanel.classList.remove('hidden');
    contentLayout.style.gridTemplateColumns = '380px 1fr';

    // Analyst & Viewer cannot create transactions
    if (role === 'Analyst' || role === 'Viewer') {
        adminPanel.classList.add('hidden');
        contentLayout.style.gridTemplateColumns = '1fr';
    }
    
    // Analyst can see filtering and actions; Viewer is purely read-only (delete buttons already handle this)
};

// --- Auth Event Handlers ---

showRegister.onclick = (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    document.getElementById('auth-title').innerText = "Create Account";
    document.getElementById('auth-subtitle').innerText = "Join FinanceFlow to start tracking";
};

showLogin.onclick = (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    document.getElementById('auth-title').innerText = "Welcome Back";
    document.getElementById('auth-subtitle').innerText = "Login to manage your real transactions";
};

registerForm.onsubmit = async (e) => {
    e.preventDefault();
    setLoader(true);
    const payload = {
        username: document.getElementById('reg-username').value,
        password: document.getElementById('reg-password').value,
        role: document.getElementById('reg-role').value
    };

    try {
        const res = await fetch(`${API_BASE}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Registration failed");

        showToast("Account created! You can now log in.");
        showLogin.click();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setLoader(false);
    }
};

loginForm.onsubmit = async (e) => {
    e.preventDefault();
    setLoader(true);
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const res = await fetch(`${API_BASE}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Login failed");

        jwtToken = data.access_token;
        localStorage.setItem('finance_token', jwtToken);
        
        // Fetch actual user profile from backend (Role synchronization)
        const profileRes = await fetch(`${API_BASE}/users/me`, {
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        const profileData = await profileRes.json();
        
        currentUser = { 
            username: profileData.username, 
            role: profileData.role 
        };
        localStorage.setItem('finance_user', JSON.stringify(currentUser));
        
        showToast(`Welcome back, ${currentUser.username}!`);
        checkAuth();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setLoader(false);
    }
};

logoutBtn.onclick = () => {
    localStorage.removeItem('finance_token');
    localStorage.removeItem('finance_user');
    jwtToken = null;
    currentUser = null;
    showToast("Logged out successfully");
    checkAuth();
};

// --- Dashboard Logic ---

// Custom Select Initialization
const initCustomSelects = () => {
    document.querySelectorAll('.custom-select').forEach(select => {
        const trigger = select.querySelector('.select-trigger');
        const options = select.querySelectorAll('.option');
        const hiddenInput = select.querySelector('input[type="hidden"]');
        const triggerText = trigger.querySelector('span');

        trigger.onclick = (e) => {
            e.stopPropagation();
            // Close all other selects
            document.querySelectorAll('.custom-select').forEach(s => {
                if (s !== select) s.classList.remove('active');
            });
            select.classList.toggle('active');
        };

        options.forEach(opt => {
            opt.onclick = () => {
                const val = opt.getAttribute('data-value');
                const text = opt.innerText;
                
                hiddenInput.value = val;
                triggerText.innerText = text;
                triggerText.classList.remove('placeholder');
                
                options.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                
                select.classList.remove('active');

                // Trigger change event if needed for filters
                if (select.id === 'custom-filter-type') {
                    fetchTransactions(getFilterValues());
                }
            };
        });
    });

    // Close on outside click
    window.addEventListener('click', () => {
        document.querySelectorAll('.custom-select').forEach(s => s.classList.remove('active'));
    });
};

async function fetchSummary() {
    try {
        const res = await fetch(`${API_BASE}/summary`, {
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        if (!res.ok) {
            if (res.status === 401) logoutBtn.click();
            throw new Error("Failed to fetch summary");
        }
        const data = await res.json();
        document.getElementById('total-income').innerText = formatCurrency(data.total_income);
        document.getElementById('total-expense').innerText = formatCurrency(data.total_expense);
        document.getElementById('current-balance').innerText = formatCurrency(data.current_balance);
    } catch (err) { console.error(err); }
}

async function fetchTransactions(filters = {}) {
    setLoader(true);
    try {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(filters)) if (value) params.append(key, value);
        params.append('skip', (currentPage - 1) * PAGE_SIZE);
        params.append('limit', PAGE_SIZE);
        
        const res = await fetch(`${API_BASE}/transactions?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        if (!res.ok) throw new Error("Failed to load records");
        const data = await res.json();
        renderTransactions(data);
    } catch (err) { showToast(err.message, 'error'); } 
    finally { setLoader(false); }
}

function renderTransactions(data) {
    const body = document.getElementById('tx-table-body');
    const table = document.getElementById('tx-table');
    const empty = document.getElementById('empty-state');
    
    body.innerHTML = '';
    const items = data.items || [];
    const total = data.total || 0;

    if (items.length === 0) {
        empty.classList.remove('hidden');
        table.classList.add('hidden');
    } else {
        empty.classList.add('hidden');
        table.classList.remove('hidden');
    }

    const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
    document.getElementById('page-info').innerText = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prev-page-btn').disabled = currentPage === 1;
    document.getElementById('next-page-btn').disabled = currentPage >= totalPages;

    items.forEach(tx => {
        const tr = document.createElement('tr');
        const isIncome = tx.type === 'Income';
        const actionHtml = (currentUser.role === 'Admin') 
            ? `<button class="delete-btn-table" onclick="deleteTransaction(${tx.id})">Delete</button>` 
            : `<span style="color:var(--text-secondary);font-size:0.75rem;">Locked</span>`;

        tr.innerHTML = `
            <td><span style="color:var(--accent-primary); font-weight:600;">#${tx.id}</span></td>
            <td style="color:var(--text-secondary)">${formatDate(tx.date)}</td>
            <td><span class="badge ${isIncome ? 'income' : 'expense'}">${tx.type}</span></td>
            <td><span style="font-weight:500;">${tx.category}</span></td>
            <td style="color:var(--text-secondary)">${tx.description || '-'}</td>
            <td style="font-weight: 700; color: ${isIncome ? 'var(--accent-success)' : 'var(--accent-danger)'}">
                ${isIncome ? '+' : '-'}${formatCurrency(tx.amount).replace('₹', ' ₹')}
            </td>
            <td>${actionHtml}</td>
        `;
        body.appendChild(tr);
    });
}

document.getElementById('add-tx-form').onsubmit = async (e) => {
    e.preventDefault();
    setLoader(true);
    const payload = {
        amount: parseFloat(document.getElementById('amount').value),
        type: document.getElementById('type').value,
        category: document.getElementById('category').value,
        date: document.getElementById('date').value,
        description: document.getElementById('description').value || null
    };

    try {
        const res = await fetch(`${API_BASE}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Validation Error: Check input criteria");
        
        showToast("Record added successfully!");
        document.getElementById('add-tx-form').reset();
        // Reset custom selects back to defaults
        const typeSelect = document.getElementById('custom-tx-type');
        typeSelect.querySelector('.select-trigger span').innerText = "Income (+)";
        typeSelect.querySelector('input').value = "Income";
        
        await fetchSummary();
        await fetchTransactions(getFilterValues());
    } catch (err) { 
        showToast(err.message, 'error'); 
    } 
    finally { setLoader(false); }
};

async function deleteTransaction(id) {
    if (!confirm("Remove this entry?")) return;
    setLoader(true);
    try {
        const res = await fetch(`${API_BASE}/transactions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        if (!res.ok) throw new Error("Delete failed");
        showToast("Entry removed");
        await fetchSummary();
        await fetchTransactions(getFilterValues());
    } catch (err) { showToast(err.message, 'error'); } 
    finally { setLoader(false); }
}

const getFilterValues = () => ({
    type: document.getElementById('filter-type').value,
    category: document.getElementById('filter-category').value,
    start_date: document.getElementById('filter-start-date').value,
    end_date: document.getElementById('filter-end-date').value,
    search: document.getElementById('filter-search').value
});

document.getElementById('filter-form').onsubmit = (e) => {
    e.preventDefault();
    currentPage = 1;
    fetchTransactions(getFilterValues());
};

document.getElementById('clear-filters-btn').onclick = () => {
    document.getElementById('filter-form').reset();
    // Reset custom select too
    const filterSelect = document.getElementById('custom-filter-type');
    filterSelect.querySelector('.select-trigger span').innerText = "All Types";
    filterSelect.querySelector('input').value = "";
    currentPage = 1;
    fetchTransactions();
};

document.getElementById('prev-page-btn').onclick = () => {
    if (currentPage > 1) { currentPage--; fetchTransactions(getFilterValues()); }
};

document.getElementById('next-page-btn').onclick = () => {
    currentPage++; fetchTransactions(getFilterValues());
};

document.getElementById('filter-toggle-btn').onclick = () => {
    document.getElementById('filters-container').classList.toggle('collapsed');
};

document.getElementById('export-csv-btn').onclick = async () => {
    setLoader(true);
    try {
        const params = new URLSearchParams(getFilterValues());
        const res = await fetch(`${API_BASE}/transactions/export?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        });
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        showToast("CSV Exported");
    } catch (err) { showToast("Export failed", "error"); } 
    finally { setLoader(false); }
};

// Initialize
window.onload = () => {
    initCustomSelects();
    checkAuth();
};
