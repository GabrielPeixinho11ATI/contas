/**
 * BILLS PRO V8 - PREMIUM SPA ENGINE
 * 100% Client-Side | LocalStorage | Zero Backend
 */

// --- STATE MANAGEMENT ---
let appState = {
    theme: 'dark',
    members: ["Gabriel", "Casa", "Família"],
    banks: [
        { name: "Nubank", color: "#8a05be" },
        { name: "Itaú", color: "#ec7000" },
        { name: "Cash", color: "#4CAF50" }
    ],
    bills: [],
    settings: {
        activeFilter: 'Tudo',
        activeDate: null, // Specific day filter
        viewPivot: new Date() // Month/Year focus
    }
};

// --- DATA ACCESS LAYER ---
function loadStore() {
    const raw = localStorage.getItem('bills_pro_v8_final');
    if (raw) {
        const parsed = JSON.parse(raw);
        appState = { ...appState, ...parsed };
        appState.settings.viewPivot = new Date(appState.settings.viewPivot);
    }
    applyTheme();
    syncUI();
}

function saveStore() {
    localStorage.setItem('bills_pro_v8_final', JSON.stringify(appState));
    syncUI();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', appState.theme);
    const sun = document.getElementById('sun');
    const moon = document.getElementById('moon');
    if (appState.theme === 'dark') {
        sun.style.display = 'block'; moon.style.display = 'none';
    } else {
        sun.style.display = 'none'; moon.style.display = 'block';
    }
}

// --- BACKUP ENGINE ---
function doExport() {
    const blob = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_bills_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function doImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (data.bills && data.members) {
                appState = { ...appState, ...data };
                appState.settings.viewPivot = new Date();
                saveStore();
                alert('Dados sincronizados com sucesso! 🚀');
            } else throw new Error();
        } catch (err) { alert('Arquivo de backup inválido.'); }
    };
    reader.readAsText(file);
}

// --- CORE RENDER ENGINE ---
const el = {
    pending: document.getElementById('pending-val'),
    paid: document.getElementById('paid-val'),
    month: document.getElementById('cur-month'),
    year: document.getElementById('cur-year'),
    pStack: document.getElementById('pending-stack'),
    hStack: document.getElementById('paid-stack'),
    hTotal: document.getElementById('paid-total'),
    filters: document.getElementById('filter-bar'),
    calGrid: document.getElementById('cal-grid'),
    calTitle: document.getElementById('cal-title')
};

function syncUI() {
    const pivot = appState.settings.viewPivot;
    const m = pivot.getMonth();
    const y = pivot.getFullYear();
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    el.month.innerText = months[m];
    el.year.innerText = y;

    // Filtered data for context
    const monthBills = appState.bills.filter(b => {
        const d = new Date(b.date);
        return d.getMonth() === m && d.getFullYear() === y;
    });

    // Totals
    const tp = monthBills.filter(b => !b.paid).reduce((acc, b) => acc + parseFloat(b.value), 0);
    const th = monthBills.filter(b => b.paid).reduce((acc, b) => acc + parseFloat(b.value), 0);

    el.pending.innerText = formatBRL(tp);
    el.paid.innerText = formatBRL(th);

    renderFilters();
    renderLists(monthBills);
    renderCalendar();
    syncSelectors();
    renderSettingsPills();
}

function renderFilters() {
    el.filters.innerHTML = '';
    ['Tudo', ...appState.members].forEach(m => {
        const btn = document.createElement('button');
        btn.className = `pill ${appState.settings.activeFilter === m ? 'active' : ''}`;
        btn.innerText = m;
        btn.onclick = () => { appState.settings.activeFilter = m; appState.settings.activeDate = null; saveStore(); };
        el.filters.appendChild(btn);
    });
}

function renderLists(monthBills) {
    el.pStack.innerHTML = '';
    el.hStack.innerHTML = '';

    const finalSet = monthBills.filter(b => {
        const mOk = appState.settings.activeFilter === 'Tudo' || b.member === appState.settings.activeFilter;
        const dOk = !appState.settings.activeDate || new Date(b.date).getUTCDate() === appState.settings.activeDate;
        return mOk && dOk;
    });

    let countH = 0;
    finalSet.forEach(b => {
        const bank = appState.banks.find(bk => bk.name === b.bank) || { color: '#666' };
        const card = document.createElement('div');
        card.className = `card-bill ${b.paid ? 'opacity-low' : ''}`;
        card.innerHTML = `
            <div class="bill-head">
                <div class="tag-row">
                    <span class="mini-tag" style="background:${bank.color}">${b.bank}</span>
                    <span class="mini-tag mem-tag">${b.member}</span>
                </div>
                <span class="bill-title">${b.title}</span>
                <span class="bill-meta-info">Vencimento dia ${new Date(b.date).getUTCDate()}</span>
            </div>
            <div class="bill-side">
                <span class="bill-cost">${formatBRL(b.value)}</span>
                ${!b.paid ? `<button class="check-btn" onclick="toggleBill(${b.id})">✓</button>` : '✅'}
                <button onclick="delBill(${b.id})" style="border:none; background:none; color:red; font-size:9px; margin-left:10px; opacity:0.2;">X</button>
            </div>
        `;

        if (b.paid) { el.hStack.appendChild(card); countH++; }
        else { el.pStack.appendChild(card); }
    });

    el.hTotal.innerText = countH;
    if (el.pStack.innerHTML === '') el.pStack.innerHTML = '<p style="text-align:center; padding:20px; opacity:0.3; font-size:0.8rem;">Status: Organizado ✨</p>';
}

