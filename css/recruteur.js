/* ============================================
   AgriExperts — Espace recruteur (Espace 3)
   Authentification réelle Supabase Auth (connexion/inscription)
   ============================================ */

let RECRUTEUR_COURANT = null; // ligne de la table "recruteurs"
let EXPERTS_RECRUTEUR = [];   // experts validés (catalogue)
let TAXO_RECRUTEUR = { domaines: [], filieres: [], pays: [] };
let MISSIONS_RECRUTEUR = [];
let shortlist = []; // liste de codes experts en mémoire (persistée dans shortlist_items à l'envoi)
let competencesMission = [];

/* ---------- Bascule connexion / inscription ---------- */
const formConnexion = document.getElementById("auth-form-connexion");
const formInscription = document.getElementById("auth-form-inscription");
const toggleLien = document.getElementById("toggle-auth-mode");
let modeInscription = false;

toggleLien.addEventListener("click", (e) => {
  e.preventDefault();
  modeInscription = !modeInscription;
  formConnexion.hidden = modeInscription;
  formInscription.hidden = !modeInscription;
  document.getElementById("auth-title").textContent = modeInscription
    ? "Créez votre compte recruteur"
    : "Connectez-vous à votre espace";
  toggleLien.textContent = modeInscription
    ? "Déjà un compte ? Connectez-vous."
    : "Pas encore de compte ? Inscrivez votre organisation.";
});

/* ---------- Connexion ---------- */
formConnexion.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled = true;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    afficherToast("Connexion échouée : " + error.message);
    btn.disabled = false;
    return;
  }

  const { data: recruteur, error: erreurRecruteur } = await supabaseClient
    .from("recruteurs")
    .select("*")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (erreurRecruteur || !recruteur) {
    await supabaseClient.auth.signOut();
    afficherToast("Aucun profil recruteur associé à ce compte.");
    btn.disabled = false;
    return;
  }

  RECRUTEUR_COURANT = recruteur;
  await entrerDansEspace();
});

/* ---------- Inscription ---------- */
formInscription.addEventListener("submit", async (e) => {
  e.preventDefault();
  const organisation = document.getElementById("auth-organisation").value.trim();
  const pays = document.getElementById("auth-pays").value.trim();
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled = true;

  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    afficherToast("Inscription échouée : " + error.message);
    btn.disabled = false;
    return;
  }
  if (!data.user) {
    afficherToast("Vérifiez votre boîte mail pour confirmer votre compte, puis connectez-vous.");
    btn.disabled = false;
    return;
  }

  const { error: erreurProfil } = await supabaseClient
    .from("profils_utilisateurs")
    .insert({ user_id: data.user.id, role: "recruteur" });
  if (erreurProfil) {
    afficherToast("Erreur lors de la création du profil : " + erreurProfil.message);
    btn.disabled = false;
    return;
  }

  const { data: recruteur, error: erreurRecruteur } = await supabaseClient
    .from("recruteurs")
    .insert({ user_id: data.user.id, organisation, pays, email })
    .select()
    .single();

  if (erreurRecruteur) {
    afficherToast("Erreur lors de la création du compte recruteur : " + erreurRecruteur.message);
    btn.disabled = false;
    return;
  }

  RECRUTEUR_COURANT = recruteur;
  afficherToast("Compte créé. Validation par l'administrateur en attente pour certaines actions.");
  await entrerDansEspace();
});

