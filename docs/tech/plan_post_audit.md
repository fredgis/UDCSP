# UDCSP — Post-Audit Refactor Plan

> [!IMPORTANT]
> **Historical document.** This plan was executed in May 2026 to re-shape the stack after the architectural audit (suppress Azure SQL DB / Cosmos DB / Copilot Studio / Power BI Embedded ; add Verified ID, Priva, Confidential Ledger, Confidential Compute, Defender for APIs, DDoS Standard, Backup+ASR, Chaos Studio, Bastion, CIEM). All work landed; the live design is in [`architecture.md`](./architecture.md). This file is kept for audit traceability of *why* the stack diverges from the initial `plan.md`.


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
- [x] DAG installer cohérent (`Install-UDCSP.ps1 -TestOnly` passe → 25/25)
- [x] `markdown-link-check` propre sur tous les .md modifiés
- [x] README.md final propre avec paragraphe "Recommandations futures non implémentées" en bas
- [x] `agents.md` enrichi du run post-audit avec cumul wall-clock + sequential equivalent
- [x] Commit + push : refactor + 24 cycles d'audit itératif (voir §7)

---

## 6. Risques

| # | Risque | Mitigation |
|---|---|---|
| 1 | SA-4 (suppression Copilot Studio) casse les tests qui referencent `apps/copilot-studio/` | SA-4 met aussi à jour `tests/` qui le ciblent ; SA-7 met à jour `chat.md` qui le décrit |
| 2 | SA-1 (PostgreSQL) introduit une régression sur les drafts (Cosmos avait TTL natif) | PostgreSQL Flexible Server + extension `pg_partman` pour TTL via job ; Redis pour le vrai éphémère |
| 3 | SA-5 retire PBI Embedded mais des liens existent dans architecture.md | Orchestrator (§3) met à jour architecture.md en consequence |
| 4 | Conflit sur `governance/identity/eudi-wallet-readiness.md` entre SA-3 et SA-7 | Frontière déclarée : SA-3 owns ce fichier, SA-7 ne touche que `docs/biz/*` |
| 5 | DAG installer cassé si un module manque | Orchestrator regen toujours en dernier après les SA, smoke `-TestOnly` validatif |

---

## 7. Cycles d'audit itératifs (post-refactor)

Une fois le refactor de §1-§6 livré, le commanditaire a demandé : *« on va faire ça jusqu'à ne plus rien trouver »*. 24 cycles d'audit indépendants ont été exécutés jusqu'à atteindre une manche entièrement propre.

### 7.1 Méthodologie

Chaque cycle (à partir de r11) lance **3 sous-agents Haiku en parallèle**, frontières strictes :

| Agent | Périmètre | Sévérités cherchées |
|---|---|---|
| **code-audit** | `apps/` + `services/` (TS/JS/Python/JSON) | runtime crashes, validation manquante, races, type-safety bypasses exploitables |
| **docs-audit** | `docs/`, `README.md`, tous les `*.md` | counts faux, cross-refs cassés, services supprimés mentionnés en actif |
| **installer-audit** | `scripts/install/` + `infra/` + `apps/voice/scripts/` | RG mismatches, scope mismatches, params manquants, env-name drift |

**Filtre anti-hallucination** : chaque prompt embarque la liste cumulative des faux-positifs déjà rejetés (7 patterns finaux : Bicep `targetScope` implicite, `resourceGroup(name)` overload sub-scope, fichier `recovery-services-vault.bicep` orphelin, SKU blocks non lus = KNOWN-DEFERRED, hashtables case-insensitive, `res.json()` auto-chaining, bracket-access TS `private`). Toute citation est vérifiée par `view`/`grep` avant correction.

**Critère d'arrêt** : un cycle retourne `CLEAN` sur les 3 surfaces simultanément.

### 7.2 Tableau récapitulatif

