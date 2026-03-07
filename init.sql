CREATE DATABASE IF NOT EXISTS organizador_contas;

USE organizador_contas;

-- Tabela de Membros (Pastas)
CREATE TABLE IF NOT EXISTS membros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
);

-- Tabela de Contas
CREATE TABLE IF NOT EXISTS contas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_conta VARCHAR(255) NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data_vencimento DATE NOT NULL,
    status ENUM('pago', 'pendente') DEFAULT 'pendente',
    membro_id INT,
    FOREIGN KEY (membro_id) REFERENCES membros (id) ON DELETE CASCADE
);

-- Inserir alguns membros iniciais
INSERT IGNORE INTO
    membros (nome)
VALUES ('Geral'),
    ('Casa'),
    ('Trabalho');