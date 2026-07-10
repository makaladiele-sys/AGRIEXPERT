-- ============================================
-- AgriExperts — Authentification réelle
-- Politique d'auto-inscription (recruteurs)
-- À exécuter après supabase-schema.sql
-- ============================================

-- Un utilisateur fraîchement inscrit (via Supabase Auth) doit pouvoir
-- créer sa propre ligne dans profils_utilisateurs, mais UNIQUEMENT
-- avec le rôle "recruteur" ou "expert" — jamais "admin". Cela empêche
-- toute élévation de privilège par un recruteur malveillant.
drop policy if exists "Auto-inscription non-admin" on public.profils_utilisateurs;
create policy "Auto-inscription non-admin"
on public.profils_utilisateurs for insert
to authenticated
with check (
  user_id = auth.uid()
  and role in ('recruteur', 'expert')
);

-- ============================================
-- Création de ton compte administrateur
-- ============================================
-- 1. Va dans Supabase → Authentication → Users → "Add user"
--    Crée un utilisateur avec ton email et un mot de passe fort.
--    Coche "Auto Confirm User" pour éviter l'email de confirmation.
-- 2. Copie l'UUID de cet utilisateur (colonne "UID" dans la liste).
-- 3. Remplace TON_UUID_ICI ci-dessous par cet UUID et exécute cette ligne :

-- insert into public.profils_utilisateurs (user_id, role)
-- values ('TON_UUID_ICI', 'admin');