| Round | Commit | Agents | Defects appliqués | Sévérité | Validation |
|---|---|---|---|---|---|
| r6 | `a863002` | 3 | drop dead `Deploy-*` scripts, fix Apim DAG, policy teardown | P1 | 25/25 |
| r7 | `3fdeb24` | 3 | d365 escalation operationId, Hans persona scenarioId, DAG line-range | P1 | 25/25 |
| r8 | `1c783f0` | 3 | align D8/D9/D10 personas + Defender pricing teardown | P1 | 25/25 |
| r9 | `0848978` | 3 | wire orphan eventgrid bicep + 3 named-values + Cosmos doc | P1×3 | 25/25 |
| r10 | `2fd81fd` + `ff8786b` | 3 | required Bicep params apim+logic-apps + Apim block dans config template | P0 | 25/25 |
| r11 | `9740205` | 3 | **9 modules** : `Invoke-AzSubDeployment` → `Invoke-AzGroupDeployment` (mismatch targetScope systémique) | P0 systémique | 25/25 |
| r12 | `f63ed7e` | 3 | APIM named-values (18) + 10 policy-fragments câblés via `az rest PUT` ; Remove-UDCSP Purview ; README L248 | P0×3 | 25/25 |
| r13 | `9829fad` | 3 | Install-Apps + Install-Fabric : fallback `$envName` défensif | P1×2 | 25/25 |
| r14 | `39ddfc4` | 3 | 3 docs governance manquants + BackupAsr storage-redundancy env-aware | P1 | 25/25 |
| r15 | `e265678` | 3 | Deploy-Voice Step 0 (ACS resource bicep) + 4 `ContainsKey` défensifs | P1×5 | 25/25 |
| r16 | `3326973` | 3 | Bastion+Ddos VNet RG name + recovery-vault DK location (orphelin) | P1×3 | 25/25 |
| r17 | `56eaa1a` | 3 | CIEM tenant scope + Identity loop split + Postgres/Redis token substitution | P0×3 | 25/25 |
| r18 | `58abac7` | 3 | 6 bicepparam `env=prod` + RG/KV/LAW/subnet alignés ; README counts | P0×6 | 25/25 |
| r19 | `5e27823` | 3 | Install-Observability réécrit (LAW→AppI workloadName=shared anchored) ; ConfLedger LAW anchor ; Fabric case ; README §16 | P0×3 | 25/25 |
| r20 | `8f10a75` | 3 | Voice RG pre-create + standardisation `env='prod'` sur 8 modules + template default | P1×9 | 25/25 |
| r21 | `6a49eef` | 3 | BackupAsr RG renommé `udcsp-{c}-backup-asr-rg` (cohérence canonique) | P2 | 25/25 |
| r22 | `3027fbd` | 3 | mobile/offline/queue.ts try/catch JSON.parse ; deepLinks.ts validation pays runtime ; LogicApps L78 dead-code | P1×2 + P2 | 25/25 |
| r23 | `0a06120` | 3 | aca-eligibility-rules input validation 400 ; `$env`→`$envBicep` (auto-var shadowing) | P1 + P2 | 25/25 |
| **r24** | **— (CLEAN)** | **3** | **Aucun defect — première manche entièrement propre** | **✅** | **25/25** |

### 7.3 Statistiques

| Métrique | Valeur |
|---|---|
| Cycles d'audit total (r6 → r24) | **19 cycles** |
| Cycles avec pattern systématique 3-agents (r11 → r24) | **14 cycles** |
| Sous-agents Haiku lancés (3 × 19) | **57 runs** |
| Commits de correction (r6 → r23) | **19 commits** (r10 a 2 commits dont un follow-up template) |
| Cycles totalement propres | **1 (r24)** |
| Defects P0 systémiques (deploy bloquants) | **~28** |
| Defects P1 (bugs runtime, drifts) | **~30** |
| Defects P2 (cosmétique / cohérence) | **~5** |
| Hallucinations rejetées (cumulées) | **~25** (réémergeaient à chaque round → liste explicite dans chaque prompt) |
| Wall-clock cycles d'audit (r6 14:04 → r24 ~16:00) | **~2 h** |
| Équivalent séquentiel (3 agents × ~3 min × 19 cycles + corrections) | **~5-6 h** |
| Validation finale | `pwsh Install-UDCSP.ps1 -TestOnly -Environment dev` → **25/25 ✅** |

### 7.4 Patterns d'erreurs récurrents (apprentissages)

1. **Drift `env=prod` vs `env=dev`** — landing-zone bicepparam hardcodait `prod`, plusieurs modules fallback `dev` → noms de RG/LAW non joinables au runtime. Standardisé `prod` partout (r20).
2. **Bicep `targetScope` vs deploy helper** — `Invoke-AzSubDeployment` envoyé contre des modules à scope RG → 9 modules touchés en r11.
3. **APIM artefacts orphelins** — named-values & policy-fragments présents en repo mais jamais déployés ; câblés via `az rest PUT` en r12.
4. **Resource ID anchoring** — Observability créait LAW + AppI dans la même run sans capturer l'ID de la LAW pour AppI → r19.
5. **`ContainsKey` défensif vs accès direct** — modules cassent dès qu'une clé optionnelle (`Voice`, `Ciem`, `Environment`) manque dans la config opérateur.
6. **Hallucinations LLM persistantes** — 7 patterns réémergeaient à chaque round malgré filtre. Liste explicite + verification snippet obligatoire = mitigation efficace.

### 7.5 Watermark de rollback

État avant cycles d'audit : tag `pre-post-audit-refactor-2026-05-09` (rollback `git reset --hard pre-post-audit-refactor-2026-05-09`).
État après r24 : `main @ 0a06120` (HEAD post-r23, r24 = pas de commit car CLEAN).
