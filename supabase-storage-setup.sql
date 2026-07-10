/* ============================================
   AgriExperts — Configuration Supabase
   Fichier partagé par toutes les pages (index,
   inscription, recruteur, admin). Ne contient que
   la clé publique "anon", protégée par les
   politiques RLS côté serveur — sans danger à
   exposer côté client.
   ============================================ */

const SUPABASE_URL = "https://ocbuxlmvixgxlaidtgwi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYnV4bG12aXhneGxhaWR0Z3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MjYzMzcsImV4cCI6MjA5OTIwMjMzN30.YmuLymwx53Idf7STH9V0maZ8hoXT0kr39undLh_a8TQ";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