/* ---------- Entrée dans l'espace recruteur (après connexion ou inscription) ---------- */
async function entrerDansEspace() {
  document.getElementById("auth-gate").hidden = true;
  document.getElementById("dashboard").hidden = false;
  document.getElementById("dashboard-org").textContent = RECRUTEUR_COURANT.organisation;
  await initEspaceRecruteur();
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

function allerA(nomOnglet) {
  document.querySelector(`.tab[data-tab="${nomOnglet}"]`).click();
}

/* ---------- Chargement des données Supabase ---------- */
async function chargerExpertsEtTaxonomies() {
  const [experts, taxos] = await Promise.all([
    supabaseClient.from("experts").select("*").eq("statut", "valide"),
    supabaseClient.from("taxonomies").select("categorie, valeur, ordre").order("ordre", { ascending: true })
  ]);

  if (experts.error) console.error(experts.error.message);
  EXPERTS_RECRUTEUR = (experts.data || []).map((row) => ({
    id: row.id,
    code: row.code,
    prenom: row.prenom,
    domaine: row.domaine_principal,
    filiere: (row.filieres || [])[0] || "",
    fonction: row.fonction,
    niveau: row.niveau,
    experience: row.annees_experience || 0,
    pays: row.pays_residence,
    region: row.region_ville,
    competences: row.competences || [],
    missions: row.missions_realisees || 0,
    disponibilite: row.disponibilite
  }));

  if (taxos.error) console.error(taxos.error.message);
  TAXO_RECRUTEUR = { domaines: [], filieres: [], pays: [] };
  (taxos.data || []).forEach((t) => {
    if (t.categorie === "domaine") TAXO_RECRUTEUR.domaines.push(t.valeur);
    if (t.categorie === "filiere") TAXO_RECRUTEUR.filieres.push(t.valeur);
    if (t.categorie === "pays") TAXO_RECRUTEUR.pays.push(t.valeur);
  });
}

async function chargerMissions() {
  const { data, error } = await supabaseClient
    .from("missions")
    .select("*")
    .eq("recruteur_id", RECRUTEUR_COURANT.id)
    .order("created_at", { ascending: false });
  if (error) { console.error(error.message); return; }
  MISSIONS_RECRUTEUR = data || [];
}

async function chargerShortlist() {
  const { data, error } = await supabaseClient
    .from("shortlist_items")
    .select("expert_id, experts ( code )")
    .eq("recruteur_id", RECRUTEUR_COURANT.id);
  if (error) { console.error(error.message); return; }
  shortlist = (data || []).map((row) => row.experts?.code).filter(Boolean);
}

/* ---------- Remplissage des listes déroulantes ---------- */
function remplirSelect(select, valeurs, placeholder) {
  select.innerHTML = "";
  if (placeholder) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = placeholder;
    select.appendChild(opt);
  }
  valeurs.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });
}

/* ---------- Tags : compétences requises pour la mission ---------- */
const mCompetenceInput = document.getElementById("m-competence-input");
const mCompetencesWrap = document.getElementById("m-competences-wrap");

