-- Corrigir vinculação entre settlements e splits
-- Vincular cada settlement ao seu split correspondente

-- 1. Airfryer
UPDATE transaction_splits 
SET is_settled = true, 
    settled_at = NOW(), 
    settled_transaction_id = 'fd32a386-5f99-42e9-8c79-8ef43c4fdfa4'
WHERE id = '921cc7d6-129b-4e65-b995-a4e475e4c4cb';

-- 2. Orlando - VOO
UPDATE transaction_splits 
SET is_settled = true, 
    settled_at = NOW(), 
    settled_transaction_id = '12bb7dd8-f6c1-460e-bac5-ad807927af38'
WHERE id = '0d369054-7106-4db4-9a3e-80322913b7a4';

-- 3. Faculdade - Fran
UPDATE transaction_splits 
SET is_settled = true, 
    settled_at = NOW(), 
    settled_transaction_id = 'f97c1fdf-25ad-4505-bf98-c04cf98589b9'
WHERE id = '401fa4e5-6b43-440c-9f31-a8bc10c12734';

-- 4. Geladeira
UPDATE transaction_splits 
SET is_settled = true, 
    settled_at = NOW(), 
    settled_transaction_id = '0895c6b8-5d06-43cc-a1a1-d5df00d83e5a'
WHERE id = '2a366180-1f2d-4254-9022-b998e9aaad61';

-- 5. Seguro - Carro
UPDATE transaction_splits 
SET is_settled = true, 
    settled_at = NOW(), 
    settled_transaction_id = '9ca7f581-9e7e-4a7e-a788-a810ee9c8626'
WHERE id = '6aac0911-e0c2-42f3-a6f1-16a930d02ddf';

-- 6. Carro - AR
UPDATE transaction_splits 
SET is_settled = true, 
    settled_at = NOW(), 
    settled_transaction_id = '2f8bd7e4-6a88-4856-9a2d-12e1fe69939d'
WHERE id = '635df69e-268d-4a98-acce-f8d08ca5a2d2';

-- 7. Mercado Livre
UPDATE transaction_splits 
SET is_settled = true, 
    settled_at = NOW(), 
    settled_transaction_id = '7a46befc-886b-4e1a-9881-86c0cb7a6c0b'
WHERE id = '895d3c12-2a6a-4978-84d5-0c08e71d140c';

-- 8. Natação - Yasmin
UPDATE transaction_splits 
SET is_settled = true, 
    settled_at = NOW(), 
    settled_transaction_id = '59e28676-d196-49bf-99ba-82f268f1763c'
WHERE id = '291f68cc-11fd-4e9b-90b7-40985ae9038c';

-- 9. João Pessoa
UPDATE transaction_splits 
SET is_settled = true, 
    settled_at = NOW(), 
    settled_transaction_id = '0739f478-bbb0-4ca5-8fae-0621a46c5bdd'
WHERE id = 'c9323d7b-2276-4ff8-a84b-ce8c5a62e6cb';

-- 10. Carro - Orlando
UPDATE transaction_splits 
SET is_settled = true, 
    settled_at = NOW(), 
    settled_transaction_id = '70c4fa50-40f0-4090-837c-e8b589a28c5e'
WHERE id = '587d9b6f-51f0-4541-9375-13b06532bea6';

-- 11. Cartão
UPDATE transaction_splits 
SET is_settled = true, 
    settled_at = NOW(), 
    settled_transaction_id = 'b02f6518-a2ae-49d4-94fa-13414879887a'
WHERE id = '55d0b744-56de-4b94-bbf3-769c2912787d';;
