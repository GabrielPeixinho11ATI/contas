/**
 * FINANÇAS FAMILIAR PRO V7 - ENGINE DEFINITIVO
 * 100% LocalStorage | Zero Backend | Vercel Ready
 */

// --- ESTADO GLOBAL ---
let state = {
    theme: 'light',
    membros: ["Gabriel", "Família"],
    bancos: [
        { nome: "Nubank", cor: "#8a05be" },
        { nome: "Itaú", cor: "#ec7000" },
        { nome: "Dinheiro", cor: "#10B981" }
    ],
    contas: [],
    viewData: new Date(), // Data de navegação (mês/ano)
    filtros: {
        membro: 'Tudo',
        dia: null
    }
};

// --- PERSISTÊNCIA (LocalStorage) ---
function carregarLocal() {
    const salvo = localStorage.getItem('financas_pro_v7');
    if (salvo) {
        const parsed = JSON.parse(salvo);
        state = { ...state, ...parsed };
        state.viewData = new Date(state.viewData); // Restaurar objeto Date
    }
    aplicarTema();
    renderizar();
}

function salvarLocal() {
    localStorage.setItem('financas_pro_v7', JSON.stringify(state));
    renderizar();
}

function aplicarTema() {
    document.documentElement.setAttribute('data-theme', state.theme);
}

// --- SISTEMA DE BACKUP ---
function exportarBackup() {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_financas_${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
}

function importarBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (data.contas && data.membros) {
                state = { ...state, ...data };
                state.viewData = new Date(); // Resetar para hoje para ver os dados
                salvarLocal();
                alert('Backup restaurado com sucesso! 🚀');
            } else {
                throw new Error();
            }
        } catch (err) {
            alert('Erro ao importar. O arquivo selecionado não é um backup válido.');
        }
    };
    reader.readAsText(file);
}

// --- ENGINE DE RENDERIZAÇÃO ---
const ui = {
    totalPending: document.getElementById('total-pending-big'),
    totalPaid: document.getElementById('total-paid'),
    monthLabel: document.getElementById('label-month'),
    yearLabel: document.getElementById('label-year'),
    pendingList: document.getElementById('list-pending'),
    paidList: document.getElementById('list-paid'),
    paidCount: document.getElementById('paid-total-count'),
    pills: document.getElementById('member-filters'),
    calTitle: document.getElementById('cal-title'),
    calGrid: document.getElementById('calendar-grid')
};

function renderizar() {
    const m = state.viewData.getMonth();
    const y = state.viewData.getFullYear();
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    ui.monthLabel.innerText = meses[m];
    ui.yearLabel.innerText = y;
    document.querySelectorAll('.month-name-small').forEach(el => el.innerText = meses[m]);

    // Filtragem por Mês
    const contasMes = state.contas.filter(c => {
        const d = new Date(c.data);
        return d.getMonth() === m && d.getFullYear() === y;
    });

    // Totais do Dashboard
    const somaPendente = contasMes.filter(c => !c.paga).reduce((acc, c) => acc + parseFloat(c.valor), 0);
    const somaPaga = contasMes.filter(c => c.paga).reduce((acc, c) => acc + parseFloat(c.valor), 0);

    ui.totalPending.innerText = formatarBRL(somaPendente);
    ui.totalPaid.innerText = formatarBRL(somaPaga);

    renderPills();
    renderListas(contasMes);
    renderCalendario();
    syncForms();
}

function renderPills() {
    ui.pills.innerHTML = '';
    ['Tudo', ...state.membros].forEach(mem => {
        const btn = document.createElement('button');
        btn.className = `pill ${state.filtros.membro === mem ? 'active' : ''}`;
        btn.innerText = mem;
        btn.onclick = () => { state.filtros.membro = mem; state.filtros.dia = null; salvarLocal(); };
        ui.pills.appendChild(btn);
    });
}

