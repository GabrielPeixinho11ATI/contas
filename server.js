const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuração do Banco de Dados
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Altere se o seu usuário for diferente
    password: '',     // Digite sua senha aqui
    database: 'organizador_contas'
});

db.connect(err => {
    if (err) {
        console.error('Erro ao conectar ao MySQL:', err);
        return;
    }
    console.log('Conectado ao MySQL com sucesso!');
});

// --- ROTAS DE MEMBROS (PASTAS) ---

// Listar todos os membros
app.get('/membros', (req, res) => {
    db.query('SELECT * FROM membros', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// Criar novo membro
app.post('/membros', (req, res) => {
    const { nome } = req.body;
    db.query('INSERT INTO membros (nome) VALUES (?)', [nome], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ id: result.insertId, nome });
    });
});

// Deletar membro
app.delete('/membros/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM membros WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ message: 'Membro removido' });
    });
});

// --- ROTAS DE CONTAS ---

// Listar todas as contas (com o nome do membro)
app.get('/contas', (req, res) => {
    const query = `
        SELECT c.*, m.nome as categoria 
        FROM contas c 
        JOIN membros m ON c.membro_id = m.id
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// Adicionar nova conta
app.post('/contas', (req, res) => {
    const { nome_conta, valor, data_vencimento, membro_id } = req.body;
    const query = 'INSERT INTO contas (nome_conta, valor, data_vencimento, membro_id) VALUES (?, ?, ?, ?)';
    db.query(query, [nome_conta, valor, data_vencimento, membro_id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ id: result.insertId, message: 'Conta criada com sucesso!' });
    });
});

// Atualizar status (Pagar)
app.patch('/contas/:id/pagar', (req, res) => {
    const { id } = req.params;
    db.query("UPDATE contas SET status = 'pago' WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ message: 'Conta marcada como paga' });
    });
});

// Iniciar servidor em todos os IPs da rede
app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`Para acessar pelo celular use: http://[SEU-IP-V4]:${port}`);
});
