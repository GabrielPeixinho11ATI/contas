/**
 * BILL ORGANIZER V10 - RESPONSIVE EVOLUTION ENGINE
 * Ultra-Fast SPA | 100% LocalStorage | Dual-View Sync
 */

// --- GLOBAL STATE ---
let state = {
    appName: "Bills Pro V11",
    theme: 'dark',
    members: ["Gabriel", "Casa", "Família"],
    banks: [
        { name: "Nubank", color: "#8a05be" },
        { name: "Itaú", color: "#ec7000" },
        { name: "Cash", color: "#10B981" }
    ],
    bills: [],
    viewDate: new Date(),
    filter: {
        member: 'Tudo',
        day: null
    }
};

// --- DATA persistence ---
function loadStore() {
    const saved = localStorage.getItem('bills_v10_evo');
    if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
        state.viewDate = new Date(state.viewDate);
    }
    applyTheme();
    refreshUI();
}

function saveStore() {
    localStorage.setItem('bills_v10_evo', JSON.stringify(state));
    refreshUI();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const mSwitch = document.getElementById('theme-toggle');
    if (mSwitch) mSwitch.innerText = state.theme === 'dark' ? '☀️' : '🌙';
}

// --- BACKUP (Shared logic) ---
function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_bills_v10_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (data.bills && data.members) {
                state = { ...state, ...data };
                state.viewDate = new Date();
                saveStore();
                alert('Backup Restaurado com Sucesso! �📱');
            } else throw new Error();
        } catch (err) { alert('Falha ao restaurar. Arquivo inválido.'); }
    };
    reader.readAsText(file);
}

// --- CORE RENDER ENGINE ---
const ui = {
    pendingLabels: document.querySelectorAll('.pending-val-display'),
    paidLabels: document.querySelectorAll('.paid-val-display'),
    mLabel: document.getElementById('label-month'),
    yLabel: document.getElementById('label-year'),
    calLabelFixed: document.getElementById('cal-label-fixed'),
    calLabelModal: document.getElementById('cal-label-modal'),
    pStack: document.getElementById('pending-stack'),
    hStack: document.getElementById('paid-stack'),
    hCount: document.getElementById('paid-count'),
    pillsM: document.getElementById('filter-pills-m'),
    pillsPC: document.getElementById('pc-member-filters'),
    gridFixed: document.getElementById('cal-grid-fixed'),
    gridModal: document.getElementById('cal-grid-modal')
};

function refreshUI() {
    const pivot = state.viewDate;
    const m = pivot.getMonth();
    const y = pivot.getFullYear();
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    // Branding Sync
    document.querySelectorAll('.app-name-display').forEach(el => el.innerText = state.appName);
    document.title = state.appName;

    // Global Labels
    if (ui.mLabel) ui.mLabel.innerText = monthNames[m];
    if (ui.yLabel) ui.yLabel.innerText = y;
    if (ui.calLabelFixed) ui.calLabelFixed.innerText = `${monthNames[m]} ${y}`;
    if (ui.calLabelModal) ui.calLabelModal.innerText = `${monthNames[m]} ${y}`;

    const monthBills = state.bills.filter(b => {
        const d = new Date(b.date);
        return d.getMonth() === m && d.getFullYear() === y;
    });

    // Totals Sync
    const tp = monthBills.filter(b => !b.paid).reduce((acc, b) => acc + parseFloat(b.value), 0);
    const th = monthBills.filter(b => b.paid).reduce((acc, b) => acc + parseFloat(b.value), 0);
    ui.pendingLabels.forEach(el => el.innerText = formatCurrency(tp));
    ui.paidLabels.forEach(el => el.innerText = formatCurrency(th));

    renderPills();
    renderLists(monthBills);
    renderCalendar('fixed');
    renderCalendar('modal');
    syncSettings();
}

function renderPills() {
    const containers = [ui.pillsM, ui.pillsPC];
    containers.forEach(con => {
        if (!con) return;
        con.innerHTML = '';
        ['Tudo', ...state.members].forEach(m => {
            const btn = document.createElement('button');
            btn.className = `pill ${state.filter.member === m ? 'active' : ''}`;
            btn.innerText = m;
            btn.onclick = () => { state.filter.member = m; state.filter.day = null; saveStore(); };
            con.appendChild(btn);
        });
    });
}

