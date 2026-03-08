/**
 * SENIOR ENGINE - BILLS PRO V11
 * Clean Modular Logic - 100% LocalStorage
 */

let state = {
    appName: "Bills Pro V11",
    members: ["Gabriel", "Gabi", "Papai", "Mãe"],
    banks: [
        { n: "Santander", c: "#ec1c24" }, { n: "Nubank", c: "#8a05be" }, { n: "Carrefour", c: "#0050ff" },
        { n: "Pernambucanas", c: "#0056b3" }, { n: "Riachuelo", c: "#000000" }, { n: "Cartão Mais", c: "#003366" }, { n: "Mercado Pago", c: "#009ee3" }
    ],
    bills: [],
    viewDate: new Date(),
    filter: "Gabriel",
    editingId: null
};

const DB_KEY = 'billspro_v11_stable';
const ui = (id) => document.getElementById(id);
const fmt = (v) => (parseFloat(v) || 0).toLocaleString('pt-br', { style: 'currency', currency: 'BRL' });

// --- RENDER ENGINE ---
function render() {
    const m = state.viewDate.getMonth(), y = state.viewDate.getFullYear();
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const label = `${months[m]} ${y}`;

    // Titles
    document.title = state.appName;
    if (ui('header-brand-name')) ui('header-brand-name').innerText = state.appName;
    if (ui('current-month-label')) ui('current-month-label').innerText = label;
    if (ui('cal-month-label')) ui('cal-month-label').innerText = label;

    // Data Filtering
    const monthBills = state.bills.filter(b => {
        const [by, bm] = b.date.split('-').map(Number);
        return (bm - 1) === m && by === y;
    });

    const pending = monthBills.filter(b => !b.paid);
    const paid = monthBills.filter(b => b.paid);

    // Hero Stats
    if (ui('dash-total')) ui('dash-total').innerText = fmt(pending.reduce((a, b) => a + (parseFloat(b.value) || 0), 0));
    if (ui('dash-paid')) ui('dash-paid').innerText = fmt(paid.reduce((a, b) => a + (parseFloat(b.value) || 0), 0));

    // Nav / Sidebar
    renderSidebar(pending);
    renderMobileGrid(pending);
    renderBillStacks(monthBills);
    renderCalendar(m, y);
}

function renderSidebar(pending) {
    const side = ui('side-folders'); if (!side) return;
    side.innerHTML = '';
    state.members.forEach(f => {
        const v = pending.filter(b => b.member === f).reduce((a, b) => a + (parseFloat(b.value) || 0), 0);
        const div = document.createElement('div');
        div.className = `nav-item ${state.filter === f ? 'active' : ''}`;
        div.innerHTML = `<span>${f}</span><span>${fmt(v)}</span>`;
        div.onclick = () => { state.filter = f; render(); };
        side.appendChild(div);
    });
}

function renderMobileGrid(pending) {
    const grid = ui('mobile-folder-grid'); if (!grid) return;
    grid.innerHTML = '';
    state.members.forEach(m => {
        const v = pending.filter(b => b.member === m).reduce((a, b) => a + (parseFloat(b.value) || 0), 0);
        grid.innerHTML += `
            <div class="folder-card anim">
                <p class="f-name" style="color:var(--text-dim); font-size:0.7rem; font-weight:900">${m}</p>
                <p class="f-val" style="font-size:1.2rem; font-weight:950">${fmt(v)}</p>
            </div>
        `;
    });
}

function renderBillStacks(all) {
    const list = ui('bill-list-pending'), hist = ui('bill-list-paid');
    if (!list || !hist) return;
    list.innerHTML = ''; hist.innerHTML = '';

    const filtered = all.filter(b => state.filter === "Tudo" || b.member === state.filter);
    const p = filtered.filter(x => !x.paid), k = filtered.filter(x => x.paid);

    if (ui('count-paid')) ui('count-paid').innerText = k.length;

    p.forEach(b => list.appendChild(createBillCard(b)));
    k.forEach(b => hist.appendChild(createBillCard(b)));
}

function createBillCard(b) {
    const color = state.banks.find(x => x.n === b.bank)?.c || '#666';
    const card = document.createElement('div');
    card.className = `bill-card ${b.paid ? 'paid-item' : ''}`;
    card.style.borderLeftColor = color; // Dynamic border color
    const [, , d] = b.date.split('-').map(Number);
    card.innerHTML = `
        <div class="b-top"><span class="b-badge" style="background:${color}">${b.bank}</span><span class="b-val">${fmt(b.value)}</span></div>
        <span class="b-title">${b.title}</span>
        <div class="b-bot">
            <span class="b-meta">${b.member} • Dia ${d}</span>
            <div class="b-actions">
                ${!b.paid ? `<button class="act-btn btn-pay" onclick="payBill(${b.id})">✓</button>` : ''}
                <button class="act-btn" style="color:var(--accent)" onclick="openBillModal(${b.id})">✎</button>
                <button class="act-btn" style="color:var(--danger); opacity:0.5" onclick="delBill(${b.id})">×</button>
            </div>
        </div>
    `;
    return card;
}

