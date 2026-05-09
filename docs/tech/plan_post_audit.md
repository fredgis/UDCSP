# UDCSP — Post-Audit Refactor Plan

> **Watermark git** : `pre-post-audit-refactor-2026-05-09` (rollback possible avec `git reset --hard pre-post-audit-refactor-2026-05-09`).
>
> Plan d'exécution multi-agent du refactor post-audit. Companion log : [`agents.md`](./agents.md) §11.

---

## 1. Objectif du refactor

Suite à l'audit architectural ("quels services Azure remplacer / ajouter / supprimer si on était libre du choix"), le commanditaire a retenu :

- **4 suppressions** (Azure SQL, Cosmos DB, Copilot Studio, Power BI Embedded *citizen-facing*)
- **9 ajouts** (Verified ID, Priva, Confidential Ledger, Confidential Compute, Defender for APIs, DDoS Protection Standard, Backup + Site Recovery, Chaos Studio, Bastion + CIEM)
- **2 remplacements *non* implémentés** (D365 → Camunda, Logic Apps → Camunda) : restent cités en bas du README comme recommandations futures.

---

## 2. Diff de stack

### 2.1 Suppressions

| Service supprimé | Remplacé par | Pourquoi |
|---|---|---|
| **Azure SQL Database** | **Azure Database for PostgreSQL Flexible Server** (3 instances, une par pays) | Standard de fait dans l'admin publique nordique ; open-source ; JSONB couvre les besoins schemaless ; portable hors-Azure si trajectoire EU Sovereign Cloud. |
| **Azure Cosmos DB** | **Azure Cache for Redis Enterprise** (drafts éphémères + slot-filling + session) **+ PostgreSQL JSONB** (drafts persistés > 24 h) | Cosmos était surdimensionné pour TTL drafts/cache. Redis fait ça nativement à 1/5 du coût. |
| **Microsoft Copilot Studio** | Topics absorbés dans **agents Foundry** (`citizen-assistant` étendu + nouvel agent `topic-router`) | Suppression d'un cerveau redondant ; un seul plan d'orchestration côté Foundry ; moins de connecteurs à gérer ; trace unifiée. |
| **Power BI Embedded *citizen-facing*** | Composants **HTML/JS** custom (Chart.js + React wrappers) servis par `apps/web` | Power BI **Premium** est conservé pour les usages internes (ops/exec/auditeur). Pour les citoyens, du HTML léger suffit, sans license Embedded ni iframe Power BI lourde. |

### 2.2 Ajouts