function renderLists(monthBills) {
    ui.pStack.innerHTML = ''; ui.hStack.innerHTML = '';

    const filtered = monthBills.filter(b => {
        const mOk = state.filter.member === 'Tudo' || b.member === state.filter.member;
        const dOk = !state.filter.day || new Date(b.date).getUTCDate() === state.filter.day;
        return mOk && dOk;
    });

    let paidCount = 0;
    filtered.forEach(b => {
        const bank = state.banks.find(bk => bk.name === b.bank) || { color: '#666' };
        const card = document.createElement('div');
        card.className = `bill-card ${b.paid ? 'faded' : ''}`;
        card.innerHTML = `
            <div class="b-info">
                <div class="b-tags">
                    <span class="tag-s" style="background:${bank.color}">${b.bank}</span>
                    <span class="tag-s tag-mem">${b.member}</span>
                </div>
                <span class="b-name">${b.title}</span>
                <span class="b-meta">Vencimento dia ${new Date(b.date).getUTCDate()}</span>
            </div>
            <div class="b-action">
                <span class="b-price">${formatCurrency(b.value)}</span>
                ${!b.paid ? `<button class="pay-btn" onclick="toggleBill(${b.id})">✓</button>` : '✅'}
                <button onclick="delBill(${b.id})" style="border:none; background:none; color:red; font-size:9px; margin-left:8px; opacity:0.1;">DELL</button>
            </div>
        `;
        if (b.paid) { ui.hStack.appendChild(card); paidCount++; }
        else ui.pStack.appendChild(card);
    });
    ui.hCount.innerText = paidCount;
    if (ui.pStack.innerHTML === '') ui.pStack.innerHTML = '<p style="text-align:center; padding:30px; opacity:0.3; font-size:0.8rem;">Parabéns! Nenhuma conta pendente. ✨</p>';
}

function renderCalendar(type) {
    const grid = type === 'fixed' ? ui.gridFixed : ui.gridModal;
    if (!grid) return;
    grid.innerHTML = '';
    const y = state.viewDate.getFullYear();
    const m = state.viewDate.getMonth();

    const first = new Date(y, m, 1).getDay();
    const last = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < first; i++) grid.appendChild(document.createElement('div'));

    for (let d = 1; d <= last; d++) {
        const cell = document.createElement('div');
        cell.className = `day-cell ${state.filter.day === d ? 'active-sel' : ''}`;
        cell.innerText = d;

        const dayBills = state.bills.filter(b => {
            const date = new Date(b.date);
            return date.getUTCDate() === d && date.getUTCMonth() === m && date.getUTCFullYear() === y && !b.paid;
        });

        if (dayBills.length > 0) {
            const dots = document.createElement('div');
            dots.className = 'day-markers';
            dayBills.slice(0, 3).forEach(b => {
                const bnk = state.banks.find(bk => bk.name === b.bank) || { color: '#666' };
                const dot = document.createElement('div');
                dot.className = 'dot-sm'; dot.style.background = bnk.color;
                dots.appendChild(dot);
            });
            cell.appendChild(dots);
        }

        if (d === new Date().getDate() && m === new Date().getMonth() && y === new Date().getFullYear()) cell.classList.add('today-is');

        cell.onclick = () => {
            state.filter.day = (state.filter.day === d) ? null : d;
            document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
            saveStore();
        };
        grid.appendChild(cell);
    }
}

// --- APP ACTIONS ---
function toggleBill(id) {
    const i = state.bills.findIndex(b => b.id === id);
    if (i !== -1) { state.bills[i].paid = !state.bills[i].paid; saveStore(); }
}

function delBill(id) {
    if (confirm('Deletar despesa permanentemente?')) {
        state.bills = state.bills.filter(b => b.id !== id);
        saveStore();
    }
}

function switchMonth(dir) {
    state.viewDate.setMonth(state.viewDate.getMonth() + dir);
    state.filter.day = null;
    saveStore();
}

// --- BINDINGS ---