function renderCalendar() {
    el.calGrid.innerHTML = '';
    const y = appState.settings.viewPivot.getFullYear();
    const m = appState.settings.viewPivot.getMonth();
    el.calTitle.innerText = `${el.month.innerText} ${y}`;

    const firstDay = new Date(y, m, 1).getDay();
    const lastDate = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) el.calGrid.appendChild(document.createElement('div'));

    for (let d = 1; d <= lastDate; d++) {
        const cell = document.createElement('div');
        cell.className = `day-cell ${appState.settings.activeDate === d ? 'active-sel' : ''}`;
        cell.innerText = d;

        const dayBills = appState.bills.filter(b => {
            const date = new Date(b.date);
            return date.getUTCDate() === d && date.getUTCMonth() === m && date.getUTCFullYear() === y && !b.paid;
        });

        if (dayBills.length > 0) {
            const markers = document.createElement('div');
            markers.className = 'cal-marker';
            dayBills.slice(0, 3).forEach(b => {
                const bnk = appState.banks.find(bk => bk.name === b.bank) || { color: '#666' };
                const dot = document.createElement('div');
                dot.className = 'marker-dot';
                dot.style.background = bnk.color;
                markers.appendChild(dot);
            });
            cell.appendChild(markers);
        }

        if (d === new Date().getDate() && m === new Date().getMonth() && y === new Date().getFullYear()) {
            cell.classList.add('today-is');
        }

        cell.onclick = () => {
            appState.settings.activeDate = (appState.settings.activeDate === d) ? null : d;
            closeModals();
            saveStore();
        };
        el.calGrid.appendChild(cell);
    }
}

// --- ACTIONS ---
function toggleBill(id) {
    const i = appState.bills.findIndex(b => b.id === id);
    if (i !== -1) { appState.bills[i].paid = !appState.bills[i].paid; saveStore(); }
}

function delBill(id) {
    if (confirm('Deletar permanentemente?')) {
        appState.bills = appState.bills.filter(b => b.id !== id);
        saveStore();
    }
}

function toggleTheme() {
    appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveStore();
}

// --- APP BINDINGS ---
document.getElementById('prev-m').onclick = () => { appState.settings.viewPivot.setMonth(appState.settings.viewPivot.getMonth() - 1); appState.settings.activeDate = null; saveStore(); };
document.getElementById('next-m').onclick = () => { appState.settings.viewPivot.setMonth(appState.settings.viewPivot.getMonth() + 1); appState.settings.activeDate = null; saveStore(); };
document.getElementById('theme-btn').onclick = toggleTheme;
document.getElementById('export-btn').onclick = doExport;
document.getElementById('import-trigger').onclick = () => document.getElementById('import-file').click();
document.getElementById('import-file').onchange = doImport;

document.getElementById('open-cal').onclick = () => document.getElementById('modal-cal').style.display = 'flex';
document.getElementById('open-settings').onclick = () => document.getElementById('modal-settings').style.display = 'flex';
document.getElementById('fab-add').onclick = () => document.getElementById('modal-bill').style.display = 'flex';

function closeModals() { document.querySelectorAll('.modal-root').forEach(m => m.style.display = 'none'); }
document.querySelectorAll('.btn-close').forEach(b => b.onclick = closeModals);

document.getElementById('form-bill').onsubmit = (e) => {
    e.preventDefault();
    appState.bills.push({
        id: Date.now(),
        title: document.getElementById('b-title').value,
        value: document.getElementById('b-value').value,
        date: document.getElementById('b-date').value,
        member: document.getElementById('b-member').value,
        bank: document.getElementById('b-bank').value,
        paid: false
    });
    e.target.reset();
    closeModals();
    saveStore();
};

// --- SETTINGS LOGIC ---
function syncSelectors() {
    const mS = document.getElementById('b-member');
    const bS = document.getElementById('b-bank');
    mS.innerHTML = ''; bS.innerHTML = '';
    appState.members.forEach(m => mS.innerHTML += `<option value="${m}">${m}</option>`);
    appState.banks.forEach(b => bS.innerHTML += `<option value="${b.name}">${b.name}</option>`);
}

function renderSettingsPills() {
    const mC = document.getElementById('set-members');
    const bC = document.getElementById('set-banks');
    mC.innerHTML = ''; bC.innerHTML = '';

    appState.members.forEach(m => {
        const div = document.createElement('div');
        div.className = 'rem-pill';
        div.innerHTML = `<span>${m}</span> <button class="btn-del-mini" onclick="remItem('${m}', 'm')">×</button>`;
        mC.appendChild(div);
    });

    appState.banks.forEach(b => {
        const div = document.createElement('div');
        div.className = 'rem-pill';
        div.innerHTML = `<span style="color:${b.color}">●</span> <span>${b.name}</span> <button class="btn-del-mini" onclick="remItem('${b.name}', 'b')">×</button>`;
        bC.appendChild(div);
    });
}

function remItem(name, type) {
    if (confirm(`Remover ${name}?`)) {
        if (type === 'm') appState.members = appState.members.filter(x => x !== name);
        else appState.banks = appState.banks.filter(x => x.name !== name);
        saveStore();
    }
}

document.getElementById('add-mem-btn').onclick = () => {
    const i = document.getElementById('new-mem');
    if (i.value) { appState.members.push(i.value); i.value = ''; saveStore(); }
};

document.getElementById('add-bnk-btn').onclick = () => {
    const n = document.getElementById('new-bnk');
    const c = document.getElementById('bnk-color');
    if (n.value) { appState.banks.push({ name: n.value, color: c.value }); n.value = ''; saveStore(); }
};

// --- HELPERS ---
function formatBRL(v) { return `R$ ${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`; }

// --- INIT ---
loadStore();
