/**
 * BILL ORGANIZER PRO V9 - SENIOR SPA LOGIC
 * 100% LocalStorage | Dynamic Modal Calendar Navigation
 */

// --- GLOBAL STATE ---
let state = {
    theme: 'dark',
    members: ["Gabriel", "Família", "Casa"],
    banks: [
        { name: "Nubank", color: "#8a05be" },
        { name: "Itaú", color: "#ec7000" },
        { name: "Dinheiro", color: "#10B981" }
    ],
    bills: [],
    viewDate: new Date(), // Central Navigation Date
    filter: {
        member: 'Tudo',
        day: null
    }
};

// --- CORE DATA OPERATIONS ---
function loadState() {
    const saved = localStorage.getItem('bill_pro_v9_final');
    if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
        state.viewDate = new Date(state.viewDate);
    }
    applyTheme();
    refreshUI();
}

function saveState() {
    localStorage.setItem('bill_pro_v9_final', JSON.stringify(state));
    refreshUI();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    document.getElementById('theme-toggle').innerText = state.theme === 'dark' ? '☀️' : '🌙';
}

// --- BACKUP ENGINE ---
function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_bills_v9_${new Date().toISOString().split('T')[0]}.json`;
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
                saveState();
                alert('Backup restaurado! 🚀');
            } else throw new Error();
        } catch (err) { alert('Arquivo inválido.'); }
    };
    reader.readAsText(file);
}

// --- RENDER ENGINE ---
const ui = {
    pending: document.getElementById('total-pending-val'),
    paid: document.getElementById('total-paid-val'),
    mLabel: document.getElementById('label-month'),
    yLabel: document.getElementById('label-year'),
    pStack: document.getElementById('pending-stack'),
    hStack: document.getElementById('paid-stack'),
    hCount: document.getElementById('paid-count'),
    pills: document.getElementById('filter-pills'),
    calTitle: document.getElementById('cal-month-title'),
    calGrid: document.getElementById('cal-grid')
};

function refreshUI() {
    const pivot = state.viewDate;
    const m = pivot.getMonth();
    const y = pivot.getFullYear();
    const names = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    ui.mLabel.innerText = names[m];
    ui.yLabel.innerText = y;

    // Filtered month data
    const monthBills = state.bills.filter(b => {
        const d = new Date(b.date);
        return d.getMonth() === m && d.getFullYear() === y;
    });

    // Sums
    const totalP = monthBills.filter(b => !b.paid).reduce((acc, b) => acc + parseFloat(b.value), 0);
    const totalH = monthBills.filter(b => b.paid).reduce((acc, b) => acc + parseFloat(b.value), 0);

    ui.pending.innerText = formatBRL(totalP);
    ui.paid.innerText = formatBRL(totalH);

    renderPills();
    renderLists(monthBills);
    renderCalendar();
    syncSelectors();
    renderSettings();
}

function renderPills() {
    ui.pills.innerHTML = '';
    ['Tudo', ...state.members].forEach(m => {
        const btn = document.createElement('button');
        btn.className = `pill ${state.filter.member === m ? 'active' : ''}`;
        btn.innerText = m;
        btn.onclick = () => { state.filter.member = m; state.filter.day = null; saveState(); };
        ui.pills.appendChild(btn);
    });
}

function renderLists(monthBills) {
    ui.pStack.innerHTML = ''; ui.hStack.innerHTML = '';

    const filtered = monthBills.filter(b => {
        const mOk = state.filter.member === 'Tudo' || b.member === state.filter.member;
        const dOk = !state.filter.day || new Date(b.date).getUTCDate() === state.filter.day;
        return mOk && dOk;
    });

    let paidN = 0;
    filtered.forEach(b => {
        const bank = state.banks.find(bk => bk.name === b.bank) || { color: '#666' };
        const card = document.createElement('div');
        card.className = `bill-card ${b.paid ? 'faded' : ''}`;
        card.innerHTML = `
            <div class="b-card-left">
                <div class="b-tags">
                    <span class="b-tag" style="background:${bank.color}">${b.bank}</span>
                    <span class="b-tag b-tag-mem">${b.member}</span>
                </div>
                <span class="b-title">${b.title}</span>
                <span class="b-due">Dia ${new Date(b.date).getUTCDate()}</span>
            </div>
            <div class="b-card-right">
                <span class="b-val">${formatBRL(b.value)}</span>
                ${!b.paid ? `<button class="btn-pay" onclick="toggleStatus(${b.id})">✓</button>` : '✅'}
                <button onclick="delBill(${b.id})" style="border:none; background:none; color:red; font-size:9px; margin-left:8px; opacity:0.1;">DEL</button>
            </div>
        `;
        if (b.paid) { ui.hStack.appendChild(card); paidN++; }
        else ui.pStack.appendChild(card);
    });
    ui.hCount.innerText = paidN;
    if (ui.pStack.innerHTML === '') ui.pStack.innerHTML = '<p style="text-align:center; opacity:0.3; padding:20px; font-size:0.8rem;">Paz financeira! Nada pendente. ✨</p>';
}

function renderCalendar() {
    ui.calGrid.innerHTML = '';
    const y = state.viewDate.getFullYear();
    const m = state.viewDate.getMonth();
    const names = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    ui.calTitle.innerText = `${names[m]} ${y}`;

    const first = new Date(y, m, 1).getDay();
    const last = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < first; i++) ui.calGrid.appendChild(document.createElement('div'));

    for (let d = 1; d <= last; d++) {
        const cell = document.createElement('div');
        cell.className = `cal-day-cell ${state.filter.day === d ? 'active-d' : ''}`;
        cell.innerText = d;

        const dayBills = state.bills.filter(b => {
            const date = new Date(b.date);
            return date.getUTCDate() === d && date.getUTCMonth() === m && date.getUTCFullYear() === y && !b.paid;
        });

        if (dayBills.length > 0) {
            const dots = document.createElement('div');
            dots.className = 'cal-dots';
            dayBills.slice(0, 3).forEach(b => {
                const bnk = state.banks.find(bk => bk.name === b.bank) || { color: '#666' };
                const dot = document.createElement('div');
                dot.className = 'dot-sm'; dot.style.background = bnk.color;
                dots.appendChild(dot);
            });
            cell.appendChild(dots);
        }

        if (d === new Date().getDate() && m === new Date().getMonth() && y === new Date().getFullYear()) cell.classList.add('today-m');

        cell.onclick = () => {
            state.filter.day = (state.filter.day === d) ? null : d;
            closeModals();
            saveState();
        };
        ui.calGrid.appendChild(cell);
    }
}

// --- ACTIONS ---
function toggleStatus(id) {
    const i = state.bills.findIndex(b => b.id === id);
    if (i !== -1) { state.bills[i].paid = !state.bills[i].paid; saveState(); }
}

function delBill(id) {
    if (confirm('Deletar despesa?')) {
        state.bills = state.bills.filter(b => b.id !== id);
        saveState();
    }
}

function switchMonth(dir) {
    state.viewDate.setMonth(state.viewDate.getMonth() + dir);
    state.filter.day = null;
    saveState();
}

// --- BINDINGS ---
document.getElementById('theme-toggle').onclick = () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; applyTheme(); saveState(); };
document.getElementById('export-json').onclick = exportData;
document.getElementById('import-trigger').onclick = () => document.getElementById('import-file').click();
document.getElementById('import-file').onchange = importData;

document.getElementById('btn-open-cal').onclick = () => document.getElementById('modal-cal').style.display = 'flex';
document.getElementById('btn-open-settings').onclick = () => document.getElementById('modal-settings').style.display = 'flex';
document.getElementById('fab-add').onclick = () => document.getElementById('modal-form').style.display = 'flex';

document.getElementById('cal-prev').onclick = () => switchMonth(-1);
document.getElementById('cal-next').onclick = () => switchMonth(1);

function closeModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); }
document.querySelectorAll('.modal-close').forEach(b => b.onclick = closeModals);

document.getElementById('form-bill').onsubmit = (e) => {
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
    e.target.reset(); closeModals(); saveState();
};

function syncSelectors() {
    const mS = document.getElementById('in-member'), bS = document.getElementById('in-bank');
    mS.innerHTML = ''; bS.innerHTML = '';
    state.members.forEach(m => mS.innerHTML += `<option value="${m}">${m}</option>`);
    state.banks.forEach(b => bS.innerHTML += `<option value="${b.name}">${b.name}</option>`);
}

function renderSettings() {
    const mC = document.getElementById('set-members-list'), bC = document.getElementById('set-banks-list');
    mC.innerHTML = ''; bC.innerHTML = '';
    state.members.forEach(m => {
        const div = document.createElement('div'); div.className = 'tag-item';
        div.innerHTML = `<span>${m}</span> <button class="btn-del-mini" onclick="remItem('${m}', 'm')">×</button>`;
        mC.appendChild(div);
    });
    state.banks.forEach(b => {
        const div = document.createElement('div'); div.className = 'tag-item';
        div.innerHTML = `<span style="color:${b.color}">●</span> <span>${b.name}</span> <button class="btn-del-mini" onclick="remItem('${b.name}', 'b')">×</button>`;
        bC.appendChild(div);
    });
}

function remItem(name, type) {
    if (confirm(`Remover ${name}?`)) {
        if (type === 'm') state.members = state.members.filter(x => x !== name);
        else state.banks = state.banks.filter(x => x.name !== name);
        saveState();
    }
}

document.getElementById('add-mem-btn').onclick = () => {
    const i = document.getElementById('new-mem'); if (i.value) { state.members.push(i.value); i.value = ''; saveState(); }
};

document.getElementById('add-bnk-btn').onclick = () => {
    const n = document.getElementById('new-bnk'), c = document.getElementById('bnk-color');
    if (n.value) { state.banks.push({ name: n.value, color: c.value }); n.value = ''; saveState(); }
};

function formatBRL(v) { return `R$ ${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`; }

// --- BOOT ---
loadState();
