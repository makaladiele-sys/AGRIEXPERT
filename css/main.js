/* ============================================
   AgriExperts — Catalogue public (Espace 1)

   Lit désormais les experts validés et les
   taxonomies directement depuis Supabase.
   ============================================ */

let EXPERTS_CATALOGUE = [];
let TAXONOMIES_CATALOGUE = {
  domaines: [], filieres: [], pays: [], niveaux: [], disponibilites: []
};

const CLE_CATEGORIE = {
  domaine: "domaines",
  filiere: "filieres",
  pays: "pays",
  niveau: "niveaux",
  disponibilite: "disponibilites"
};

/* ---------- Normalisation d'une ligne "experts" (schéma DB -> forme utilisée par l'UI) ---------- */
function normaliserExpert(row) {
  return {
    id: row.code,
    prenom: row.prenom,
    nom: row.nom,
    domaine: row.domaine_principal,
    filiere: (row.filieres || [])[0] || "",
    filieres: row.filieres || [],
    fonction: row.fonction,
    niveau: row.niveau,
    experience: row.annees_experience || 0,
    pays: row.pays_residence,
    region: row.region_ville,
    langues: (row.langues || []).map((l) => (typeof l === "string" ? l : l.langue)).filter(Boolean),
    competences: row.competences || [],
    missions: row.missions_realisees || 0,
    disponibilite: row.disponibilite
  };
}

function getExperts() {
  return EXPERTS_CATALOGUE;
}

/* ---------- Chargement des taxonomies depuis Supabase ---------- */
async function chargerTaxonomies() {
  const { data, error } = await supabaseClient
    .from("taxonomies")
    .select("categorie, valeur, ordre")
    .order("ordre", { ascending: true });

  if (error) {
    console.error("Erreur de chargement des taxonomies :", error.message);
    return;
  }

  const groupes = { domaines: [], filieres: [], pays: [], niveaux: [], disponibilites: [] };
  (data || []).forEach((row) => {
    const cle = CLE_CATEGORIE[row.categorie];
    if (cle) groupes[cle].push(row.valeur);
  });
  TAXONOMIES_CATALOGUE = groupes;
}

/* ---------- Chargement des experts validés depuis Supabase ---------- */
async function chargerExperts() {
  const { data, error } = await supabaseClient
    .from("experts")
    .select("*")
    .eq("statut", "valide")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur de chargement des experts :", error.message);
    afficherToast("Impossible de charger le catalogue pour le moment. Réessayez dans un instant.");
    EXPERTS_CATALOGUE = [];
    return;
  }
  EXPERTS_CATALOGUE = (data || []).map(normaliserExpert);
}

/* ---------- Remplissage des filtres à partir des taxonomies ---------- */
function fillSelect(id, values) {
  const select = document.getElementById(id);
  select.querySelectorAll("option:not(:first-child)").forEach((opt) => opt.remove());
  values.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });
}

/* ---------- Initiales pour l'avatar (aucune photo réelle affichée publiquement) ---------- */
function initialesDe(expert) {
  return expert.prenom.slice(0, 2).toUpperCase();
}

/* ---------- Construction d'une carte expert (fiche anonymisée) ---------- */
function carteExpert(expert) {
  const tags = expert.competences
    .slice(0, 3)
    .map((c) => `<span class="tag">${c}</span>`)
    .join("");

  return `
    <article class="expert-card" data-id="${expert.id}">
      <div class="card-top">
        <div class="avatar">${initialesDe(expert)}</div>
        <div>
          <p class="card-id">${expert.id}</p>
          <h3 class="card-name">${expert.prenom} ${expert.id.split("-")[1] || ""}</h3>
          <p class="card-role">${expert.fonction}</p>
        </div>
      </div>
      <div class="card-meta">
        <span>${expert.pays} · ${expert.region}</span>
        <span>${expert.experience} ans d'expérience</span>
        <span>${expert.niveau}</span>
        <span>${expert.langues.join(", ")}</span>
      </div>
      <div class="tags">${tags}</div>
      <div class="card-bottom">
        <span class="missions-count">${expert.missions} missions réalisées</span>
        <button type="button" class="btn btn-primary btn-contact" data-contact="${expert.id}">
          Contacter cet expert
        </button>
      </div>
    </article>
  `;
}

/* ---------- Application des filtres ---------- */
function filtresActifs() {
  return {
    texte: document.getElementById("quick-search").value.trim().toLowerCase(),
    domaine: document.getElementById("f-domaine").value,
    filiere: document.getElementById("f-filiere").value,
    pays: document.getElementById("f-pays").value,
    niveau: document.getElementById("f-niveau").value,
    dispo: document.getElementById("f-dispo").value,
    competence: document.getElementById("f-competence").value.trim().toLowerCase()
  };
}