function redessinerTags(wrap, input, liste) {
  wrap.querySelectorAll(".tag-chip").forEach((el) => el.remove());
  liste.forEach((valeur, index) => {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    chip.innerHTML = `${valeur} <button type="button" aria-label="Retirer">×</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      liste.splice(index, 1);
      redessinerTags(wrap, input, liste);
    });
    wrap.insertBefore(chip, input);
  });
}

mCompetenceInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    const valeur = mCompetenceInput.value.trim();
    if (valeur && !competencesMission.includes(valeur)) {
      competencesMission.push(valeur);
      redessinerTags(mCompetencesWrap, mCompetenceInput, competencesMission);
    }
    mCompetenceInput.value = "";
  }
});

/* ---------- Publication d'une mission ---------- */
document.getElementById("mission-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const { data: mission, error } = await supabaseClient.from("missions").insert({
    recruteur_id: RECRUTEUR_COURANT.id,
    titre: document.getElementById("m-titre").value,
    description: document.getElementById("m-description").value,
    domaine: document.getElementById("m-domaine").value,
    filiere: document.getElementById("m-filiere").value,
    pays: document.getElementById("m-pays").value,
    duree: document.getElementById("m-duree").value,
    budget: document.getElementById("m-budget").value,
    echeance: document.getElementById("m-echeance").value || null,
    competences: [...competencesMission]
  }).select().single();

  if (error) {
    afficherToast("Erreur lors de la publication : " + error.message);
    return;
  }

  competencesMission = [];
  redessinerTags(mCompetencesWrap, mCompetenceInput, competencesMission);
  e.target.reset();

  await chargerMissions();
  rendreMissions();
  rendreOptionsMissionShortlist();
  rendreOptionsCorrespondances();
  document.getElementById("corr-mission").value = mission.id;
  rendreCorrespondances(mission.id);

  const nbCorrespondances = EXPERTS_RECRUTEUR.filter((ex) => calculerScore(mission, ex) >= 35).length;
  afficherToast(
    nbCorrespondances > 0
      ? `Mission publiée. ${nbCorrespondances} expert(s) correspondant(s) trouvé(s) automatiquement.`
      : "Mission publiée. Aucun expert correspondant pour l'instant."
  );
  allerA("correspondances");
});

function rendreMissions() {
  const liste = document.getElementById("missions-list");
  const vide = document.getElementById("missions-empty");
  document.getElementById("missions-count").textContent = MISSIONS_RECRUTEUR.length;

  if (MISSIONS_RECRUTEUR.length === 0) {
    liste.innerHTML = "";
    vide.hidden = false;
    return;
  }
  vide.hidden = true;

  liste.innerHTML = MISSIONS_RECRUTEUR.map((m) => `
    <article class="mission-card">
      <div>
        <h3>${m.titre}</h3>
        <div class="mission-meta">
          <span>${m.code}</span>
          <span>${m.domaine || "—"}</span>
          <span>${m.pays || "—"}</span>
          <span>${m.duree || "—"}</span>
        </div>
      </div>
      <span class="mission-status">${m.statut === "publiee" ? "Publiée" : m.statut}</span>
      <div class="table-actions" style="width:100%; justify-content:flex-end; margin-top:8px;">
        <button type="button" class="btn btn-outline btn-tiny" data-voir-correspondances="${m.id}">🔎 Voir les experts correspondants</button>
      </div>
    </article>
  `).join("");
}

document.getElementById("missions-list").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-voir-correspondances]");
  if (!btn) return;
  const id = btn.dataset.voirCorrespondances;
  document.getElementById("corr-mission").value = id;
  rendreCorrespondances(id);
  allerA("correspondances");
});

/* ============================================
   Moteur de correspondance automatique (matching)
   ============================================ */
function calculerScore(mission, expert) {
  let score = 0;

  if (mission.domaine && expert.domaine === mission.domaine) score += 35;
  if (mission.filiere && expert.filiere === mission.filiere) score += 15;

  if (mission.competences && mission.competences.length > 0) {
    const communes = expert.competences.filter((c) =>
      mission.competences.some((mc) =>
        c.toLowerCase().includes(mc.toLowerCase()) || mc.toLowerCase().includes(c.toLowerCase())
      )
    );
    score += Math.min(communes.length, 3) * 10;
  }

  if (mission.pays && expert.pays === mission.pays) score += 10;
  if (expert.disponibilite === "Disponible") score += 10;

  return Math.min(score, 100);
}

function classeScore(score) {
  if (score >= 65) return "match-high";
  if (score >= 35) return "match-mid";
  return "match-low";
}

function rendreOptionsCorrespondances() {
  const select = document.getElementById("corr-mission");
  const valeurActuelle = select.value;
  select.innerHTML = "";
  if (MISSIONS_RECRUTEUR.length === 0) {
    select.innerHTML = `<option value="">Aucune mission publiée</option>`;
    return;
  }
  MISSIONS_RECRUTEUR.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = `${m.code} — ${m.titre}`;
    select.appendChild(opt);
  });
  if ([...select.options].some((o) => o.value === valeurActuelle)) {
    select.value = valeurActuelle;
  } else {
    select.value = MISSIONS_RECRUTEUR[0].id;
  }
}

function rendreCorrespondances(missionId) {
  const grid = document.getElementById("corr-grid");
  const vide = document.getElementById("corr-empty");
  const intro = document.getElementById("corr-intro");

  if (!missionId) {
    grid.innerHTML = "";
    vide.hidden = false;
    intro.textContent = "";
    return;
  }

  const mission = MISSIONS_RECRUTEUR.find((m) => m.id === missionId);
  if (!mission) return;

  const classement = EXPERTS_RECRUTEUR
    .map((ex) => ({ expert: ex, score: calculerScore(mission, ex) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  vide.hidden = classement.length > 0;
  intro.textContent = classement.length > 0
    ? `${classement.length} expert(s) correspondant(s) à "${mission.titre}", classés par pertinence.`
    : "";

  grid.innerHTML = classement.map((r) => carteExpertAvecScore(r.expert, r.score)).join("");
}

function carteExpertAvecScore(expert, score) {
  const estDansShortlist = shortlist.includes(expert.code);
  const tags = expert.competences.slice(0, 3).map((c) => `<span class="tag">${c}</span>`).join("");
  return `
    <article class="expert-card" data-id="${expert.code}">
      <div class="card-top">
        <div class="avatar">${expert.prenom.slice(0, 2).toUpperCase()}</div>
        <div style="flex:1;">
          <p class="card-id">${expert.code}</p>
          <h3 class="card-name">${expert.prenom}</h3>
          <p class="card-role">${expert.fonction}</p>
        </div>
        <span class="match-badge ${classeScore(score)}">${score}%</span>
      </div>
      <div class="card-meta">
        <span>${expert.pays} · ${expert.region}</span>
        <span>${expert.experience} ans d'expérience</span>
        <span>${expert.niveau}</span>
      </div>
      <div class="tags">${tags}</div>
      <div class="card-bottom">
        <span class="missions-count">${expert.missions} missions réalisées</span>
        <button type="button" class="btn btn-shortlist ${estDansShortlist ? "is-added" : ""}" data-shortlist="${expert.id}" data-code="${expert.code}">
          ${estDansShortlist ? "✓ Dans la short-list" : "+ Ajouter à la short-list"}
        </button>
      </div>
    </article>
  `;
}

document.getElementById("corr-grid").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-shortlist]");
  if (!btn) return;
  basculerShortlist(btn.dataset.shortlist, btn.dataset.code);
  rendreCorrespondances(document.getElementById("corr-mission").value);
  rendreShortlist();
  rendreRecherche();
});

document.getElementById("corr-mission").addEventListener("change", (e) => {
  rendreCorrespondances(e.target.value);
});

/* ---------- Recherche d'experts ---------- */
function rendreRecherche() {
  const texte = document.getElementById("r-recherche").value.trim().toLowerCase();
  const domaine = document.getElementById("r-domaine").value;

  const resultats = EXPERTS_RECRUTEUR.filter((ex) => {
    if (domaine && ex.domaine !== domaine) return false;
    if (texte) {
      const champ = [ex.fonction, ex.domaine, ex.filiere, ex.pays, ex.region, ...ex.competences].join(" ").toLowerCase();
      if (!champ.includes(texte)) return false;
    }
    return true;
  });

  document.getElementById("r-count").textContent = `${resultats.length} résultat${resultats.length > 1 ? "s" : ""}`;
  document.getElementById("r-grid").innerHTML = resultats.map((ex) => carteExpertRecruteur(ex)).join("");
}

function carteExpertRecruteur(expert) {
  const estDansShortlist = shortlist.includes(expert.code);
  const tags = expert.competences.slice(0, 3).map((c) => `<span class="tag">${c}</span>`).join("");
  return `
    <article class="expert-card" data-id="${expert.code}">
      <div class="card-top">
        <div class="avatar">${expert.prenom.slice(0, 2).toUpperCase()}</div>
        <div>
          <p class="card-id">${expert.code}</p>
          <h3 class="card-name">${expert.prenom}</h3>
          <p class="card-role">${expert.fonction}</p>
        </div>
      </div>
      <div class="card-meta">
        <span>${expert.pays} · ${expert.region}</span>
        <span>${expert.experience} ans d'expérience</span>
        <span>${expert.niveau}</span>
      </div>
      <div class="tags">${tags}</div>
      <div class="card-bottom">
        <span class="missions-count">${expert.missions} missions réalisées</span>
        <button type="button" class="btn btn-shortlist ${estDansShortlist ? "is-added" : ""}" data-shortlist="${expert.id}" data-code="${expert.code}">
          ${estDansShortlist ? "✓ Dans la short-list" : "+ Ajouter à la short-list"}
        </button>
      </div>
    </article>
  `;
}

document.getElementById("r-grid").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-shortlist]");
  if (!btn) return;
  basculerShortlist(btn.dataset.shortlist, btn.dataset.code);
  rendreRecherche();
  rendreShortlist();
});

document.getElementById("r-recherche").addEventListener("input", debounce(rendreRecherche, 200));
document.getElementById("r-domaine").addEventListener("change", rendreRecherche);

/* ---------- Short-list (persistée dans shortlist_items) ---------- */
async function basculerShortlist(expertId, expertCode) {
  const dejaPresent = shortlist.includes(expertCode);

  if (dejaPresent) {
    shortlist = shortlist.filter((c) => c !== expertCode);
    await supabaseClient
      .from("shortlist_items")
      .delete()
      .eq("recruteur_id", RECRUTEUR_COURANT.id)
      .eq("expert_id", expertId);
  } else {
    shortlist.push(expertCode);
    const { error } = await supabaseClient.from("shortlist_items").insert({
      recruteur_id: RECRUTEUR_COURANT.id,
      expert_id: expertId
    });
    if (!error) afficherToast("Expert ajouté à votre short-list.");
  }
}

function rendreShortlist() {
  document.getElementById("shortlist-count").textContent = shortlist.length;
  const grid = document.getElementById("shortlist-grid");
  const vide = document.getElementById("shortlist-empty");
  const actions = document.getElementById("shortlist-actions");

  const experts = EXPERTS_RECRUTEUR.filter((ex) => shortlist.includes(ex.code));

  if (experts.length === 0) {
    grid.innerHTML = "";
    vide.hidden = false;
    actions.hidden = true;
    return;
  }
  vide.hidden = true;
  actions.hidden = false;

  grid.innerHTML = experts.map((ex) => carteExpertRecruteur(ex)).join("");
}

document.getElementById("shortlist-grid").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-shortlist]");
  if (!btn) return;
  basculerShortlist(btn.dataset.shortlist, btn.dataset.code);
  rendreShortlist();
  rendreRecherche();
});

function rendreOptionsMissionShortlist() {
  const select = document.getElementById("sl-mission");
  select.innerHTML = "";
  if (MISSIONS_RECRUTEUR.length === 0) {
    select.innerHTML = `<option value="">Publiez d'abord une mission</option>`;
    return;
  }
  MISSIONS_RECRUTEUR.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = `${m.code} — ${m.titre}`;
    select.appendChild(opt);
  });
}

