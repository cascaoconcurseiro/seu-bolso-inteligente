-- Adicionar tipo de conta EMERGENCY_FUND (Reserva de Emergência)
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'EMERGENCY_FUND';

COMMENT ON TYPE public.account_type IS 'Tipos de conta: CHECKING (Corrente), SAVINGS (Poupança), CREDIT_CARD (Cartão de Crédito), INVESTMENT (Investimento), CASH (Dinheiro), EMERGENCY_FUND (Reserva de Emergência)';;
