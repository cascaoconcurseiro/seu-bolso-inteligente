-- Create trigger for automatic sync of shared transactions after update
CREATE OR REPLACE TRIGGER sync_shared_transaction_trigger
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW
WHEN (NEW.is_shared = true AND NEW.source_transaction_id IS NULL)
EXECUTE FUNCTION public.handle_shared_transaction_sync();

-- Create trigger for sync when family member gets linked
CREATE OR REPLACE TRIGGER sync_pending_on_link_trigger
AFTER UPDATE ON public.family_members
FOR EACH ROW
WHEN (NEW.linked_user_id IS NOT NULL AND OLD.linked_user_id IS NULL)
EXECUTE FUNCTION public.sync_pending_transactions_on_link();

-- Create trigger to delete mirrors when original is deleted
CREATE OR REPLACE TRIGGER delete_mirror_trigger
BEFORE DELETE ON public.transactions
FOR EACH ROW
WHEN (OLD.source_transaction_id IS NULL AND OLD.is_shared = true)
EXECUTE FUNCTION public.delete_mirror_on_delete();

-- Create trigger for syncing installment series mirrors
CREATE OR REPLACE TRIGGER sync_installment_mirrors_trigger
AFTER INSERT ON public.transactions
FOR EACH ROW
WHEN (NEW.is_shared = true AND NEW.series_id IS NOT NULL AND NEW.is_installment = true)
EXECUTE FUNCTION public.sync_installment_mirrors();