document.getElementById("send-mise-en-relation").addEventListener("click", async () => {
  const missionId = document.getElementById("sl-mission").value;
  if (!missionId) {
    afficherToast("Publiez d'abord une mission avant d'envoyer une demande.");
    allerA("publier");
    return;
  }
  if (shortlist.length === 0) {
    afficherToast("Votre short-list est vide.");
    return;
  }

  const expertsIds = EXPERTS_RECRUTEUR.filter((ex) => shortlist.includes(ex.code)).map((ex) => ex.id);

  const { data: mer, error } = await supabaseClient.from("mises_en_relation").insert({
    recruteur_id: RECRUTEUR_COURANT.id,
    mission_id: missionId
  }).select().single();

  if (error) {
    afficherToast("Erreur lors de l'envoi : " + error.message);
    return;
  }

  const lignesJointure = expertsIds.map((expert_id) => ({ mise_en_relation_id: mer.id, expert_id }));
  const { error: erreurJointure } = await supabaseClient.from("mise_en_relation_experts").insert(lignesJointure);

  if (erreurJointure) {
    afficherToast("Demande créée, mais erreur lors de l'association des experts : " + erreurJointure.message);
    return;
  }

  afficherToast(`Demande envoyée à l'administrateur pour ${shortlist.length} expert(s) sur la mission ${mer.code}.`);
});

