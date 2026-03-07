/**
 * FINANÇAS PRO V4 - LOGIC ENGINE
 * 100% Client-Side / LocalStorage
 */

// --- ESTADO INICIAL ---
let state = {
    theme: 'light',
    membros: ["Geral", "Família"],
    bancos: [
        { nome: "Nubank", cor: "#8a05be" },
        { nome: "Itaú", cor: "#ec7000" },
        { nome: "Inter", cor: "#ff7a00" }
    ],
    contas: [],
    viewDate: new Date(), // Mês atual
    filters: {
        membro: 'Tudo',
        dia: null
    }
};

// --- PERSISTÊNCIA ---
function loadData() {
    const saved = localStorage.getItem('financas_pro_v4');
    if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
        state.viewDate = new Date(state.viewDate);
    }
    applyTheme();
    render();
}

function saveData() {
    localStorage.setItem('financas_pro_v4', JSON.stringify(state));
    render();
}

// --- TEMA ---
function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
}

document.getElementById('theme-toggle').onclick = () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    saveData();
    applyTheme();
};

// --- SELETORES DOM ---
const dom = {
    totalPending: document.getElementById('total-pending'),
    totalPaid: document.getElementById('total-paid'),
    totalBalance: document.getElementById('total-balance'),
    displayMonth: document.getElementById('display-month'),
    displayYear: document.getElementById('display-year'),
    pendingList: document.getElementById('pending-list'),
    paidList: document.getElementById('paid-list'),
    paidCount: document.getElementById('paid-count'),
    memberFilters: document.getElementById('member-filters'),
    calendarBody: document.getElementById('calendar-body'),
    calMonthTitle: document.getElementById('cal-month-title')
};

// --- RENDERIZAÇÃO ---
function render() {
    renderDashboard();
    renderFilters();
    renderBills();
    renderCalendar();
    updateSelectors();
    renderSettings();
}

function renderDashboard() {
    const month = state.viewDate.getMonth();
    const year = state.viewDate.getFullYear();

    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    dom.displayMonth.innerText = months[month];
    dom.displayYear.innerText = year;

    const currentMonthBills = state.contas.filter(c => {
        const d = new Date(c.data);
        return d.getMonth() === month && d.getFullYear() === year;
    });

    const pending = currentMonthBills.filter(c => !c.paga).reduce((acc, c) => acc + parseFloat(c.valor), 0);
    const paid = currentMonthBills.filter(c => c.paga).reduce((acc, c) => acc + parseFloat(c.valor), 0);

    dom.totalPending.innerText = formatCurrency(pending);
    dom.totalPaid.innerText = formatCurrency(paid);
    dom.totalBalance.innerText = formatCurrency(pending + paid);
}

function renderFilters() {
    dom.memberFilters.innerHTML = '';

    const pills = ['Tudo', ...state.membros];
    pills.forEach(m => {
        const btn = document.createElement('button');
        btn.className = `pill ${state.filters.membro === m ? 'active' : ''}`;
        btn.innerText = m;
        btn.onclick = () => {
            state.filters.membro = m;
            state.filters.dia = null;
            saveData();
        };
        dom.memberFilters.appendChild(btn);
    });
}

function renderBills() {
    dom.pendingList.innerHTML = '';
    dom.paidList.innerHTML = '';

    const month = state.viewDate.getMonth();
    const year = state.viewDate.getFullYear();

    const filtered = state.contas.filter(c => {
        const d = new Date(c.data);
        const matchMonth = d.getMonth() === month && d.getFullYear() === year;
        const matchMembro = state.filters.membro === 'Tudo' || c.membro === state.filters.membro;
        const matchDia = !state.filters.dia || d.getDate() === state.filters.dia;
        return matchMonth && matchMembro && matchDia;
    });

    let countPaid = 0;

    filtered.forEach(c => {
        const bank = state.bancos.find(b => b.nome === c.banco) || { cor: '#ccc' };
        const card = document.createElement('div');
        card.className = `bill-card ${c.paga ? 'paid' : ''}`;
        card.innerHTML = `
            <div class="card-left">
                <div class="tag-row">
                    <span class="tag" style="background:${bank.cor}">${c.banco}</span>
                    <span class="tag tag-member">${c.membro}</span>
                </div>
                <span class="card-title">${c.titulo}</span>
                <span class="card-date">Vence dia ${new Date(c.data).getUTCDate()}</span>
            </div>
            <div class="card-right">
                <p class="card-value">${formatCurrency(c.valor)}</p>
                ${!c.paga ? `<button class="btn-check" onclick="togglePago(${c.id})">✓</button>` : '✓'}
                <button class="btn-del" onclick="deleteConta(${c.id})" style="margin-left:8px; font-size:10px; opacity:0.5">EXCLUIR</button>
            </div>
        `;

        if (c.paga) {
            dom.paidList.appendChild(card);
            countPaid++;
        } else {
            dom.pendingList.appendChild(card);
        }
    });

    dom.paidCount.innerText = countPaid;
    if (dom.pendingList.innerHTML === '') dom.pendingList.innerHTML = '<p style="text-align:center; opacity:0.3; padding:20px;">Nada pendente ✨</p>';
}

