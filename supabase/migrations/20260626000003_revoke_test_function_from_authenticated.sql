-- test_cascade_delete() is a dev/test function that should never be
-- callable by authenticated users in production via the REST API.
REVOKE EXECUTE ON FUNCTION public.test_cascade_delete() FROM authenticated;
