CREATE OR REPLACE FUNCTION public.trg_transaction_splits_settlement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.settled_by_creditor = true AND NEW.settled_by_debtor = true THEN
        NEW.is_settled := true;
        IF NEW.settled_at IS NULL THEN
            NEW.settled_at := NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transaction_splits_settlement_trigger ON public.transaction_splits;

CREATE TRIGGER transaction_splits_settlement_trigger
BEFORE UPDATE ON public.transaction_splits
FOR EACH ROW
EXECUTE FUNCTION public.trg_transaction_splits_settlement();