function renderListas(contasMes) {
    ui.pendingList.innerHTML = '';
    ui.paidList.innerHTML = '';

    const filtradas = contasMes.filter(c => {
        const matchM = state.filtros.membro === 'Tudo' || c.membro === state.filtros.membro;
        const matchD = !state.filtros.dia || new Date(c.data).getUTCDate() === state.filtros.dia;
        return matchM && matchD;
    });

    let contPago = 0;
    filtradas.forEach(c => {
        const bancoObj = state.bancos.find(b => b.nome === c.banco) || { cor: '#ccc' };
        const card = document.createElement('div');
        card.className = `bill-card ${c.paga ? 'paid-faded' : ''}`;
        card.innerHTML = `
            <div class="b-card-info">
                <div class="b-badges">
                    <span class="badge" style="background:${bancoObj.cor}">${c.banco}</span>
                    <span class="badge badge-m">${c.membro}</span>
                </div>
                <span class="b-title">${c.titulo}</span>
                <span class="b-date">Vence dia ${new Date(c.data).getUTCDate()}</span>
            </div>
            <div class="b-card-actions">
                <span class="b-value">${formatarBRL(c.valor)}</span>
                ${!c.paga ? `<button class="btn-check" onclick="togglePago(${c.id})">✓</button>` : '✅'}
                <button onclick="excluirConta(${c.id})" style="margin-left:8px; border:none; background:none; opacity:0.1; color:red; font-size:10px;">EXCLUIR</button>
            </div>
        `;

        if (c.paga) {
            ui.paidList.appendChild(card);
            contPago++;
        } else {
            ui.pendingList.appendChild(card);
        }
    });

    ui.paidCount.innerText = contPago;
    if (ui.pendingList.innerHTML === '') ui.pendingList.innerHTML = '<p style="text-align:center; opacity:0.3; padding:20px;">Tudo limpo por aqui! ✨</p>';
}

function renderCalendario() {
    ui.calGrid.innerHTML = '';
    const y = state.viewData.getFullYear();
    const m = state.viewData.getMonth();
    ui.calTitle.innerText = `${ui.monthLabel.innerText} ${y}`;

    const primeiroDia = new Date(y, m, 1).getDay();
    const ultimoDia = new Date(y, m + 1, 0).getDate();

    // Espaços vazios iniciais
    for (let i = 0; i < primeiroDia; i++) ui.calGrid.appendChild(document.createElement('div'));

    for (let d = 1; d <= ultimoDia; d++) {
        const dDiv = document.createElement('div');
        dDiv.className = `cal-day ${state.filtros.dia === d ? 'selected' : ''}`;
        dDiv.innerText = d;

        // Marcadores Coloridos
        const contasDia = state.contas.filter(c => {
            const date = new Date(c.data);
            return date.getUTCDate() === d && date.getUTCMonth() === m && date.getUTCFullYear() === y && !c.paga;
        });

        if (contasDia.length > 0) {
            const dots = document.createElement('div');
            dots.className = 'day-dots';
            contasDia.slice(0, 3).forEach(c => {
                const bO = state.bancos.find(b => b.nome === c.banco) || { cor: '#ccc' };
                const dot = document.createElement('div');
                dot.className = 'dot';
                dot.style.background = bO.cor;
                dots.appendChild(dot);
            });
            dDiv.appendChild(dots);
        }

        if (d === new Date().getDate() && m === new Date().getMonth()) dDiv.classList.add('today');

        dDiv.onclick = () => {
            state.filtros.dia = (state.filtros.dia === d) ? null : d;
            fecharModais();
            salvarLocal();
        };
        ui.calGrid.appendChild(dDiv);
    }
}

// --- COMANDOS ---
function togglePago(id) {
    const idx = state.contas.findIndex(c => c.id === id);
    if (idx !== -1) { state.contas[idx].paga = !state.contas[idx].paga; salvarLocal(); }
}