function correspond(expert, f) {
  if (f.domaine && expert.domaine !== f.domaine) return false;
  if (f.filiere && !expert.filieres.includes(f.filiere)) return false;
  if (f.pays && expert.pays !== f.pays) return false;
  if (f.niveau && expert.niveau !== f.niveau) return false;
  if (f.dispo && expert.disponibilite !== f.dispo) return false;

  if (f.competence) {
    const dans = expert.competences.some((c) => c.toLowerCase().includes(f.competence));
    if (!dans) return false;
  }

  if (f.texte) {
    const champ = [
      expert.fonction,
      expert.domaine,
      expert.filiere,
      expert.pays,
      expert.region,
      ...expert.competences
    ].join(" ").toLowerCase();
    if (!champ.includes(f.texte)) return false;
  }

  return true;
}

function trier(liste, critere) {
  const copie = [...liste];
  if (critere === "experience") copie.sort((a, b) => b.experience - a.experience);
  if (critere === "missions") copie.sort((a, b) => b.missions - a.missions);
  if (critere === "nom") copie.sort((a, b) => a.prenom.localeCompare(b.prenom));
  return copie;
}

/* ---------- Rendu principal ---------- */
function rendre() {
  const f = filtresActifs();
  const critere = document.getElementById("sort-by").value;

  let resultats = getExperts().filter((e) => correspond(e, f));
  resultats = trier(resultats, critere);

  const grille = document.getElementById("expert-grid");
  const compteur = document.getElementById("results-count");
  const vide = document.getElementById("no-results");

  compteur.textContent = `${resultats.length} résultat${resultats.length > 1 ? "s" : ""}`;

  if (resultats.length === 0) {
    grille.innerHTML = "";
    vide.hidden = false;
  } else {
    vide.hidden = true;
    grille.innerHTML = resultats.map(carteExpert).join("");
  }

  document.getElementById("stat-experts").textContent = EXPERTS_CATALOGUE.length;
}

/* ---------- Écouteurs d'événements ---------- */
["f-domaine", "f-filiere", "f-pays", "f-niveau", "f-dispo", "sort-by"].forEach((id) => {
  document.getElementById(id).addEventListener("change", rendre);
});

document.getElementById("f-competence").addEventListener("input", debounce(rendre, 200));
document.getElementById("quick-search").addEventListener("input", debounce(rendre, 200));

document.getElementById("hero-search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  document.getElementById("catalogue").scrollIntoView({ behavior: "smooth" });
  rendre();
});

document.getElementById("reset-filters").addEventListener("click", () => {
  ["f-domaine", "f-filiere", "f-pays", "f-niveau", "f-dispo"].forEach((id) => {
    document.getElementById(id).value = "";
  });
  document.getElementById("f-competence").value = "";
  document.getElementById("quick-search").value = "";
  rendre();
});

document.getElementById("expert-grid").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-contact]");
  if (!btn) return;
  const id = btn.dataset.contact;
  // Étape suivante : cette action enverra une demande à l'administrateur
  // (table "mise_en_relation") au lieu d'un simple message.
  afficherToast(
    `Demande transmise à l'administrateur pour l'expert ${id}. ` +
    `(Sera enregistrée dans "mise_en_relation" à l'étape recruteur.)`
  );
});

/* ---------- Grille "parcelles" (élément visuel signature du hero) ---------- */
function dessinerGrilleParcelles() {
  const svg = document.getElementById("parcel-grid");
  const cols = 10;
  const rows = 7;
  const gap = 4;
  const cellW = (320 - gap * (cols - 1)) / cols;
  const cellH = (224 - gap * (rows - 1)) / rows;

  const remplies = new Set([
    2, 5, 8, 11, 14, 17, 22, 25, 29, 33, 36, 40, 44, 47, 51,
    54, 58, 61, 65, 68
  ]);
  const couleurs = ["var(--gold)", "var(--clay)", "var(--forest)"];

  let svgContent = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const x = c * (cellW + gap);
      const y = r * (cellH + gap);
      const rempli = remplies.has(i);
      const fill = rempli ? couleurs[i % couleurs.length] : "rgba(238,240,227,0.08)";
      const stroke = rempli ? "none" : "rgba(238,240,227,0.18)";
      svgContent += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="1.5" fill="${fill}" stroke="${stroke}" stroke-width="1"></rect>`;
    }
  }
  svg.innerHTML = svgContent;
}

/* ---------- Initialisation ---------- */
async function initCatalogue() {
  dessinerGrilleParcelles();

  document.getElementById("stat-experts").textContent = "…";

  await Promise.all([chargerTaxonomies(), chargerExperts()]);

  fillSelect("f-domaine", TAXONOMIES_CATALOGUE.domaines);
  fillSelect("f-filiere", TAXONOMIES_CATALOGUE.filieres);
  fillSelect("f-pays", TAXONOMIES_CATALOGUE.pays);
  fillSelect("f-niveau", TAXONOMIES_CATALOGUE.niveaux);
  fillSelect("f-dispo", TAXONOMIES_CATALOGUE.disponibilites);

  rendre();
}

initCatalogue();
