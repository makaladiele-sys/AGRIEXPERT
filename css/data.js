/* ============================================
   Données de démonstration.
   À terme, ce fichier sera remplacé par un appel
   à Supabase (table "experts"). La structure des
   objets ci-dessous correspond déjà aux colonnes
   prévues dans le cahier des charges.
   ============================================ */

const TAXONOMIES = {
  domaines: [
    "Agronomie & Production végétale",
    "Élevage & Santé animale",
    "Agro-industrie & Transformation",
    "Irrigation & Génie rural",
    "Économie agricole & Financement",
    "Formation & Vulgarisation"
  ],
  filieres: [
    "Riz", "Coton", "Élevage", "Pêche", "Maraîchage", "Arboriculture", "Agro-industrie"
  ],
  pays: [
    "Sénégal", "Côte d'Ivoire", "Mali", "Burkina Faso", "Bénin"
  ],
  niveaux: [
    "Junior", "Confirmé", "Senior", "Expert international"
  ],
  disponibilites: [
    "Disponible", "En mission", "Indisponible"
  ]
};

const EXPERTS = [
  {
    id: "EXP-0001",
    prenom: "Awa",
    domaine: "Agronomie & Production végétale",
    filiere: "Riz",
    fonction: "Agronome spécialiste riziculture irriguée",
    niveau: "Senior",
    experience: 14,
    pays: "Sénégal",
    region: "Vallée du fleuve Sénégal",
    langues: ["Français", "Wolof", "Anglais"],
    competences: ["riziculture irriguée", "itinéraires techniques", "essais variétaux"],
    missions: 22,
    disponibilite: "Disponible"
  },
  {
    id: "EXP-0002",
    prenom: "Moussa",
    domaine: "Irrigation & Génie rural",
    filiere: "Maraîchage",
    fonction: "Ingénieur en irrigation goutte-à-goutte",
    niveau: "Expert international",
    experience: 19,
    pays: "Mali",
    region: "Ségou",
    langues: ["Français", "Bambara"],
    competences: ["irrigation goutte-à-goutte", "aménagement hydro-agricole", "gestion de l'eau"],
    missions: 31,
    disponibilite: "En mission"
  },
  {
    id: "EXP-0003",
    prenom: "Fatou",
    domaine: "Élevage & Santé animale",
    filiere: "Élevage",
    fonction: "Vétérinaire, spécialiste santé du bétail",
    niveau: "Confirmé",
    experience: 8,
    pays: "Burkina Faso",
    region: "Centre-Ouest",
    langues: ["Français", "Mooré"],
    competences: ["santé animale", "vaccination", "élevage pastoral"],
    missions: 11,
    disponibilite: "Disponible"
  },
  {
    id: "EXP-0004",
    prenom: "Kouassi",
    domaine: "Agro-industrie & Transformation",
    filiere: "Agro-industrie",
    fonction: "Expert en transformation agroalimentaire",
    niveau: "Senior",
    experience: 12,
    pays: "Côte d'Ivoire",
    region: "Abidjan",
    langues: ["Français", "Anglais"],
    competences: ["transformation cacao", "normes qualité", "chaîne du froid"],
    missions: 17,
    disponibilite: "Disponible"
  },
  {
    id: "EXP-0005",
    prenom: "Abdoulaye",
    domaine: "Économie agricole & Financement",
    filiere: "Coton",
    fonction: "Économiste, financement de projets agricoles",
    niveau: "Expert international",
    experience: 21,
    pays: "Bénin",
    region: "Borgou",
    langues: ["Français", "Anglais", "Fon"],
    competences: ["montage financier", "évaluation de projets", "bailleurs de fonds"],
    missions: 38,
    disponibilite: "Indisponible"
  },
  {
    id: "EXP-0006",
    prenom: "Aïcha",
    domaine: "Formation & Vulgarisation",
    filiere: "Maraîchage",
    fonction: "Spécialiste en vulgarisation agricole",
    niveau: "Confirmé",
    experience: 7,
    pays: "Sénégal",
    region: "Thiès",
    langues: ["Français", "Wolof"],
    competences: ["formation de formateurs", "vulgarisation", "approche genre"],
    missions: 9,
    disponibilite: "Disponible"
  },
  {
    id: "EXP-0007",
    prenom: "Ibrahim",
    domaine: "Agronomie & Production végétale",
    filiere: "Arboriculture",
    fonction: "Agronome, expert en arboriculture fruitière",
    niveau: "Senior",
    experience: 15,
    pays: "Mali",
    region: "Sikasso",
    langues: ["Français", "Bambara"],
    competences: ["arboriculture fruitière", "greffage", "lutte phytosanitaire"],
    missions: 20,
    disponibilite: "En mission"
  },
  {
    id: "EXP-0008",
    prenom: "Mariam",
    domaine: "Économie agricole & Financement",
    filiere: "Pêche",
    fonction: "Spécialiste économie des filières halieutiques",
    niveau: "Junior",
    experience: 3,
    pays: "Sénégal",
    region: "Saint-Louis",
    langues: ["Français", "Wolof"],
    competences: ["économie de la pêche", "chaînes de valeur", "études de marché"],
    missions: 2,
    disponibilite: "Disponible"
  }
];
