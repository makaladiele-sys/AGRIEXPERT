-- ============================================
-- AgriExperts — Configuration Supabase Storage
-- Buckets pour les documents d'inscription expert
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- 1. Création des buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('photos-profil', 'photos-profil', false, 5242880, array['image/jpeg','image/png','image/webp']),
  ('cv', 'cv', false, 10485760, array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('pieces-identite', 'pieces-identite', false, 10485760, array['image/jpeg','image/png','application/pdf']),
  ('diplomes', 'diplomes', false, 10485760, array['image/jpeg','image/png','application/pdf']),
  ('certifications', 'certifications', false, 10485760, array['image/jpeg','image/png','application/pdf']),
  ('attestations', 'attestations', false, 10485760, array['image/jpeg','image/png','application/pdf']),
  ('lettres-motivation', 'lettres-motivation', false, 10485760, array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

-- 2. Politique : tout le monde peut UPLOADER (inscription publique, sans compte)
-- Chaque fichier est déposé sous un dossier temporaire nommé par un token unique
-- généré côté client (ex: crypto.randomUUID()) pour éviter les collisions.
drop policy if exists "Upload public inscription" on storage.objects;
create policy "Upload public inscription"
on storage.objects for insert
to anon
with check (
  bucket_id in ('photos-profil','cv','pieces-identite','diplomes','certifications','attestations','lettres-motivation')
);

-- 3. Table minimale des rôles utilisateurs.
-- Sera complétée à l'étape "Authentification réelle admin/recruteur"
-- (ajout de colonnes : organisation, statut, etc.). Elle existe déjà
-- ici uniquement pour que la politique de lecture ci-dessous fonctionne.
create table if not exists public.profils_utilisateurs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'expert' check (role in ('admin', 'recruteur', 'expert')),
  cree_le timestamptz not null default now()
);

alter table public.profils_utilisateurs enable row level security;

-- Un utilisateur authentifié peut lire sa propre ligne (nécessaire pour
-- que l'app sache quel rôle afficher après connexion).
drop policy if exists "Lecture de son propre profil" on public.profils_utilisateurs;
create policy "Lecture de son propre profil"
on public.profils_utilisateurs for select
to authenticated
using (user_id = auth.uid());

-- 4. Politique : seuls les admins authentifiés peuvent LIRE les documents
-- (les documents sont sensibles : CV, pièces d'identité)
drop policy if exists "Lecture admin uniquement" on storage.objects;
create policy "Lecture admin uniquement"
on storage.objects for select
to authenticated
using (
  bucket_id in ('photos-profil','cv','pieces-identite','diplomes','certifications','attestations','lettres-motivation')
  and exists (
    select 1 from public.profils_utilisateurs
    where user_id = auth.uid() and role = 'admin'
  )
);

-- Note : tant qu'aucune ligne n'existe dans profils_utilisateurs avec
-- role = 'admin', personne ne peut lire les documents — comportement
-- sûr par défaut (fail-closed). Le compte admin sera créé à l'étape
-- "Authentification réelle admin/recruteur".
