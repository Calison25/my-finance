-- Seed: Bancos brasileiros
INSERT INTO banks (name, code, logo_url, color, is_default) VALUES
    ('Nubank', '260', '/bank-logos/nubank.svg', '#820AD1', TRUE),
    ('Bradesco', '237', '/bank-logos/bradesco.svg', '#CC092F', TRUE),
    ('Itau', '341', '/bank-logos/itau.svg', '#003399', TRUE),
    ('Banco do Brasil', '001', '/bank-logos/banco-do-brasil.svg', '#003882', TRUE),
    ('Caixa Economica Federal', '104', '/bank-logos/caixa.svg', '#005CA9', TRUE),
    ('Santander', '033', '/bank-logos/santander.svg', '#EC0000', TRUE),
    ('Inter', '077', '/bank-logos/inter.svg', '#FF7A00', TRUE),
    ('C6 Bank', '336', '/bank-logos/c6-bank.svg', '#242424', TRUE),
    ('BTG Pactual', '208', '/bank-logos/btg-pactual.svg', '#001E3D', TRUE),
    ('Next', '237', '/bank-logos/next.svg', '#00E364', TRUE),
    ('PicPay', '380', '/bank-logos/picpay.svg', '#21C25E', TRUE),
    ('Sicoob', '756', '/bank-logos/sicoob.svg', '#003641', TRUE),
    ('Sicredi', '748', '/bank-logos/sicredi.svg', '#00A651', TRUE),
    ('Mercado Pago', '323', '/bank-logos/mercado-pago.svg', '#009EE3', TRUE),
    ('PagBank', '290', '/bank-logos/pagbank.svg', '#FFC700', TRUE);

-- Seed: Categorias pre-definidas
INSERT INTO categories (name, icon, color, is_default) VALUES
    ('Alimentacao', '🍽️', '#FF6B6B', TRUE),
    ('Transporte', '🚗', '#4ECDC4', TRUE),
    ('Moradia', '🏠', '#45B7D1', TRUE),
    ('Saude', '💊', '#96CEB4', TRUE),
    ('Educacao', '📚', '#FFEAA7', TRUE),
    ('Lazer', '🎮', '#DDA0DD', TRUE),
    ('Compras', '🛒', '#98D8C8', TRUE),
    ('Servicos', '⚙️', '#F7DC6F', TRUE),
    ('Salario', '💰', '#82E0AA', TRUE),
    ('Outros', '📌', '#AEB6BF', TRUE);