// Pre-fill branding input
const inAppName = document.getElementById('in-app-name');
if (inAppName) {
    inAppName.value = state.appName || "Bills Pro V11";
    inAppName.oninput = () => {
        state.appName = inAppName.value || "Bills Pro V11";
        document.querySelectorAll('.app-name-display').forEach(el => el.innerText = state.appName);
        document.title = state.appName;
        saveStore();
    };
}

// Dashboard / Theme
document.getElementById('theme-toggle').onclick = () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveStore();
};

// Backup Mobile
document.getElementById('export-m').onclick = exportData;
document.getElementById('import-trigger-m').onclick = () => document.getElementById('import-file').click();

// Backup PC
if (document.getElementById('export-pc')) document.getElementById('export-pc').onclick = exportData;
if (document.getElementById('import-trigger-pc')) document.getElementById('import-trigger-pc').onclick = () => document.getElementById('import-file').click();

document.getElementById('import-file').onchange = importData;

// Modal Toggles
document.getElementById('m-btn-open-cal').onclick = () => document.getElementById('modal-cal').style.display = 'flex';
document.getElementById('m-btn-open-settings').onclick = () => document.getElementById('modal-settings').style.display = 'flex';
if (document.getElementById('pc-open-settings')) document.getElementById('pc-open-settings').onclick = () => document.getElementById('modal-settings').style.display = 'flex';
document.getElementById('fab-add').onclick = () => document.getElementById('modal-form').style.display = 'flex';

document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
});

// Calendar Navigation Fixed + Modal
document.getElementById('cal-prev').onclick = () => switchMonth(-1);
document.getElementById('cal-next').onclick = () => switchMonth(1);
document.getElementById('m-cal-prev').onclick = () => switchMonth(-1);
document.getElementById('m-cal-next').onclick = () => switchMonth(1);

// Bill Form
document.getElementById('bill-form').onsubmit = (e) => {
    e.preventDefault();
    state.bills.push({
        id: Date.now(),
        title: document.getElementById('in-title').value,
        value: document.getElementById('in-value').value,
        date: document.getElementById('in-date').value,
        member: document.getElementById('in-member').value,
        bank: document.getElementById('in-bank').value,
        paid: false
    });
    e.target.reset();
    document.getElementById('modal-form').style.display = 'none';
    saveStore();
};

// --- SETTINGS SYNC ---
function syncSettings() {
    const memS = document.getElementById('in-member'), bnkS = document.getElementById('in-bank');
    memS.innerHTML = ''; bnkS.innerHTML = '';
    state.members.forEach(m => memS.innerHTML += `<option value="${m}">${m}</option>`);
    state.banks.forEach(b => bnkS.innerHTML += `<option value="${b.name}">${b.name}</option>`);

    const memC = document.getElementById('set-members-list'), bnkC = document.getElementById('set-banks-list');
    memC.innerHTML = ''; bnkC.innerHTML = '';
    state.members.forEach(m => {
        const div = document.createElement('div'); div.className = 'tag-item';
        div.innerHTML = `<span>${m}</span> <button class="btn-del" onclick="remItem('${m}', 'm')">×</button>`;
        memC.appendChild(div);
    });
    state.banks.forEach(b => {
        const div = document.createElement('div'); div.className = 'tag-item';
        div.innerHTML = `<span style="color:${b.color}">●</span> <span>${b.name}</span> <button class="btn-del" onclick="remItem('${b.name}', 'b')">×</button>`;
        bnkC.appendChild(div);
    });
}

function remItem(name, type) {
    if (confirm(`Remover ${name}?`)) {
        if (type === 'm') state.members = state.members.filter(x => x !== name);
        else state.banks = state.banks.filter(x => x.name !== name);
        saveStore();
    }
}

document.getElementById('add-mem-btn').onclick = () => {
    const i = document.getElementById('new-mem'); if (i.value) { state.members.push(i.value); i.value = ''; saveStore(); }
};

document.getElementById('add-bnk-btn').onclick = () => {
    const n = document.getElementById('new-bnk'), c = document.getElementById('bnk-color');
    if (n.value) { state.banks.push({ name: n.value, color: c.value }); n.value = ''; saveStore(); }
};

function formatCurrency(v) { return `R$ ${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`; }

// --- BOOTSTRAP ---
loadStore();