/* ---------- Modale : contact direct de l'administrateur ---------- */
const modal = document.getElementById("contact-admin-modal");

document.getElementById("open-contact-admin").addEventListener("click", () => {
  modal.hidden = false;
});

document.getElementById("close-contact-admin").addEventListener("click", () => {
  modal.hidden = true;
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.hidden = true;
});

document.getElementById("contact-admin-form").addEventListener("submit", (e) => {
  e.preventDefault();
  modal.hidden = true;
  e.target.reset();
  afficherToast("Votre message a été envoyé directement à l'administrateur.");
});

/* ---------- Initialisation de l'espace (après connexion/inscription) ---------- */
async function initEspaceRecruteur() {
  await chargerExpertsEtTaxonomies();
  await chargerMissions();
  await chargerShortlist();

  remplirSelect(document.getElementById("m-domaine"), TAXO_RECRUTEUR.domaines, "Choisir…");
  remplirSelect(document.getElementById("m-filiere"), TAXO_RECRUTEUR.filieres, "Choisir…");
  remplirSelect(document.getElementById("m-pays"), TAXO_RECRUTEUR.pays, "Choisir…");
  remplirSelect(document.getElementById("r-domaine"), TAXO_RECRUTEUR.domaines, "Tous les domaines");

  rendreMissions();
  rendreRecherche();
  rendreShortlist();
  rendreOptionsMissionShortlist();
  rendreOptionsCorrespondances();
  rendreCorrespondances(document.getElementById("corr-mission").value);
}
