const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Configuração do Banco de Dados via Variáveis de Ambiente
// Importante para Vercel e Segurança
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'organizador_contas',
    ssl: {
        rejectUnauthorized: false // Necessário para muitos bancos na nuvem (Aiven, PlanetScale)
    }
};

const pool = mysql.createPool(dbConfig);
const db = pool.promise();

// Teste de conexão no início
pool.getConnection()
    .then(conn => {
        console.log('✅ Conectado ao banco de dados com sucesso!');
        conn.release();
    })
    .catch(err => {
        console.error('❌ ERRO AO CONECTAR AO BANCO:', err.message);
    });

// --- ROTAS DE API (Prefixadas com /api para Vercel) ---

app.get('/api/membros', async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM membros');
        res.json(results);
    } catch (err) {
        console.error('Erro ao listar membros:', err.message);
        res.status(500).json({ error: "Erro ao buscar membros" });
    }
});

app.post('/api/membros', async (req, res) => {
    try {
        const { nome } = req.body;
        if (!nome) return res.status(400).json({ error: "Nome é obrigatório" });
        const [result] = await db.query('INSERT INTO membros (nome) VALUES (?)', [nome]);
        res.json({ id: result.insertId, nome });
    } catch (err) {
        console.error('Erro ao criar membro:', err.message);
        res.status(500).json({ error: "Erro ao criar pasta no banco de dados" });
    }
});

app.delete('/api/membros/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM membros WHERE id = ?', [id]);
        res.json({ success: true, message: 'Membro removido' });
    } catch (err) {
        console.error('Erro ao deletar membro:', err.message);
        res.status(500).json({ error: "Erro ao remover pasta" });
    }
});

app.get('/api/contas', async (req, res) => {
    try {
        const query = `
            SELECT c.*, m.nome as categoria 
            FROM contas c 
            JOIN membros m ON c.membro_id = m.id
        `;
        const [results] = await db.query(query);
        res.json(results);
    } catch (err) {
        console.error('Erro ao listar contas:', err.message);
        res.status(500).json({ error: "Erro ao buscar contas" });
    }
});

app.post('/api/contas', async (req, res) => {
    try {
        const { nome_conta, valor, data_vencimento, membro_id } = req.body;
        if (!nome_conta || !valor || !membro_id) return res.status(400).json({ error: "Dados incompletos" });

        const query = 'INSERT INTO contas (nome_conta, valor, data_vencimento, membro_id) VALUES (?, ?, ?, ?)';
        const [result] = await db.query(query, [nome_conta, valor, data_vencimento, membro_id]);
        res.json({ id: result.insertId, success: true });
    } catch (err) {
        console.error('Erro ao criar conta:', err.message);
        res.status(500).json({ error: "Erro ao salvar conta" });
    }
});

app.patch('/api/contas/:id/pagar', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("UPDATE contas SET status = 'pago' WHERE id = ?", [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao pagar conta:', err.message);
        res.status(500).json({ error: "Erro ao atualizar status" });
    }
});

// Exporta para ser usado pelo server.js local ou pela Vercel
module.exports = app;
