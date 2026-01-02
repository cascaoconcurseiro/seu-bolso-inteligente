CREATE OR REPLACE FUNCTION sync_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.account_id IS NOT NULL THEN
      UPDATE accounts SET balance = calculate_account_balance(OLD.account_id), updated_at = NOW() WHERE id = OLD.account_id;
    END IF;
    IF OLD.destination_account_id IS NOT NULL THEN
      UPDATE accounts SET balance = calculate_account_balance(OLD.destination_account_id), updated_at = NOW() WHERE id = OLD.destination_account_id;
    END IF;
    RETURN OLD;
  ELSE
    IF NEW.account_id IS NOT NULL THEN
      UPDATE accounts SET balance = calculate_account_balance(NEW.account_id), updated_at = NOW() WHERE id = NEW.account_id;
    END IF;
    IF NEW.destination_account_id IS NOT NULL THEN
      UPDATE accounts SET balance = calculate_account_balance(NEW.destination_account_id), updated_at = NOW() WHERE id = NEW.destination_account_id;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.account_id IS DISTINCT FROM NEW.account_id AND OLD.account_id IS NOT NULL THEN
      UPDATE accounts SET balance = calculate_account_balance(OLD.account_id), updated_at = NOW() WHERE id = OLD.account_id;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.destination_account_id IS DISTINCT FROM NEW.destination_account_id AND OLD.destination_account_id IS NOT NULL THEN
      UPDATE accounts SET balance = calculate_account_balance(OLD.destination_account_id), updated_at = NOW() WHERE id = OLD.destination_account_id;
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;;