function excluirConta(id) {
    if (confirm('Excluir esta conta permanentemente?')) {
        state.contas = state.contas.filter(c => c.id !== id);
        salvarLocal();
    }
}

function alternarTema() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    aplicarTema();
    salvarLocal();
}

// --- INTERAÇÕES ---
document.getElementById('prev-month').onclick = () => { state.viewData.setMonth(state.viewData.getMonth() - 1); state.filtros.dia = null; salvarLocal(); };
document.getElementById('next-month').onclick = () => { state.viewData.setMonth(state.viewData.getMonth() + 1); state.filtros.dia = null; salvarLocal(); };
document.getElementById('theme-switch').onclick = alternarTema;
document.getElementById('open-calendar').onclick = () => document.getElementById('modal-calendar').style.display = 'flex';
document.getElementById('open-settings').onclick = () => document.getElementById('modal-settings').style.display = 'flex';
document.getElementById('add-bill-btn').onclick = () => document.getElementById('modal-form').style.display = 'flex';
document.querySelectorAll('.close-modal').forEach(b => b.onclick = fecharModais);

function fecharModais() { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); }

// Backup
document.getElementById('export-backup').onclick = exportarBackup;
document.getElementById('trigger-import').onclick = () => document.getElementById('import-file').click();
document.getElementById('import-file').onchange = importarBackup;

// Formulário de Nova Conta
document.getElementById('bill-form').onsubmit = (e) => {
    e.preventDefault();
    state.contas.push({
        id: Date.now(),
        titulo: document.getElementById('bill-title').value,
        valor: document.getElementById('bill-value').value,
        data: document.getElementById('bill-date').value,
        membro: document.getElementById('bill-member').value,
        banco: document.getElementById('bill-bank').value,
        paga: false
    });
    e.target.reset();
    fecharModais();
    salvarLocal();
};

// --- CONFIGURAÇÕES & TAGS ---
function syncForms() {
    const mS = document.getElementById('bill-member');
    const bS = document.getElementById('bill-bank');
    mS.innerHTML = ''; bS.innerHTML = '';
    state.membros.forEach(m => mS.innerHTML += `<option value="${m}">${m}</option>`);
    state.bancos.forEach(b => bS.innerHTML += `<option value="${b.nome}">${b.nome}</option>`);

    renderTagsSettings();
}

function renderTagsSettings() {
    const listM = document.getElementById('settings-members');
    const listB = document.getElementById('settings-banks');
    listM.innerHTML = ''; listB.innerHTML = '';

    state.membros.forEach(m => {
        const div = document.createElement('div');
        div.className = 't-pill';
        div.innerHTML = `<span>${m}</span> <button class="del-btn" onclick="removerTag('${m}', 'm')">×</button>`;
        listM.appendChild(div);
    });

    state.bancos.forEach(b => {
        const div = document.createElement('div');
        div.className = 't-pill';
        div.innerHTML = `<span style="color:${b.cor}">●</span> <span>${b.nome}</span> <button class="del-btn" onclick="removerTag('${b.nome}', 'b')">×</button>`;
        listB.appendChild(div);
    });
}

function removerTag(nome, tipo) {
    if (confirm(`Remover ${nome}?`)) {
        if (tipo === 'm') state.membros = state.membros.filter(x => x !== nome);
        else state.bancos = state.bancos.filter(x => x.nome !== nome);
        salvarLocal();
    }
}

document.getElementById('btn-add-member').onclick = () => {
    const inp = document.getElementById('new-member');
    if (inp.value) { state.membros.push(inp.value); inp.value = ''; salvarLocal(); }
};

document.getElementById('btn-add-bank').onclick = () => {
    const n = document.getElementById('new-bank');
    const c = document.getElementById('bank-color');
    if (n.value) { state.bancos.push({ nome: n.value, cor: c.value }); n.value = ''; salvarLocal(); }
};

// --- AUXILIARES ---
function formatarBRL(v) {
    return `R$ ${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

// --- BOOTSTRAP ---
carregarLocal();
