/* ============================================
   AgriExperts — Inscription expert (Espace 2)
   ============================================ */

const form = document.getElementById("expert-form");
let currentStep = 1;
const totalSteps = 4;

/* ---------- Remplissage des listes déroulantes à partir des taxonomies ---------- */
function remplirSelect(select, valeurs, placeholder) {
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

remplirSelect(document.getElementById("nationalite"), TAXONOMIES.pays, "Choisir…");
remplirSelect(document.getElementById("pays-residence"), TAXONOMIES.pays, "Choisir…");
remplirSelect(document.getElementById("domaine-principal"), TAXONOMIES.domaines, "Choisir…");
remplirSelect(document.getElementById("niveau"), TAXONOMIES.niveaux, "Choisir…");
remplirSelect(document.getElementById("disponibilite"), TAXONOMIES.disponibilites, "Choisir…");

/* ---------- Domaines secondaires & filières en cases à cocher ---------- */
function remplirChips(container, valeurs, name) {
  container.innerHTML = valeurs.map((v) => `
    <label class="chip-choice">
      <input type="checkbox" name="${name}" value="${v}">
      <span>${v}</span>
    </label>
  `).join("");
}

remplirChips(document.getElementById("domaines-secondaires"), TAXONOMIES.domaines, "domaines_secondaires");
remplirChips(document.getElementById("filieres-choices"), TAXONOMIES.filieres, "filieres");
remplirChips(document.getElementById("pays-intervention"), TAXONOMIES.pays, "pays_intervention");

/* ---------- Navigation entre étapes ---------- */
function afficherEtape(n) {
  document.querySelectorAll(".form-step").forEach((el) => {
    el.classList.toggle("is-active", Number(el.dataset.step) === n);
  });
  document.querySelectorAll("#stepper li").forEach((li) => {
    const s = Number(li.dataset.step);
    li.classList.toggle("is-active", s === n);
    li.classList.toggle("is-done", s < n);
  });
  currentStep = n;
  window.scrollTo({ top: document.querySelector(".wizard-section").offsetTop - 20, behavior: "smooth" });
}

function champsRequisValides(etape) {
  const fieldset = document.querySelector(`.form-step[data-step="${etape}"]`);
  const requis = fieldset.querySelectorAll("[required]");
  for (const champ of requis) {
    if (!champ.checkValidity()) {
      champ.reportValidity();
      return false;
    }
  }
  // Contrôles complémentaires propres à chaque étape
  if (etape === 2) {
    if (document.querySelectorAll('#filieres-choices input:checked').length === 0) {
      afficherToast("Sélectionnez au moins une filière.");
      return false;
    }
    if (competences.length === 0) {
      afficherToast("Ajoutez au moins une compétence.");
      return false;
    }
  }
  if (etape === 3) {
    if (document.querySelectorAll('#pays-intervention input:checked').length === 0) {
      afficherToast("Sélectionnez au moins un pays d'intervention.");
      return false;
    }
  }
  return true;
}

document.querySelectorAll("[data-next]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (champsRequisValides(currentStep) && currentStep < totalSteps) {
      afficherEtape(currentStep + 1);
    }
  });
});

document.querySelectorAll("[data-prev]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (currentStep > 1) afficherEtape(currentStep - 1);
  });
});

/* ---------- Tags : compétences ---------- */
let competences = [];
const competenceInput = document.getElementById("competence-input");
const competencesWrap = document.getElementById("competences-input");

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

function activerTagInput(input, wrap, liste) {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const valeur = input.value.trim();
      if (valeur && !liste.includes(valeur)) {
        liste.push(valeur);
        redessinerTags(wrap, input, liste);
      }
      input.value = "";
    } else if (e.key === "Backspace" && input.value === "" && liste.length) {
      liste.pop();
      redessinerTags(wrap, input, liste);
    }
  });
}

activerTagInput(competenceInput, competencesWrap, competences);

/* ---------- Tags : régions d'intervention ---------- */
let regions = [];
const regionsInput = document.getElementById("regions-input");
const regionsWrap = document.getElementById("regions-input-wrap");
activerTagInput(regionsInput, regionsWrap, regions);

/* ---------- Langues (lignes dynamiques) ---------- */
const languesRows = document.getElementById("langues-rows");
const NIVEAUX_LANGUE = ["Débutant", "Intermédiaire", "Courant", "Natif"];