function renderCalendar() {
    dom.calendarBody.innerHTML = '';
    const year = state.viewDate.getFullYear();
    const month = state.viewDate.getMonth();

    dom.calMonthTitle.innerText = dom.displayMonth.innerText + " " + year;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        dom.calendarBody.appendChild(document.createElement('div'));
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = `cal-day ${state.filters.dia === d ? 'selected' : ''}`;
        dayDiv.innerText = d;

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayBills = state.contas.filter(c => {
            const billDate = new Date(c.data);
            return billDate.getUTCDate() === d && billDate.getUTCMonth() === month && billDate.getUTCFullYear() === year;
        });

        if (dayBills.length > 0) {
            const dotsDiv = document.createElement('div');
            dotsDiv.className = 'day-dots';
            dayBills.slice(0, 3).forEach(b => {
                const bank = state.bancos.find(bnk => bnk.nome === b.banco) || { cor: '#ccc' };
                const dot = document.createElement('div');
                dot.className = 'dot';
                dot.style.background = bank.cor;
                dotsDiv.appendChild(dot);
            });
            dayDiv.appendChild(dotsDiv);
        }

        if (d === new Date().getDate() && month === new Date().getMonth()) dayDiv.classList.add('today');

        dayDiv.onclick = () => {
            state.filters.dia = (state.filters.dia === d) ? null : d;
            closeModals();
            saveData();
        };
        dom.calendarBody.appendChild(dayDiv);
    }
}

// --- AÇÕES ---
function togglePago(id) {
    const idx = state.contas.findIndex(c => c.id === id);
    if (idx !== -1) {
        state.contas[idx].paga = !state.contas[idx].paga;
        saveData();
    }
}

function deleteConta(id) {
    if (confirm('Excluir esta conta?')) {
        state.contas = state.contas.filter(c => c.id !== id);
        saveData();
    }
}

// --- MODAIS ---
function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
}

document.querySelectorAll('.close-modal').forEach(b => b.onclick = closeModals);

document.getElementById('open-calendar').onclick = () => document.getElementById('modal-calendar').style.display = 'flex';
document.getElementById('manage-settings').onclick = () => document.getElementById('modal-settings').style.display = 'flex';
document.getElementById('add-bill').onclick = () => document.getElementById('modal-bill').style.display = 'flex';

// --- FORMULÁRIOS ---
document.getElementById('bill-form').onsubmit = (e) => {
    e.preventDefault();
    const n = {
        id: Date.now(),
        titulo: document.getElementById('bill-title').value,
        valor: document.getElementById('bill-value').value,
        data: document.getElementById('bill-date').value,
        membro: document.getElementById('bill-member').value,
        banco: document.getElementById('bill-bank').value,
        paga: false
    };
    state.contas.push(n);
    e.target.reset();
    closeModals();
    saveData();
};

function updateSelectors() {
    const memS = document.getElementById('bill-member');
    const bnkS = document.getElementById('bill-bank');
    memS.innerHTML = '';
    bnkS.innerHTML = '';
    state.membros.forEach(m => memS.innerHTML += `<option value="${m}">${m}</option>`);
    state.bancos.forEach(b => bnkS.innerHTML += `<option value="${b.nome}">${b.nome}</option>`);
}

// --- CONFIGURAÇÕES ---
function renderSettings() {
    const lM = document.getElementById('list-members');
    const lB = document.getElementById('list-banks');
    lM.innerHTML = '';
    lB.innerHTML = '';

    state.membros.forEach(m => {
        const d = document.createElement('div');
        d.className = 'tag-item';
        d.innerHTML = `${m} <button class="btn-del" onclick="deleteTag('${m}', 'membro')">×</button>`;
        lM.appendChild(d);
    });

    state.bancos.forEach(b => {
        const d = document.createElement('div');
        d.className = 'tag-item';
        d.innerHTML = `<span style="color:${b.cor}">●</span> ${b.nome} <button class="btn-del" onclick="deleteTag('${b.nome}', 'banco')">×</button>`;
        lB.appendChild(d);
    });
}

function deleteTag(name, type) {
    if (confirm(`Remover ${name}?`)) {
        if (type === 'membro') state.membros = state.membros.filter(m => m !== name);
        else state.bancos = state.bancos.filter(b => b.nome !== name);
        saveData();
    }
}

document.getElementById('btn-add-member').onclick = () => {
    const val = document.getElementById('new-member').value.trim();
    if (val) {
        state.membros.push(val);
        document.getElementById('new-member').value = '';
        saveData();
    }
};

document.getElementById('btn-add-bank').onclick = () => {
    const nome = document.getElementById('new-bank').value.trim();
    const cor = document.getElementById('bank-color').value;
    if (nome) {
        state.bancos.push({ nome, cor });
        document.getElementById('new-bank').value = '';
        saveData();
    }
};

// --- NAVEGAÇÃO ---
document.getElementById('prev-month').onclick = () => {
    state.viewDate.setMonth(state.viewDate.getMonth() - 1);
    state.filters.dia = null;
    saveData();
};

document.getElementById('next-month').onclick = () => {
    state.viewDate.setMonth(state.viewDate.getMonth() + 1);
    state.filters.dia = null;
    saveData();
};

// --- AUXILIARES ---
function formatCurrency(v) {
    return `R$ ${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

// --- INIT ---
loadData();
