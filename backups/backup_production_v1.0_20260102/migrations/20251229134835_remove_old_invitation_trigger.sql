-- Remover trigger antigo que usa campos que não existem mais
DROP TRIGGER IF EXISTS trg_invitation_accepted ON family_invitations;
DROP FUNCTION IF EXISTS handle_invitation_accepted();;