function renderCalendar(m, y) {
    const grid = ui('cal-grid'); if (!grid) return;
    grid.innerHTML = '';["D", "S", "T", "Q", "Q", "S", "S"].forEach(w => grid.innerHTML += `<div style="text-align:center; font-size:0.7rem; font-weight:950; color:var(--text-dim); padding-bottom:8px">${w}</div>`);
    const first = new Date(y, m, 1).getDay(), last = new Date(y, m + 1, 0).getDate(), now = new Date();
    for (let i = 0; i < first; i++) grid.innerHTML += '<div></div>';
    for (let d = 1; d <= last; d++) {
        const day = document.createElement('div');
        day.className = 'cal-d'; day.innerText = d;

        // Find unpaid bills for this specific day
        const dayBills = state.bills.filter(b => {
            const [by, bm, bd] = b.date.split('-').map(Number);
            return !b.paid && bd === d && (bm - 1) === m && by === y;
        });

        if (dayBills.length > 0) {
            // Get color from the first bank of that day
            const bankColor = state.banks.find(x => x.n === dayBills[0].bank)?.c || 'var(--accent)';
            day.innerHTML += `<div class="cal-dot" style="background:${bankColor}"></div>`;
        }

        if (d === now.getDate() && m === now.getMonth() && y === now.getFullYear()) day.classList.add('today');
        grid.appendChild(day);
    }
}

// --- STATE ACTIONS ---
function save() { localStorage.setItem(DB_KEY, JSON.stringify({ bills: state.bills, appName: state.appName, members: state.members, banks: state.banks })); render(); }
function load() {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
        const d = JSON.parse(raw);
        state.bills = d.bills || []; state.appName = d.appName || "Bills Pro V11";
        state.members = d.members || state.members; state.banks = d.banks || state.banks;
    }
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    render();
}

// --- LOGIC ---
function payBill(id) { const b = state.bills.find(x => x.id === id); if (b) { b.paid = true; save(); } }
function delBill(id) { if (confirm('Excluir?')) { state.bills = state.bills.filter(x => x.id !== id); save(); } }
function navMonth(v) { state.viewDate.setMonth(state.viewDate.getMonth() + v); render(); }

ui('bill-form').onsubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(ui('in-value').value);

    // Safety Validation
    if (isNaN(val) || val <= 0) {
        alert('Por favor, insira um valor numérico positivo.');
        return;
    }

    const data = {
        id: state.editingId || Date.now(),
        title: ui('in-title').value.trim(),
        value: val.toFixed(2),
        date: ui('in-date').value,
        member: ui('in-member').value,
        bank: ui('in-bank').value,
        paid: false
    };

    if (state.editingId) {
        const idx = state.bills.findIndex(x => x.id === state.editingId);
        data.paid = state.bills[idx].paid; state.bills[idx] = data;
    } else state.bills.push(data);

    state.editingId = null; closeModals(); save();
};

// --- MODALS ---
function openBillModal(id = null) {
    state.editingId = id; ui('bill-form').reset();
    ui('in-member').innerHTML = state.members.map(m => `<option value="${m}">${m}</option>`).join('');
    ui('in-bank').innerHTML = state.banks.map(b => `<option value="${b.n}">${b.n}</option>`).join('');
    if (id) {
        const b = state.bills.find(x => x.id === id); if (b) {
            ui('modal-bill-title').innerText = "Editar Conta";
            ui('in-title').value = b.title; ui('in-value').value = b.value; ui('in-date').value = b.date;
            ui('in-member').value = b.member; ui('in-bank').value = b.bank;
        }
    } else ui('modal-bill-title').innerText = "Nova Conta";
    ui('modal-bill').style.display = 'flex';
}

function openSettings() {
    ui('cfg-app-name').value = state.appName;
    renderCfgLists();
    ui('modal-settings').style.display = 'flex';
}

function renderCfgLists() {
    ui('cfg-list-members').innerHTML = state.members.map(m => `<div style="display:flex; justify-content:space-between; margin-bottom:5px"><span>${m}</span><button onclick="remCfg('m', '${m}')" style="color:var(--danger)">×</button></div>`).join('');
    ui('cfg-list-banks').innerHTML = state.banks.map(b => `<div style="display:flex; justify-content:space-between; margin-bottom:5px"><span>${b.n}</span><button onclick="remCfg('b', '${b.n}')" style="color:var(--danger)">×</button></div>`).join('');
}

function addItemConfig(t) {
    const v = prompt('Nome:'); if (!v) return;
    if (t === 'm') state.members.push(v); else state.banks.push({ n: v, c: '#' + Math.floor(Math.random() * 16777215).toString(16) });
    renderCfgLists();
}

function remCfg(t, n) {
    if (t === 'm') state.members = state.members.filter(x => x !== n); else state.banks = state.banks.filter(x => x.n !== n);
    renderCfgLists();
}

function saveSettings() {
    state.appName = ui('cfg-app-name').value.trim() || state.appName;
    save(); closeModals();
}

function closeModals() { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }
function toggleTheme() {
    const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t); localStorage.setItem('theme', t);
}
function exportData() {
    const b = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const u = URL.createObjectURL(b); const a = document.createElement('a');
    a.href = u; a.download = `backup_${state.appName.toLowerCase().replace(/\s/g, '_')}.json`; a.click();
}
function triggerImport() { ui('import-input').click(); }
function handleImport(e) {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = (ev) => { try { state = { ...state, ...JSON.parse(ev.target.result) }; save(); alert('Sucesso!'); } catch (e) { alert('Erro!'); } };
    r.readAsText(f);
}

window.onclick = (e) => { if (e.target.classList.contains('modal')) closeModals(); };
window.onresize = render;
document.addEventListener('DOMContentLoaded', load);
