# Organizador de Contas Familiar - Full Stack

Este projeto é um protótipo de alto nível para organização de finanças familiares, preparado para deploy na Vercel com banco de dados MySQL.

## 🚀 Como Rodar Localmente

1. **Banco de Dados**: 
   - Execute o script `init.sql` no seu MySQL local.
2. **Dependências**:
   ```bash
   npm install
   ```
3. **Servidor**:
   ```bash
   node api/index.js
   ```
4. **Frontend**:
   - Abra o `index.html` no navegador.
   - *Dica*: Se abrir como `file://`, ajuste o `LOCAL_IP` no `script.js`.

## ☁️ Deploy na Vercel

1. **Vercel Project**: Conecte o repositório.
2. **Variáveis de Ambiente**:
   - `DB_HOST`: Host do MySQL (ex: Aiven).
   - `DB_USER`: Usuário.
   - `DB_PASSWORD`: Senha.
   - `DB_NAME`: nome do banco.
3. **Pronto**: A Vercel usará o `vercel.json` para servir a API a partir de `api/index.js`.

## ✨ Funcionalidades Senior
- Sincronização automática em múltiplos dispositivos.
- Design responsivo com Glassmorphism.
- Filtros dinâmicos por membros da família.
- Persistence real com Pool de Conexões MySQL.