function creerLigneLangue() {
  const row = document.createElement("div");
  row.className = "dynamic-row";
  row.innerHTML = `
    <input type="text" placeholder="Langue (ex. Français)" class="langue-nom">
    <select class="langue-niveau">
      ${NIVEAUX_LANGUE.map((n) => `<option>${n}</option>`).join("")}
    </select>
    <button type="button" class="row-remove" aria-label="Retirer cette langue">×</button>
  `;
  row.querySelector(".row-remove").addEventListener("click", () => {
    if (languesRows.children.length > 1) row.remove();
    majBoutonsSuppression();
  });
  languesRows.appendChild(row);
  majBoutonsSuppression();
}

function majBoutonsSuppression() {
  const boutons = languesRows.querySelectorAll(".row-remove");
  boutons.forEach((b) => { b.disabled = languesRows.children.length <= 1; });
}

document.getElementById("add-langue").addEventListener("click", creerLigneLangue);
creerLigneLangue(); // une première ligne par défaut

/* ---------- Affichage du nom de fichier sélectionné ---------- */
document.querySelectorAll("[data-file-input]").forEach((wrap) => {
  const input = wrap.querySelector("input[type='file']");
  const label = wrap.querySelector(".file-name");
  input.addEventListener("change", () => {
    if (input.files.length === 0) {
      label.textContent = "Aucun fichier sélectionné";
    } else if (input.files.length === 1) {
      label.textContent = input.files[0].name;
    } else {
      label.textContent = `${input.files.length} fichiers sélectionnés`;
    }
  });
});

/* ---------- Upload des documents vers Supabase Storage ---------- */

// Mapping champ de formulaire -> bucket Supabase
const BUCKETS_PAR_CHAMP = {
  photo: "photos-profil",
  cv: "cv",
  piece_identite: "pieces-identite",
  diplomes: "diplomes",
  certifications: "certifications",
  attestations: "attestations",
  lettre: "lettres-motivation"
};

const TAILLE_MAX_OCTETS = 10 * 1024 * 1024; // 10 Mo (cohérent avec les buckets)

function extensionFichier(nom) {
  const parts = nom.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

/**
 * Upload un fichier unique vers un bucket, sous un dossier propre
 * à cette candidature (dossierId), avec un nom de fichier assaini.
 * Retourne le chemin de stockage (path) en cas de succès.
 */
async function uploaderFichier(bucket, dossierId, file) {
  if (file.size > TAILLE_MAX_OCTETS) {
    throw new Error(`Le fichier "${file.name}" dépasse la taille maximale autorisée (10 Mo).`);
  }
  const ext = extensionFichier(file.name);
  const nomPropre = `${crypto.randomUUID()}${ext ? "." + ext : ""}`;
  const path = `${dossierId}/${nomPropre}`;

  const { error } = await supabaseClient.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });

  if (error) {
    throw new Error(`Échec de l'envoi de "${file.name}" : ${error.message}`);
  }
  return path;
}

/**
 * Parcourt tous les champs de type fichier du formulaire et les
 * upload vers leurs buckets respectifs. Retourne un objet
 * { champ: path | [path, ...] } avec uniquement les champs remplis.
 */
async function uploaderTousLesDocuments(dossierId, onProgress) {
  const resultats = {};
  const champs = Object.keys(BUCKETS_PAR_CHAMP);
  let fait = 0;

  // Compte total de fichiers pour une progression précise
  let totalFichiers = 0;
  champs.forEach((champ) => {
    const input = document.getElementById(champ.replace(/_/g, "-"));
    if (input && input.files.length) totalFichiers += input.files.length;
  });

  for (const champ of champs) {
    const inputId = champ.replace(/_/g, "-");
    const input = document.getElementById(inputId);
    if (!input || input.files.length === 0) continue;

    const bucket = BUCKETS_PAR_CHAMP[champ];

    if (input.multiple) {
      const paths = [];
      for (const file of input.files) {
        const path = await uploaderFichier(bucket, dossierId, file);
        paths.push(path);
        fait++;
        if (onProgress) onProgress(fait, totalFichiers, file.name);
      }
      resultats[champ] = paths;
    } else {
      const path = await uploaderFichier(bucket, dossierId, input.files[0]);
      resultats[champ] = path;
      fait++;
      if (onProgress) onProgress(fait, totalFichiers, input.files[0].name);
    }
  }

  return resultats;
}

