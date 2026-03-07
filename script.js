// 1. CONFIGURAÇÃO DE AMBIENTE
// Se estiver rodando localmente (file://), define o IP do seu computador manualmente aqui.
// Se estiver na Vercel ou acessando via servidor, ele usa o hostname atual.
const LOCAL_IP = '192.168.1.15'; // <--- MUDE PARA O SEU IP PARA TESTAR NO CELULAR LOCALMENTE
const isLocalFile = window.location.protocol === 'file:';
const API_BASE = isLocalFile
    ? `http://${LOCAL_IP}:3000/api`
    : `${window.location.origin}/api`;

let accounts = [];
let categories = [];
let currentCategory = 'Tudo';

// Elementos do DOM
const billsList = document.getElementById('bills-list');
const totalAmountText = document.getElementById('total-amount');
const modalBill = document.getElementById('modal-overlay');
const modalFolder = document.getElementById('modal-folders');
const openModalBtn = document.getElementById('open-modal');
const openFolderModalBtn = document.getElementById('manage-folders');
const billForm = document.getElementById('bill-form');
const folderForm = document.getElementById('folder-form');
const folderPills = document.getElementById('folder-pills');
const categorySelect = document.getElementById('categoria_conta');
const folderListManager = document.getElementById('folder-list-manager');

// 2. SINCRONIZAÇÃO EM TEMPO REAL
async function atualizarDados() {
    try {
        const [resContas, resMembros] = await Promise.all([
            fetch(`${API_BASE}/contas`),
            fetch(`${API_BASE}/membros`)
        ]);

        if (!resContas.ok || !resMembros.ok) throw new Error('Falha na resposta do servidor');

        accounts = await resContas.json();
        categories = await resMembros.json();

        renderAll();
    } catch (error) {
        console.error('Erro de conexão:', error);
    }
}

// 3. RENDERIZAÇÃO
function renderAll() {
    renderPills();
    renderBills();
    updateSelectors();
    renderFolderManager();
}

function renderPills() {
    folderPills.innerHTML = '';

    // Pill "Tudo"
    const btnAll = document.createElement('button');
    btnAll.className = `pill ${currentCategory === 'Tudo' ? 'active' : ''}`;
    btnAll.innerText = 'Tudo';
    btnAll.onclick = () => { currentCategory = 'Tudo'; renderAll(); };
    folderPills.appendChild(btnAll);

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `pill ${currentCategory === cat.nome ? 'active' : ''}`;
        btn.innerText = cat.nome;
        btn.onclick = () => { currentCategory = cat.nome; renderAll(); };
        folderPills.appendChild(btn);
    });
}

function renderBills() {
    billsList.innerHTML = '';
    let totalPendente = 0;

    const filtered = currentCategory === 'Tudo'
        ? accounts
        : accounts.filter(acc => acc.categoria === currentCategory);

    filtered.forEach(bill => {
        if (bill.status === 'pendente') {
            totalPendente += parseFloat(bill.valor);
        }

        const card = document.createElement('div');
        card.className = `bill-card ${bill.status === 'pago' ? 'paid' : ''}`;
        card.innerHTML = `
            <div class="bill-info">
                <span class="category-tag">${bill.categoria}</span>
                <h4>${bill.nome_conta}</h4>
                <p>Vence em: ${formatDate(bill.data_vencimento)}</p>
                <p class="value">R$ ${parseFloat(bill.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div class="bill-action">
                ${bill.status === 'pendente'
                ? `<button class="btn-pay" onclick="markAsPaid(${bill.id})">Pagar</button>`
                : `<span class="btn-pay paid">✓ Pago</span>`
            }
            </div>
        `;
        billsList.appendChild(card);
    });

    totalAmountText.innerText = `R$ ${totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function updateSelectors() {
    categorySelect.innerHTML = '';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.innerText = cat.nome;
        categorySelect.appendChild(opt);
    });
}

function renderFolderManager() {
    folderListManager.innerHTML = '';
    categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'folder-item';
        item.innerHTML = `
            <span>${cat.nome}</span>
            <button class="btn-delete-folder" onclick="deleteFolder(${cat.id})">×</button>
        `;
        folderListManager.appendChild(item);
    });
}

// 4. AÇÕES (FETCH POST/PATCH)
async function markAsPaid(id) {
    try {
        await fetch(`${API_BASE}/contas/${id}/pagar`, { method: 'PATCH' });
        atualizarDados();
    } catch (e) { alert('Erro ao processar pagamento'); }
}

async function deleteFolder(id) {
    if (confirm('Deseja excluir esta pasta?')) {
        try {
            await fetch(`${API_BASE}/membros/${id}`, { method: 'DELETE' });
            atualizarDados();
        } catch (e) { alert('Erro ao excluir pasta'); }
    }
}

async function addBill(event) {
    event.preventDefault();
    const data = {
        nome_conta: document.getElementById('nome_conta').value,
        membro_id: document.getElementById('categoria_conta').value,
        valor: document.getElementById('valor').value,
        data_vencimento: document.getElementById('data_vencimento').value
    };

    try {
        const res = await fetch(`${API_BASE}/contas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error();
        billForm.reset();
        modalBill.style.display = 'none';
        atualizarDados();
    } catch (e) { alert('Erro ao adicionar conta. O servidor está rodando?'); }
}

async function addFolder(event) {
    event.preventDefault();
    const nomeInput = document.getElementById('new_folder_name');
    const nome = nomeInput.value.trim();
    if (!nome) return;

    try {
        const res = await fetch(`${API_BASE}/membros`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome })
        });
        if (!res.ok) throw new Error();
        nomeInput.value = '';
        atualizarDados();
    } catch (e) { alert('Erro ao criar pasta. Verifique a conexão.'); }
}

// 5. AUXILIARES E EVENTOS
function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
}

openModalBtn.onclick = () => modalBill.style.display = 'flex';
openFolderModalBtn.onclick = () => modalFolder.style.display = 'flex';
document.querySelectorAll('.close-btn').forEach(btn => btn.onclick = () => {
    modalBill.style.display = 'none';
    modalFolder.style.display = 'none';
});

billForm.onsubmit = addBill;
folderForm.onsubmit = addFolder;

// Iniciar app
atualizarDados();
setInterval(atualizarDados, 10000); // 10s para poupar servidor na nuvem