| Service ajouté | Pour quoi | Folder cible |
|---|---|---|
| **Microsoft Entra Verified ID** | Émission/vérification VC/VP — passe l'EUDI Wallet de "readiness" à "actif" pour eIDAS 2.0 | `infra/identity/verified-id/` |
| **Microsoft Priva** | DSR GDPR (Art. 15-22) industrialisés ; remplace la logique custom Logic Apps | `governance/priva/` |
| **Azure Confidential Ledger** | Registre AI Act Art. 26(6) tamper-evident ; lineage Foundry immuable | `infra/security/confidential-ledger/` |
| **Azure Confidential Computing** | TEE pour l'agent Eligibility (high-risk AI Act) ; confidentialité du prompt cross-border | `infra/security/confidential-compute/` |
| **Microsoft Defender for APIs** | Runtime protection sur APIM (porte d'entrée des 47 portails consolidés) | `infra/security/defender/` (extension) |
| **Azure DDoS Protection Standard** | L3/L4 dédié au-delà du L7 Front Door ; attendu en NIS2 pour 2,1 M citoyens | `infra/security/ddos/` |
| **Azure Backup + Azure Site Recovery** | BCDR explicite par zone souveraine ; trou majeur en audit ISO 27001 / NIS2 | `infra/security/backup-asr/` |
| **Azure Chaos Studio** | Preuve continue du SLO 99,9 % annoncé en architecture §11 | `infra/security/chaos-studio/` |
| **Azure Bastion** | Accès admin sans jump boxes ni IP publiques | `infra/identity/bastion/` |
| **Microsoft Entra Permissions Management** (CIEM) | Audit cross-tenant des 3 zones souveraines | `infra/identity/ciem/` |

### 2.3 Remplacements *non implémentés* (cités au README seulement)

| Actuel (gardé) | Remplacement futur recommandé | Pourquoi pas maintenant |
|---|---|---|
| Dynamics 365 Customer Service | Camunda 8 (BPMN/DMN) + UI caseworker custom | Sortie de lock-in à 24 mois ; scope hors de ce refactor (changement structurel majeur, ré-écriture complète du back-office case management). |
| Azure Logic Apps | Camunda 8 / Zeebe | Cohérent avec D365→Camunda ; à entreprendre dans la même initiative. |

---

## 3. Sous-agents et isolation par dossier

7 sous-agents lancés en **parallèle**, chacun avec une **frontière de dossier stricte** (zéro recouvrement).

| ID | Sous-agent | Dossiers possédés (write) | Dossiers lus (read-only) |
|---|---|---|---|
| **SA-1** | `data-refactor` | `infra/data/postgresql/` (NEW), `infra/data/redis/` (NEW), `infra/data/cosmos/` (DELETE) | `infra/landing-zone/`, `docs/tech/data.md` |
| **SA-2** | `security-additions` | `infra/security/{confidential-ledger,confidential-compute,ddos,backup-asr,chaos-studio}/` (NEW), `infra/security/defender/` (UPDATE pour Defender for APIs) | `infra/landing-zone/`, `infra/security/{azure-policy,sentinel}/` |
| **SA-3** | `identity-additions` | `infra/identity/{verified-id,bastion,ciem}/` (NEW), `governance/identity/eudi-wallet-readiness.md` (UPDATE) | `infra/identity/{entra,external-id}/` |
| **SA-4** | `copilot-into-foundry` | `apps/copilot-studio/` (DELETE), `foundry/agents/citizen-assistant/` (UPDATE), `foundry/agents/topic-router/` (NEW) | Tous les autres `foundry/agents/*` |
| **SA-5** | `pbi-embedded-to-html` | `apps/web/src/components/insights/` (NEW), `apps/web/src/api/insights.ts` (NEW), `data/fabric/power-bi/citizen-facing/` (DELETE si présent) | `data/fabric/`, `apps/web/src/` |
| **SA-6** | `priva-gdpr` | `governance/priva/` (NEW), `services/logic-apps/workflows/gdpr-data-erase/` (UPDATE pour déléguer à Priva), `governance/gdpr/ropa.md` (UPDATE) | `governance/gdpr/`, `services/logic-apps/workflows/` |
| **SA-7** | `docs-biz` | `docs/biz/{ai,web,mobile,voice,chat,sms,email,caseworker,datacompliance,uses}.md` | Tout le reste en read-only |

### Orchestrator (cette session) :
- `docs/tech/plan_post_audit.md` (ce fichier)
- `docs/tech/{architecture,plan,data,installation,recipe,agents}.md`
- `README.md` (clean rewrite + paragraphe Camunda)
- `scripts/install/Install-UDCSP.ps1`
- `scripts/install/modules/*.psm1` (rename/remove `Install-CopilotStudio.psm1` ; add new modules pour Verified ID, Priva, Confidential Ledger, Confidential Compute, Backup+ASR, Chaos, DDoS, Bastion, CIEM ; update DAG)
- `scripts/install/config/udcsp.config.template.psd1`
- `.github/workflows/` (mises à jour)

---

## 4. DAG d'installation post-refactor

Nouveaux phases ajoutées au `Install-UDCSP.ps1` (voir tableau §4 du plan original).

| Wave | Phase | Dépendances | Module |
|---|---|---|---|
| 0 | LandingZone | — | `Install-LandingZone.psm1` |
| 1 | Identity | LandingZone | `Install-Identity.psm1` |
| 1 | **VerifiedId** *(NEW)* | Identity | `Install-VerifiedId.psm1` |
| 1 | **Bastion** *(NEW)* | LandingZone | `Install-Bastion.psm1` |
| 1 | **Ciem** *(NEW)* | Identity | `Install-Ciem.psm1` |
| 1 | Security | LandingZone | `Install-Security.psm1` |
| 1 | **Ddos** *(NEW)* | LandingZone | `Install-Ddos.psm1` |
| 1 | **BackupAsr** *(NEW)* | LandingZone | `Install-BackupAsr.psm1` |
| 1 | **ConfidentialLedger** *(NEW)* | Security | `Install-ConfidentialLedger.psm1` |
| 1 | **ChaosStudio** *(NEW)* | Security | `Install-ChaosStudio.psm1` |
| 1 | Observability | LandingZone | `Install-Observability.psm1` |
| 1 | Fabric | LandingZone | `Install-Fabric.psm1` |
| 1 | **Postgres** *(NEW, replaces Cosmos)* | LandingZone, Security | `Install-Postgres.psm1` |
| 1 | **Redis** *(NEW, replaces Cosmos)* | LandingZone, Security | `Install-Redis.psm1` |
| 1 | SyntheticData | Fabric | `Install-SyntheticData.psm1` |
| 2 | Foundry | Identity, Security, Fabric | `Install-Foundry.psm1` |
| 2 | **ConfidentialCompute** *(NEW)* | Foundry, ConfidentialLedger | `Install-ConfidentialCompute.psm1` |
| 2 | Apim | Identity, LandingZone | `Install-Apim.psm1` |
| 2 | LogicApps | Apim, Foundry | `Install-LogicApps.psm1` |
| 2 | D365 | Identity, LogicApps | `Install-D365.psm1` |
| 3 | Apps | Identity, Apim, **Postgres**, **Redis** | `Install-Apps.psm1` |
| 3 | Voice | LogicApps | `Install-Voice.psm1` |
| 3 | ~~CopilotStudio~~ *(REMOVED — absorbed into Foundry)* | — | — |
| 4 | Purview | Fabric, D365, Foundry | `Install-Purview.psm1` |
| 4 | **Priva** *(NEW)* | Purview | `Install-Priva.psm1` |
| 4 | QA | Apps, Voice, Purview, Priva, ConfidentialCompute | `Install-QA.psm1` |

10 nouvelles phases, 1 supprimée, dépendances mises à jour.

---

## 5. Critères de "done"

- [x] Watermark git créé : `pre-post-audit-refactor-2026-05-09`
- [x] Toutes les SA-1 à SA-7 ont rendu (status ✅)
- [x] DAG installer cohérent (`Install-UDCSP.ps1 -TestOnly` passe)
- [ ] `markdown-link-check` propre sur tous les .md modifiés
- [ ] README.md final propre avec paragraphe "Recommandations futures non implémentées" en bas
- [ ] `agents.md` enrichi du run post-audit avec cumul wall-clock + sequential equivalent
- [ ] Commit + push avec message `refactor(post-audit): -SQL/-Cosmos/-CopilotStudio/-PBIEmbedded; +VerifiedID/+Priva/+ConfLedger/+ConfCompute/+DefenderAPIs/+DDoS/+Backup+ASR/+Chaos/+Bastion/+CIEM`

---

## 6. Risques

| # | Risque | Mitigation |
|---|---|---|
| 1 | SA-4 (suppression Copilot Studio) casse les tests qui referencent `apps/copilot-studio/` | SA-4 met aussi à jour `tests/` qui le ciblent ; SA-7 met à jour `chat.md` qui le décrit |
| 2 | SA-1 (PostgreSQL) introduit une régression sur les drafts (Cosmos avait TTL natif) | PostgreSQL Flexible Server + extension `pg_partman` pour TTL via job ; Redis pour le vrai éphémère |
| 3 | SA-5 retire PBI Embedded mais des liens existent dans architecture.md | Orchestrator (§3) met à jour architecture.md en consequence |
| 4 | Conflit sur `governance/identity/eudi-wallet-readiness.md` entre SA-3 et SA-7 | Frontière déclarée : SA-3 owns ce fichier, SA-7 ne touche que `docs/biz/*` |
| 5 | DAG installer cassé si un module manque | Orchestrator regen toujours en dernier après les SA, smoke `-TestOnly` validatif |
