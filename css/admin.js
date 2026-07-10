/* ============================================
   AgriExperts — Administration (Espace 4)
   Authentification réelle Supabase Auth + rôle admin
   ============================================ */

let ADMIN_EXPERTS_VALIDES = [];
let ADMIN_INSCRIPTIONS_ATTENTE = [];
let ADMIN_RECRUTEURS = [];
let ADMIN_RELATIONS = [];
let ADMIN_COMMISSIONS = [];
let ADMIN_TAXONOMIES = { domaines: [], filieres: [] };

/* ---------- Authentification ---------- */
document.getElementById("auth-form-1").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("admin-email").value.trim();
  const password = document.getElementById("admin-password").value;
  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled = true;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    afficherToast("Connexion échouée : " + error.message);
    btn.disabled = false;
    return;
  }

  const { data: profil, error: erreurProfil } = await supabaseClient
    .from("profils_utilisateurs")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (erreurProfil || !profil || profil.role !== "admin") {
    await supabaseClient.auth.signOut();
    afficherToast("Ce compte n'a pas les droits administrateur.");
    btn.disabled = false;
    return;
  }

  document.getElementById("auth-step-1").hidden = true;
  document.getElementById("dashboard").hidden = false;
  afficherToast("Connexion administrateur réussie.");
  initDashboard();
});

/* ---------- Initialisation du tableau de bord ---------- */
let dashboardInitialise = false;

async function initDashboard() {
  if (dashboardInitialise) return;
  dashboardInitialise = true;
  await rechargerTout();
}

async function rechargerTout() {
  await Promise.all([
    chargerExpertsValides(),
    chargerInscriptionsEnAttente(),
    chargerRecruteurs(),
    chargerRelations(),
    chargerCommissions(),
    chargerTaxonomies()
  ]);
  rendreStats();
  rendreValidations();
  rendreComptes();
  rendreRelations();
  rendreCommissions();
  rendreTaxonomies();
}

/* ---------- Chargements Supabase ---------- */
async function chargerExpertsValides() {
  const { data, error } = await supabaseClient.from("experts").select("*").eq("statut", "valide");
  if (error) { console.error(error.message); return; }
  ADMIN_EXPERTS_VALIDES = data || [];
}

async function chargerInscriptionsEnAttente() {
  const { data, error } = await supabaseClient
    .from("experts")
    .select("*")
    .eq("statut", "en_attente_validation")
    .order("created_at", { ascending: true });
  if (error) { console.error(error.message); return; }
  ADMIN_INSCRIPTIONS_ATTENTE = data || [];
}

async function chargerRecruteurs() {
  const { data, error } = await supabaseClient.from("recruteurs").select("*");
  if (error) { console.error(error.message); return; }
  ADMIN_RECRUTEURS = data || [];
}

async function chargerRelations() {
  const { data, error } = await supabaseClient
    .from("mises_en_relation")
    .select(`
      id, code, montant_contrat, taux_commission, statut,
      missions ( titre ),
      recruteurs ( organisation ),
      mise_en_relation_experts ( experts ( id, code, prenom ) )
    `)
    .order("created_at", { ascending: false });
  if (error) { console.error(error.message); return; }
  ADMIN_RELATIONS = data || [];
}

async function chargerCommissions() {
  const { data, error } = await supabaseClient
    .from("commissions")
    .select(`
      id, code, montant, statut,
      mises_en_relation ( code, missions ( titre ), recruteurs ( organisation ) )
    `)
    .order("created_at", { ascending: false });
  if (error) { console.error(error.message); return; }
  ADMIN_COMMISSIONS = data || [];
}

async function chargerTaxonomies() {
  const { data, error } = await supabaseClient
    .from("taxonomies")
    .select("id, categorie, valeur, ordre")
    .order("ordre", { ascending: true });
  if (error) { console.error(error.message); return; }
  ADMIN_TAXONOMIES.domaines = (data || []).filter((t) => t.categorie === "domaine");
  ADMIN_TAXONOMIES.filieres = (data || []).filter((t) => t.categorie === "filiere");
}

/* ---------- Onglets ---------- */
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("is-active"));
    tab.classList.add("is-active");
    document.querySelector(`.tab-panel[data-panel="${tab.dataset.tab}"]`).classList.add("is-active");
  });
});

