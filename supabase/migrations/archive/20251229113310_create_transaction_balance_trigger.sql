DROP TRIGGER IF EXISTS trigger_sync_account_balance ON transactions;

CREATE TRIGGER trigger_sync_account_balance
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION sync_account_balance();;