/* ---------- Barre de progression d'envoi ---------- */
function afficherBarreProgression(visible, texte) {
  let barre = document.getElementById("upload-progress");
  if (!barre) {
    barre = document.createElement("div");
    barre.id = "upload-progress";
    barre.className = "upload-progress";
    barre.innerHTML = `
      <div class="upload-progress-bar"><div class="upload-progress-fill"></div></div>
      <p class="upload-progress-text"></p>
    `;
    form.querySelector(".form-step[data-step=\"4\"]").appendChild(barre);
  }
  barre.hidden = !visible;
  if (texte) barre.querySelector(".upload-progress-text").textContent = texte;
  return barre;
}

function majBarreProgression(fait, total, nomFichier) {
  const barre = afficherBarreProgression(true);
  const pct = total > 0 ? Math.round((fait / total) * 100) : 0;
  barre.querySelector(".upload-progress-fill").style.width = `${pct}%`;
  barre.querySelector(".upload-progress-text").textContent =
    `Envoi des documents… ${fait}/${total} (${nomFichier})`;
}

/* ---------- Soumission finale ---------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!champsRequisValides(4)) return;

  const cgu = document.getElementById("cgu");
  if (!cgu.checked) {
    afficherToast("Vous devez accepter les conditions d'utilisation.");
    return;
  }

  const submitBtn = form.querySelector('[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  const dossierId = crypto.randomUUID();

  try {
    afficherBarreProgression(true, "Envoi des documents…");
    const documents = await uploaderTousLesDocuments(dossierId, majBarreProgression);

    const languesData = [...languesRows.querySelectorAll(".dynamic-row")].map((row) => ({
      langue: row.querySelector(".langue-nom").value,
      niveau: row.querySelector(".langue-niveau").value
    }));

    // Enregistrement de la fiche dans la table "experts" (statut en attente
    // de validation par l'administrateur — RLS l'impose automatiquement).
    const { error: erreurInsertion } = await supabaseClient.from("experts").insert({
      dossier_id: dossierId,
      nom: form.nom.value,
      prenom: form.prenom.value,
      sexe: form.sexe.value,
      date_naissance: form.naissance.value || null,
      nationalite: form.nationalite.value,
      pays_residence: form.pays_residence.value,
      region_ville: form.region_ville.value,
      telephone: form.telephone.value,
      whatsapp: form.whatsapp.value,
      email: form.email.value,
      linkedin: form.linkedin.value,
      site_web: form.site_web.value,
      domaine_principal: form.domaine_principal.value,
      domaines_secondaires: [...document.querySelectorAll('#domaines-secondaires input:checked')].map(i => i.value),
      filieres: [...document.querySelectorAll('#filieres-choices input:checked')].map(i => i.value),
      fonction: form.fonction.value,
      niveau: form.niveau.value,
      annees_experience: Number(form.annees_experience.value) || 0,
      competences,
      langues: languesData,
      disponibilite: form.disponibilite.value,
      date_dispo: form.date_dispo.value || null,
      tarif: form.tarif.value ? Number(form.tarif.value) : null,
      devise: form.devise.value,
      mobilite: form.mobilite.value,
      contrat: [...document.querySelectorAll('input[name="contrat"]:checked')].map(i => i.value),
      pays_intervention: [...document.querySelectorAll('#pays-intervention input:checked')].map(i => i.value),
      regions_intervention: regions,
      documents,
      statut: "en_attente_validation"
    });

    if (erreurInsertion) {
      throw new Error(`Les documents ont bien été envoyés, mais l'enregistrement du profil a échoué : ${erreurInsertion.message}`);
    }

    afficherBarreProgression(false);
    form.hidden = true;
    document.getElementById("stepper").hidden = true;
    document.getElementById("confirmation").hidden = false;
    afficherToast("Profil et documents envoyés avec succès.");
  } catch (err) {
    afficherBarreProgression(false);
    afficherToast(err.message || "Une erreur est survenue lors de l'envoi des documents.");
    if (submitBtn) submitBtn.disabled = false;
  }
});