/* ---------- Statistiques ---------- */
function rendreStats() {
  const commissionsDues = ADMIN_COMMISSIONS.filter((c) => c.statut === "due").reduce((s, c) => s + Number(c.montant), 0);
  const stats = [
    { label: "Experts validés", valeur: ADMIN_EXPERTS_VALIDES.length },
    { label: "Inscriptions en attente", valeur: ADMIN_INSCRIPTIONS_ATTENTE.length },
    { label: "Mises en relation en attente", valeur: ADMIN_RELATIONS.filter((m) => m.statut === "en_attente").length },
    { label: "Commissions dues (FCFA)", valeur: commissionsDues.toLocaleString("fr-FR") }
  ];
  document.getElementById("stats-grid").innerHTML = stats.map((s) => `
    <div class="stat">
      <span class="stat-value">${s.valeur}</span>
      <span class="stat-label">${s.label}</span>
    </div>
  `).join("");
}

/* ---------- Validations des inscriptions ---------- */
function rendreValidations() {
  const liste = document.getElementById("validations-list");
  const vide = document.getElementById("validations-empty");
  document.getElementById("count-validations").textContent = ADMIN_INSCRIPTIONS_ATTENTE.length;

  if (ADMIN_INSCRIPTIONS_ATTENTE.length === 0) {
    liste.innerHTML = "";
    vide.hidden = false;
    return;
  }
  vide.hidden = true;

  liste.innerHTML = ADMIN_INSCRIPTIONS_ATTENTE.map((r) => `
    <article class="mission-card">
      <div>
        <h3>${r.prenom} ${r.nom}</h3>
        <div class="mission-meta">
          <span>${r.code || r.id}</span>
          <span>${r.domaine_principal}</span>
          <span>${r.pays_residence}</span>
          <span>Inscrit le ${new Date(r.created_at).toLocaleDateString("fr-FR")}</span>
        </div>
      </div>
      <div class="table-actions">
        <button class="btn btn-primary btn-tiny" data-valider="${r.id}">Valider</button>
        <button class="btn btn-danger btn-tiny" data-rejeter="${r.id}">Rejeter</button>
      </div>
    </article>
  `).join("");
}

document.getElementById("validations-list").addEventListener("click", async (e) => {
  const valider = e.target.closest("[data-valider]");
  const rejeter = e.target.closest("[data-rejeter]");
  if (!valider && !rejeter) return;

  const id = (valider || rejeter).dataset.valider || (valider || rejeter).dataset.rejeter;
  const nouveauStatut = valider ? "valide" : "rejete";

  const { error } = await supabaseClient.from("experts").update({ statut: nouveauStatut }).eq("id", id);
  if (error) {
    afficherToast("Erreur : " + error.message);
    return;
  }

  afficherToast(valider ? "Profil validé. L'expert apparaît désormais dans le catalogue public." : "Inscription rejetée.");
  await chargerInscriptionsEnAttente();
  await chargerExpertsValides();
  rendreValidations();
  rendreStats();
  rendreComptes();
});

/* ---------- Gestion des comptes ---------- */
function rendreComptes() {
  const tbody = document.querySelector("#comptes-table tbody");
  const lignesExperts = ADMIN_EXPERTS_VALIDES.map((ex) => `
    <tr>
      <td>${ex.prenom} ${ex.nom}</td>
      <td>Expert</td>
      <td>${ex.pays_residence}</td>
      <td><span class="status-pill is-paid">Validé</span></td>
      <td class="table-actions">
        <button class="btn btn-outline btn-tiny" data-suspendre-expert="${ex.id}">Suspendre</button>
        <button class="btn btn-danger btn-tiny" data-supprimer-expert="${ex.id}">Supprimer</button>
      </td>
    </tr>
  `).join("");

  const lignesRecruteurs = ADMIN_RECRUTEURS.map((r) => `
    <tr>
      <td>${r.organisation}</td>
      <td>Recruteur</td>
      <td>${r.pays || "—"}</td>
      <td><span class="status-pill ${r.statut === "valide" ? "is-paid" : "is-pending"}">${r.statut}</span></td>
      <td class="table-actions">
        ${r.statut !== "valide" ? `<button class="btn btn-primary btn-tiny" data-valider-recruteur="${r.id}">Valider</button>` : ""}
        <button class="btn btn-outline btn-tiny" data-suspendre-recruteur="${r.id}">Suspendre</button>
      </td>
    </tr>
  `).join("");

  tbody.innerHTML = lignesExperts + lignesRecruteurs || `<tr><td colspan="5" style="color:var(--ink-soft); font-style:italic;">Aucun compte pour l'instant.</td></tr>`;
}

