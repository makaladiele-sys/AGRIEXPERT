-- ============================================
-- AgriExperts — Schéma principal
-- Tables : experts, recruteurs, missions,
-- shortlist_items, mises_en_relation, commissions,
-- taxonomies
-- À exécuter dans Supabase SQL Editor, APRÈS
-- supabase-storage-setup.sql
-- ============================================

-- ---------- Fonction utilitaire : mise à jour auto de updated_at ----------
create or replace function public.maj_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================
-- 1. EXPERTS
-- Sert à la fois de table d'inscription (statut
-- 'en_attente_validation') et de catalogue public
-- une fois validé (statut 'valide').
-- ============================================
create sequence if not exists experts_code_seq;

create table if not exists public.experts (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  user_id uuid references auth.users(id) on delete set null,
  dossier_id uuid,

  -- Identité
  nom text not null,
  prenom text not null,
  sexe text,
  date_naissance date,
  nationalite text,
  pays_residence text,
  region_ville text,
  telephone text,
  whatsapp text,
  email text not null,
  linkedin text,
  site_web text,

  -- Expertise
  domaine_principal text not null,
  domaines_secondaires jsonb not null default '[]',
  filieres jsonb not null default '[]',
  fonction text not null,
  niveau text not null,
  annees_experience int not null default 0,
  competences jsonb not null default '[]',
  langues jsonb not null default '[]',

  -- Disponibilité & conditions
  disponibilite text not null default 'Disponible',
  date_dispo date,
  tarif numeric,
  devise text default 'FCFA',
  mobilite text,
  contrat jsonb not null default '[]',
  pays_intervention jsonb not null default '[]',
  regions_intervention jsonb not null default '[]',

  -- Documents (chemins Supabase Storage, voir supabase-storage-setup.sql)
  documents jsonb not null default '{}',

  -- Statistiques & statut
  missions_realisees int not null default 0,
  statut text not null default 'en_attente_validation'
    check (statut in ('en_attente_validation', 'valide', 'rejete', 'suspendu')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_experts_updated_at
  before update on public.experts
  for each row execute function public.maj_updated_at();

create or replace function public.generer_code_expert()
returns trigger as $$
begin
  if new.code is null then
    new.code := 'EXP-' || lpad(nextval('experts_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_experts_code
  before insert on public.experts
  for each row execute function public.generer_code_expert();

alter table public.experts enable row level security;

-- Inscription publique : n'importe qui peut créer sa fiche (statut forcé à l'attente)
drop policy if exists "Inscription publique" on public.experts;
create policy "Inscription publique"
on public.experts for insert
to anon, authenticated
with check (statut = 'en_attente_validation');

-- Catalogue public : lecture des fiches validées uniquement
drop policy if exists "Lecture catalogue public" on public.experts;
create policy "Lecture catalogue public"
on public.experts for select
to anon, authenticated
using (statut = 'valide');

-- Un expert connecté peut lire et modifier sa propre fiche, quel que soit son statut
drop policy if exists "Expert lit sa fiche" on public.experts;
create policy "Expert lit sa fiche"
on public.experts for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Expert modifie sa fiche" on public.experts;
create policy "Expert modifie sa fiche"
on public.experts for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Un admin a tous les droits
drop policy if exists "Admin gere experts" on public.experts;
create policy "Admin gere experts"
on public.experts for all
to authenticated
using (exists (select 1 from public.profils_utilisateurs where user_id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profils_utilisateurs where user_id = auth.uid() and role = 'admin'));


-- ============================================
-- 2. RECRUTEURS
-- ============================================
create sequence if not exists recruteurs_code_seq;

create table if not exists public.recruteurs (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  user_id uuid references auth.users(id) on delete set null,
  organisation text not null,
  pays text,
  email text not null,
  telephone text,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'valide', 'suspendu')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_recruteurs_updated_at
  before update on public.recruteurs
  for each row execute function public.maj_updated_at();

create or replace function public.generer_code_recruteur()
returns trigger as $$
begin
  if new.code is null then
    new.code := 'REC-' || lpad(nextval('recruteurs_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_recruteurs_code
  before insert on public.recruteurs
  for each row execute function public.generer_code_recruteur();

alter table public.recruteurs enable row level security;

drop policy if exists "Inscription recruteur" on public.recruteurs;
create policy "Inscription recruteur"
on public.recruteurs for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Recruteur lit son profil" on public.recruteurs;
create policy "Recruteur lit son profil"
on public.recruteurs for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admin gere recruteurs" on public.recruteurs;
create policy "Admin gere recruteurs"
on public.recruteurs for all
to authenticated
using (exists (select 1 from public.profils_utilisateurs where user_id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profils_utilisateurs where user_id = auth.uid() and role = 'admin'));


-- ============================================
-- 3. MISSIONS
-- ============================================
create sequence if not exists missions_code_seq;

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  recruteur_id uuid not null references public.recruteurs(id) on delete cascade,
  titre text not null,
  description text,
  domaine text,
  filiere text,
  pays text,
  duree text,
  budget text,
  echeance date,
  competences jsonb not null default '[]',
  statut text not null default 'publiee' check (statut in ('publiee', 'pourvue', 'annulee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_missions_updated_at
  before update on public.missions
  for each row execute function public.maj_updated_at();

create or replace function public.generer_code_mission()
returns trigger as $$
begin
  if new.code is null then
    new.code := 'MIS-' || lpad(nextval('missions_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_missions_code
  before insert on public.missions
  for each row execute function public.generer_code_mission();

alter table public.missions enable row level security;

drop policy if exists "Recruteur gere ses missions" on public.missions;
create policy "Recruteur gere ses missions"
on public.missions for all
to authenticated
using (recruteur_id in (select id from public.recruteurs where user_id = auth.uid()))
with check (recruteur_id in (select id from public.recruteurs where user_id = auth.uid()));

drop policy if exists "Admin lit missions" on public.missions;
create policy "Admin lit missions"
on public.missions for select
to authenticated
using (exists (select 1 from public.profils_utilisateurs where user_id = auth.uid() and role = 'admin'));


-- ============================================
-- 4. SHORTLIST (experts présélectionnés par un recruteur)
-- ============================================
create table if not exists public.shortlist_items (
  id uuid primary key default gen_random_uuid(),
  recruteur_id uuid not null references public.recruteurs(id) on delete cascade,
  expert_id uuid not null references public.experts(id) on delete cascade,
  mission_id uuid references public.missions(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (recruteur_id, expert_id, mission_id)
);

alter table public.shortlist_items enable row level security;

drop policy if exists "Recruteur gere sa shortlist" on public.shortlist_items;
create policy "Recruteur gere sa shortlist"
on public.shortlist_items for all
to authenticated
using (recruteur_id in (select id from public.recruteurs where user_id = auth.uid()))
with check (recruteur_id in (select id from public.recruteurs where user_id = auth.uid()));


-- ============================================
-- 5. MISES EN RELATION
-- ============================================
create sequence if not exists mer_code_seq;

create table if not exists public.mises_en_relation (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  recruteur_id uuid not null references public.recruteurs(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  montant_contrat numeric,
  taux_commission numeric not null default 0.12,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'validee', 'refusee')),
  created_at timestamptz not null default now(),
  validated_at timestamptz
);

create or replace function public.generer_code_mer()
returns trigger as $$
begin
  if new.code is null then
    new.code := 'MER-' || lpad(nextval('mer_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_mer_code
  before insert on public.mises_en_relation
  for each row execute function public.generer_code_mer();

-- Table de jointure : experts proposés dans une mise en relation
create table if not exists public.mise_en_relation_experts (
  mise_en_relation_id uuid not null references public.mises_en_relation(id) on delete cascade,
  expert_id uuid not null references public.experts(id) on delete cascade,
  primary key (mise_en_relation_id, expert_id)
);

alter table public.mises_en_relation enable row level security;
alter table public.mise_en_relation_experts enable row level security;

drop policy if exists "Recruteur cree mise en relation" on public.mises_en_relation;
create policy "Recruteur cree mise en relation"
on public.mises_en_relation for insert
to authenticated
with check (recruteur_id in (select id from public.recruteurs where user_id = auth.uid()));

drop policy if exists "Recruteur lit ses mises en relation" on public.mises_en_relation;
create policy "Recruteur lit ses mises en relation"
on public.mises_en_relation for select
to authenticated
using (recruteur_id in (select id from public.recruteurs where user_id = auth.uid()));

drop policy if exists "Admin gere mises en relation" on public.mises_en_relation;
create policy "Admin gere mises en relation"
on public.mises_en_relation for all
to authenticated
using (exists (select 1 from public.profils_utilisateurs where user_id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profils_utilisateurs where user_id = auth.uid() and role = 'admin'));

drop policy if exists "Acces jointure experts mer" on public.mise_en_relation_experts;
create policy "Acces jointure experts mer"
on public.mise_en_relation_experts for all
to authenticated
using (
  mise_en_relation_id in (
    select id from public.mises_en_relation
    where recruteur_id in (select id from public.recruteurs where user_id = auth.uid())
  )
  or exists (select 1 from public.profils_utilisateurs where user_id = auth.uid() and role = 'admin')
)
with check (
  mise_en_relation_id in (
    select id from public.mises_en_relation
    where recruteur_id in (select id from public.recruteurs where user_id = auth.uid())
  )
  or exists (select 1 from public.profils_utilisateurs where user_id = auth.uid() and role = 'admin')
);


-- ============================================
-- 6. COMMISSIONS (générées à la validation d'une mise en relation)
-- ============================================
create sequence if not exists commissions_code_seq;

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  mise_en_relation_id uuid not null references public.mises_en_relation(id) on delete cascade,
  montant numeric not null,
  statut text not null default 'due' check (statut in ('due', 'payee')),
  created_at timestamptz not null default now(),
  payee_at timestamptz
);

create or replace function public.generer_code_commission()
returns trigger as $$
begin
  if new.code is null then
    new.code := 'COM-' || lpad(nextval('commissions_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_commissions_code
  before insert on public.commissions
  for each row execute function public.generer_code_commission();

alter table public.commissions enable row level security;

drop policy if exists "Admin gere commissions" on public.commissions;
create policy "Admin gere commissions"
on public.commissions for all
to authenticated
using (exists (select 1 from public.profils_utilisateurs where user_id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profils_utilisateurs where user_id = auth.uid() and role = 'admin'));


-- ============================================
-- 7. TAXONOMIES (domaines, filières, pays, niveaux, disponibilités)
-- Remplace le tableau TAXONOMIES codé en dur dans data.js
-- ============================================
create table if not exists public.taxonomies (
  id uuid primary key default gen_random_uuid(),
  categorie text not null check (categorie in ('domaine', 'filiere', 'pays', 'niveau', 'disponibilite')),
  valeur text not null,
  ordre int not null default 0,
  created_at timestamptz not null default now(),
  unique (categorie, valeur)
);

alter table public.taxonomies enable row level security;

drop policy if exists "Lecture publique taxonomies" on public.taxonomies;
create policy "Lecture publique taxonomies"
on public.taxonomies for select
to anon, authenticated
using (true);

drop policy if exists "Admin gere taxonomies" on public.taxonomies;
create policy "Admin gere taxonomies"
on public.taxonomies for all
to authenticated
using (exists (select 1 from public.profils_utilisateurs where user_id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profils_utilisateurs where user_id = auth.uid() and role = 'admin'));

-- Valeurs initiales (reprises de data.js)
insert into public.taxonomies (categorie, valeur, ordre) values
  ('domaine', 'Agronomie & Production végétale', 1),
  ('domaine', 'Élevage & Santé animale', 2),
  ('domaine', 'Agro-industrie & Transformation', 3),
  ('domaine', 'Irrigation & Génie rural', 4),
  ('domaine', 'Économie agricole & Financement', 5),
  ('domaine', 'Formation & Vulgarisation', 6),
  ('filiere', 'Riz', 1),
  ('filiere', 'Coton', 2),
  ('filiere', 'Élevage', 3),
  ('filiere', 'Pêche', 4),
  ('filiere', 'Maraîchage', 5),
  ('filiere', 'Arboriculture', 6),
  ('filiere', 'Agro-industrie', 7),
  ('pays', 'Sénégal', 1),
  ('pays', 'Côte d''Ivoire', 2),
  ('pays', 'Mali', 3),
  ('pays', 'Burkina Faso', 4),
  ('pays', 'Bénin', 5),
  ('niveau', 'Junior', 1),
  ('niveau', 'Confirmé', 2),
  ('niveau', 'Senior', 3),
  ('niveau', 'Expert international', 4),
  ('disponibilite', 'Disponible', 1),
  ('disponibilite', 'En mission', 2),
  ('disponibilite', 'Indisponible', 3)
on conflict (categorie, valeur) do nothing;
