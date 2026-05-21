-- Recriar trigger com INSERT OR UPDATE OR DELETE
DROP TRIGGER IF EXISTS trg_transaction_mirroring ON transactions;

CREATE TRIGGER trg_transaction_mirroring
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION handle_transaction_mirroring();;