document.querySelector("#comptes-table").addEventListener("click", async (e) => {
  const suspendreExpert = e.target.closest("[data-suspendre-expert]");
  const supprimerExpert = e.target.closest("[data-supprimer-expert]");
  const validerRecruteur = e.target.closest("[data-valider-recruteur]");
  const suspendreRecruteur = e.target.closest("[data-suspendre-recruteur]");

  if (suspendreExpert) {
    await supabaseClient.from("experts").update({ statut: "suspendu" }).eq("id", suspendreExpert.dataset.suspendreExpert);
    afficherToast("Expert suspendu.");
  }
  if (supprimerExpert) {
    await supabaseClient.from("experts").delete().eq("id", supprimerExpert.dataset.supprimerExpert);
    afficherToast("Expert supprimé.");
  }
  if (validerRecruteur) {
    await supabaseClient.from("recruteurs").update({ statut: "valide" }).eq("id", validerRecruteur.dataset.validerRecruteur);
    afficherToast("Recruteur validé.");
  }
  if (suspendreRecruteur) {
    await supabaseClient.from("recruteurs").update({ statut: "suspendu" }).eq("id", suspendreRecruteur.dataset.suspendreRecruteur);
    afficherToast("Recruteur suspendu.");
  }

  await chargerExpertsValides();
  await chargerRecruteurs();
  rendreComptes();
  rendreStats();
});

/* ---------- Mises en relation & déclenchement de la commission ---------- */
function rendreRelations() {
  const liste = document.getElementById("relations-list");
  document.getElementById("count-relations").textContent = ADMIN_RELATIONS.filter((m) => m.statut === "en_attente").length;

  if (ADMIN_RELATIONS.length === 0) {
    liste.innerHTML = `<p class="no-results">Aucune mise en relation pour l'instant.</p>`;
    return;
  }

  liste.innerHTML = ADMIN_RELATIONS.map((m) => {
    const nomsExperts = (m.mise_en_relation_experts || [])
      .map((j) => j.experts)
      .filter(Boolean)
      .map((ex) => `${ex.prenom} (${ex.code})`)
      .join(", ");

    const statutLabel = m.statut === "en_attente" ? "En attente" : m.statut === "validee" ? "Validée" : "Refusée";
    const statutClass = m.statut === "en_attente" ? "is-pending" : "is-paid";

    return `
      <article class="relation-card">
        <div class="relation-head">
          <div>
            <h3 style="font-family: var(--font-display); font-size:16.5px; margin-bottom:4px;">${m.missions?.titre || "Mission"}</h3>
            <div class="mission-meta"><span>${m.code}</span><span>${m.recruteurs?.organisation || "—"}</span></div>
          </div>
          <span class="status-pill ${statutClass}">${statutLabel}</span>
        </div>
        <p class="relation-experts">Expert(s) proposé(s) : ${nomsExperts || "—"}</p>
        ${m.statut === "en_attente"
          ? `<button class="btn btn-primary btn-tiny" data-valider-relation="${m.id}">Valider la mise en relation</button>`
          : m.statut === "validee"
            ? `<p class="step-intro" style="margin:0;">Coordonnées communiquées aux deux parties. Commission générée.</p>`
            : ""
        }
      </article>
    `;
  }).join("");
}

document.getElementById("relations-list").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-valider-relation]");
  if (!btn) return;
  const id = btn.dataset.validerRelation;
  const relation = ADMIN_RELATIONS.find((m) => m.id === id);
  if (!relation) return;

  const { error: erreurMaj } = await supabaseClient
    .from("mises_en_relation")
    .update({ statut: "validee", validated_at: new Date().toISOString() })
    .eq("id", id);

  if (erreurMaj) {
    afficherToast("Erreur : " + erreurMaj.message);
    return;
  }

  const montant = Math.round((relation.montant_contrat || 0) * (relation.taux_commission || 0.12));
  const { error: erreurCommission } = await supabaseClient.from("commissions").insert({
    mise_en_relation_id: id,
    montant
  });

  if (erreurCommission) {
    afficherToast("Mise en relation validée, mais échec de la génération de la commission : " + erreurCommission.message);
  } else {
    afficherToast(`Mise en relation validée. Commission de ${montant.toLocaleString("fr-FR")} FCFA générée.`);
  }

  await chargerRelations();
  await chargerCommissions();
  rendreRelations();
  rendreCommissions();
  rendreStats();
});

