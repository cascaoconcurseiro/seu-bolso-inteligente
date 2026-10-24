-- Keep authenticated clients from choosing arbitrary notification recipients.
-- Trusted database triggers and service_role continue to create system notices.
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
    'WELCOME', 'INVOICE_DUE', 'INVOICE_OVERDUE', 'BUDGET_WARNING', 'BUDGET_EXCEEDED',
    'SHARED_PENDING', 'SHARED_SETTLED', 'SHARED_EXPENSE', 'RECURRING_PENDING',
    'RECURRING_GENERATED', 'SAVINGS_GOAL', 'GOAL_MILESTONE', 'LOW_BALANCE',
    'CREDIT_LIMIT_WARNING', 'SUBSCRIPTION_REMINDER', 'WEEKLY_SUMMARY', 'TRIP_INVITE',
    'FAMILY_INVITE', 'SETTLEMENT_REQUEST', 'PAYMENT_CONFIRMED', 'SETTLEMENT_REJECTED',
    'SECURITY_ALERT', 'GENERAL', 'SYSTEM', 'INVITATION'
  ]::text[]));

DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
CREATE POLICY "Users can create own notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE INSERT ON public.notifications FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.create_notification_v2(p_notification jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_sender uuid := auth.uid();
  v_recipient uuid := nullif(p_notification ->> 'user_id', '')::uuid;
  v_type text := p_notification ->> 'type';
  v_related_id uuid := nullif(p_notification ->> 'related_id', '')::uuid;
  v_related_type text := nullif(p_notification ->> 'related_type', '');
  v_action_url text := p_notification ->> 'action_url';
  v_metadata jsonb := COALESCE(p_notification -> 'metadata', '{}'::jsonb);
  v_authorized boolean := false;
  v_id uuid;
BEGIN
  IF v_sender IS NULL OR v_recipient IS NULL THEN
    RAISE EXCEPTION 'Not authenticated or recipient missing' USING ERRCODE = '42501';
  END IF;

  IF nullif(btrim(p_notification ->> 'title'), '') IS NULL
     OR nullif(btrim(p_notification ->> 'message'), '') IS NULL
     OR v_type IS NULL THEN
    RAISE EXCEPTION 'Invalid notification payload' USING ERRCODE = '22023';
  END IF;

  IF v_recipient = v_sender THEN
    v_authorized := true;
  ELSIF v_type = 'TRIP_INVITE' AND v_related_type = 'trip' AND v_related_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.trip_invitations invitation
      WHERE invitation.trip_id = v_related_id::uuid
        AND invitation.inviter_id = v_sender
        AND invitation.invitee_id = v_recipient
        AND invitation.status = 'pending'
    ) INTO v_authorized;
  ELSIF v_type = 'INVITATION' AND v_related_type = 'shared_credit_card'
        AND v_related_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.shared_credit_cards shared_card
      JOIN public.accounts account ON account.id = shared_card.account_id
      WHERE shared_card.id = v_related_id::uuid
        AND shared_card.account_id = nullif(v_metadata ->> 'account_id', '')::uuid
        AND shared_card.user_id = v_recipient
        AND shared_card.status = 'PENDING'
        AND account.user_id = v_sender
    ) INTO v_authorized;
  ELSIF v_type IN ('SHARED_EXPENSE', 'SETTLEMENT_REJECTED')
        AND v_related_type = 'transaction' AND v_related_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.transactions transaction
      JOIN public.transaction_splits split ON split.transaction_id = transaction.id
      WHERE transaction.id = v_related_id::uuid
        AND (
          (transaction.user_id = v_sender AND split.user_id = v_recipient)
          OR (v_type = 'SETTLEMENT_REJECTED'
              AND transaction.user_id = v_recipient AND split.user_id = v_sender)
        )
    ) INTO v_authorized;
  ELSIF v_type = 'SHARED_EXPENSE' AND v_related_type = 'installment_series'
        AND v_related_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.transactions transaction
      JOIN public.transaction_splits split ON split.transaction_id = transaction.id
      WHERE transaction.series_id = v_related_id::uuid
        AND transaction.user_id = v_sender
        AND split.user_id = v_recipient
    ) INTO v_authorized;
  END IF;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Not authorized to notify this user' USING ERRCODE = '42501';
  END IF;

  IF v_recipient <> v_sender THEN
    v_action_url := CASE v_type
      WHEN 'TRIP_INVITE' THEN '/viagens'
      WHEN 'INVITATION' THEN '/cartoes'
      ELSE '/compartilhados'
    END;
  END IF;

  IF v_related_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.notifications notification
    WHERE notification.user_id = v_recipient
      AND notification.type = v_type
      AND notification.related_id = v_related_id
      AND notification.is_dismissed = false
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (
    user_id, type, title, message, icon, action_url, action_label,
    related_id, related_type, priority, expires_at, metadata
  ) VALUES (
    v_recipient,
    v_type,
    btrim(p_notification ->> 'title'),
    btrim(p_notification ->> 'message'),
    p_notification ->> 'icon',
    v_action_url,
    p_notification ->> 'action_label',
    v_related_id,
    v_related_type,
    COALESCE(p_notification ->> 'priority', 'NORMAL'),
    nullif(p_notification ->> 'expires_at', '')::timestamptz,
    v_metadata
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION private.create_notification_v2(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.create_notification_v2(jsonb) TO authenticated;

-- Keep the PostgREST entry point invoker-rights; privileged validation and
-- insertion stay in the non-exposed private schema.
CREATE OR REPLACE FUNCTION public.create_notification_v2(p_notification jsonb)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private.create_notification_v2(p_notification);
$function$;

REVOKE ALL ON FUNCTION public.create_notification_v2(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_notification_v2(jsonb) TO authenticated;
