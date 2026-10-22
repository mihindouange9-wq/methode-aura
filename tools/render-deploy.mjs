// Crée (ou retrouve) le site statique MÉTHODE AURA sur Render par l'API publique, sans passer par le tableau de bord.
// Reflète render.yaml : si l'un change, mettre l'autre à jour.
//
// Usage : RENDER_API_KEY=rnd_xxx node tools/render-deploy.mjs
// La clé se crée dans Render → Account Settings → API Keys (https://dashboard.render.com/u/settings#api-keys).
// Elle n'est jamais écrite sur le disque : la passer dans l'environnement du processus uniquement.

const API = "https://api.render.com/v1";
const KEY = process.env.RENDER_API_KEY;
if (!KEY) {
  console.error("RENDER_API_KEY manquante dans l'environnement.");
  process.exit(1);
}

const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const REPO = "https://github.com/mihindouange9-wq/methode-aura";
const NAME = "methode-aura";

const headers = (path, name, value) => ({ path, name, value });
const SERVICE = {
  type: "static_site",
  name: NAME,
  repo: REPO,
  branch: "main",
  autoDeploy: "yes",
  serviceDetails: {
    buildCommand: "rm -rf dist && mkdir dist && cp -r index.html robots.txt css js assets dist/",
    publishPath: "dist",
    pullRequestPreviewsEnabled: "no",
    routes: [{ type: "rewrite", source: "/*", destination: "/index.html" }],
    headers: [
      headers("/assets/*", "Cache-Control", "public, max-age=31536000, immutable"),
      headers("/js/vendor/*", "Cache-Control", "public, max-age=31536000, immutable"),
      headers("/index.html", "Cache-Control", "public, max-age=0, must-revalidate"),
      headers("/css/*", "Cache-Control", "public, max-age=0, must-revalidate"),
      headers("/js/*.js", "Cache-Control", "public, max-age=0, must-revalidate"),
      headers("/*", "X-Content-Type-Options", "nosniff"),
      headers("/*", "X-Frame-Options", "DENY"),
      headers("/*", "Referrer-Policy", "strict-origin-when-cross-origin"),
      headers("/*", "Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"),
      headers("/*", "Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"),
      headers("/*", "Cross-Origin-Opener-Policy", "same-origin"),
      headers("/*", "Cross-Origin-Resource-Policy", "same-origin"),
      headers("/*", "X-Permitted-Cross-Domain-Policies", "none"),
      headers(
        "/*",
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests",
      ),
    ],
  },
};

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, Accept: "application/json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message = typeof data === "object" && data && data.message ? data.message : text;
    throw new Error(`${method} ${path} → ${res.status} ${message}`);
  }
  return data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const owners = await api("GET", "/owners?limit=20");
  const list = owners.map((o) => o.owner);
  if (!list.length) throw new Error("Aucun espace de travail visible avec cette clé.");
  const owner = list.find((o) => o.type === "user") || list[0];
  console.log(`Espace de travail : ${owner.name} (${owner.id}, ${owner.type})`);

  const existing = (await api("GET", `/services?name=${NAME}&ownerId=${owner.id}&limit=20`)).map((s) => s.service);
  let service = existing.find((s) => s.name === NAME && s.type === "static_site");
  let deployId;

  if (service) {
    console.log(`Service existant : ${service.id} → ${service.serviceDetails?.url ?? ""}`);
    const deploy = await api("POST", `/services/${service.id}/deploys`, { clearCache: "do_not_clear" });
    deployId = deploy.id;
    console.log(`Nouveau déploiement demandé : ${deployId}`);
  } else {
    console.log(`Création du site statique « ${NAME} » depuis ${REPO} (branche main)…`);
    const created = await api("POST", "/services", { ...SERVICE, ownerId: owner.id });
    service = created.service;
    deployId = created.deployId;
    console.log(`Service créé : ${service.id}`);
    console.log(`Adresse : ${service.serviceDetails?.url ?? "(en attente)"}`);
    console.log(`Premier déploiement : ${deployId}`);
  }

  // Suivi du déploiement jusqu'à l'état final.
  const started = Date.now();
  let status = "";
  while (Date.now() - started < 12 * 60 * 1000) {
    const deploy = await api("GET", `/services/${service.id}/deploys/${deployId}`);
    if (deploy.status !== status) {
      status = deploy.status;
      console.log(`  ${new Date().toLocaleTimeString("fr-FR")}  ${status}`);
    }
    if (status === "live") break;
    if (/failed|canceled|deactivated/.test(status)) {
      throw new Error(`Déploiement terminé en état « ${status} ». Journal : https://dashboard.render.com/static/${service.id}/deploys/${deployId}`);
    }
    await sleep(8000);
  }
  if (status !== "live") throw new Error("Délai dépassé : le déploiement n'a pas atteint l'état « live » en 12 minutes.");

  const url = service.serviceDetails?.url ?? "https://methode-aura.onrender.com";
  console.log(`\nEn ligne : ${url}`);
  console.log(`Tableau de bord : https://dashboard.render.com/static/${service.id}`);
}

main().catch((error) => {
  console.error(`\nÉchec : ${error.message}`);
  if (/repo|repository|github|access|permission/i.test(error.message)) {
    console.error(
      "Render n'a pas accès au dépôt privé. Autoriser l'application GitHub de Render sur « methode-aura » :\n  https://github.com/apps/render/installations/new\nou rendre le dépôt public le temps du déploiement : gh repo edit mihindouange9-wq/methode-aura --visibility public",
    );
  }
  process.exit(1);
});