/* ---------- Commissions ---------- */
function rendreCommissions() {
  const tbody = document.querySelector("#commissions-table tbody");
  const total = ADMIN_COMMISSIONS.reduce((s, c) => s + Number(c.montant), 0);
  const du = ADMIN_COMMISSIONS.filter((c) => c.statut === "due").reduce((s, c) => s + Number(c.montant), 0);

  document.getElementById("ca-total").textContent = total.toLocaleString("fr-FR");
  document.getElementById("ca-du").textContent = du.toLocaleString("fr-FR");

  if (ADMIN_COMMISSIONS.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--ink-soft); font-style:italic;">Aucune commission générée pour l'instant.</td></tr>`;
    return;
  }

  tbody.innerHTML = ADMIN_COMMISSIONS.map((c) => `
    <tr>
      <td>${c.mises_en_relation?.missions?.titre || "—"}</td>
      <td>${c.mises_en_relation?.recruteurs?.organisation || "—"}</td>
      <td>${Number(c.montant).toLocaleString("fr-FR")} FCFA</td>
      <td><span class="status-pill ${c.statut === "due" ? "is-due" : "is-paid"}">${c.statut === "due" ? "Due" : "Payée"}</span></td>
      <td>
        ${c.statut === "due" ? `<button class="btn btn-outline btn-tiny" data-payer="${c.id}">Marquer payée</button>` : ""}
      </td>
    </tr>
  `).join("");
}

document.querySelector("#commissions-table").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-payer]");
  if (!btn) return;
  const { error } = await supabaseClient
    .from("commissions")
    .update({ statut: "payee", payee_at: new Date().toISOString() })
    .eq("id", btn.dataset.payer);

  if (error) {
    afficherToast("Erreur : " + error.message);
    return;
  }
  await chargerCommissions();
  rendreCommissions();
  rendreStats();
  afficherToast("Commission marquée comme payée.");
});

/* ---------- Taxonomies ---------- */
function rendreTaxonomies() {
  const domainesWrap = document.getElementById("taxo-domaines");
  const filieresWrap = document.getElementById("taxo-filieres");

  domainesWrap.innerHTML = ADMIN_TAXONOMIES.domaines.map((d) => `
    <span class="tag-chip">${d.valeur} <button type="button" data-remove-taxo="${d.id}">×</button></span>
  `).join("");

  filieresWrap.innerHTML = ADMIN_TAXONOMIES.filieres.map((f) => `
    <span class="tag-chip">${f.valeur} <button type="button" data-remove-taxo="${f.id}">×</button></span>
  `).join("");
}

document.getElementById("add-domaine").addEventListener("click", async () => {
  const input = document.getElementById("new-domaine");
  const valeur = input.value.trim();
  if (!valeur) return;
  const { error } = await supabaseClient.from("taxonomies").insert({ categorie: "domaine", valeur, ordre: ADMIN_TAXONOMIES.domaines.length + 1 });
  if (error) { afficherToast("Erreur : " + error.message); return; }
  input.value = "";
  await chargerTaxonomies();
  rendreTaxonomies();
  afficherToast("Domaine ajouté.");
});

document.getElementById("add-filiere").addEventListener("click", async () => {
  const input = document.getElementById("new-filiere");
  const valeur = input.value.trim();
  if (!valeur) return;
  const { error } = await supabaseClient.from("taxonomies").insert({ categorie: "filiere", valeur, ordre: ADMIN_TAXONOMIES.filieres.length + 1 });
  if (error) { afficherToast("Erreur : " + error.message); return; }
  input.value = "";
  await chargerTaxonomies();
  rendreTaxonomies();
  afficherToast("Filière ajoutée.");
});

async function supprimerTaxonomie(id) {
  const { error } = await supabaseClient.from("taxonomies").delete().eq("id", id);
  if (error) { afficherToast("Erreur : " + error.message); return; }
  await chargerTaxonomies();
  rendreTaxonomies();
}

document.getElementById("taxo-domaines").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-remove-taxo]");
  if (btn) supprimerTaxonomie(btn.dataset.removeTaxo);
});

document.getElementById("taxo-filieres").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-remove-taxo]");
  if (btn) supprimerTaxonomie(btn.dataset.removeTaxo);
});

/* ---------- Export CSV (fonctionnel) ---------- */
function exporterExpertsCSV() {
  const entetes = ["Code", "Prénom", "Nom", "Domaine", "Fonction", "Niveau", "Expérience", "Pays", "Région", "Missions", "Disponibilité"];
  const lignes = ADMIN_EXPERTS_VALIDES.map((ex) => [
    ex.code, ex.prenom, ex.nom, ex.domaine_principal, ex.fonction, ex.niveau,
    ex.annees_experience, ex.pays_residence, ex.region_ville, ex.missions_realisees, ex.disponibilite
  ]);

  const csv = [entetes, ...lignes]
    .map((ligne) => ligne.map((champ) => `"${String(champ ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "agriexperts-experts.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.getElementById("export-csv").addEventListener("click", () => {
  exporterExpertsCSV();
  afficherToast("Export CSV téléchargé.");
});

document.getElementById("export-excel").addEventListener("click", () => {
  afficherToast("Export Excel — prochaine étape (module rapports).");
});

document.getElementById("export-pdf").addEventListener("click", () => {
  afficherToast("Export PDF — prochaine étape (module rapports).");
});
