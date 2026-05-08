# DPIA — Eligibility AI Pre-Assessor

1. **Processing overview:** AI pre-assesses residency/tax/benefit eligibility and routes recommendations to human caseworkers.
2. **Controller/processors:** DK/SE/NO agencies are controllers; platform operators and Microsoft cloud services are processors/sub-processors.
3. **Purpose/lawful basis:** Public task; automate triage while preserving human decision authority.
4. **Data subjects:** Citizens applying for services, including vulnerable groups and cross-border applicants.
5. **Data:** Application facts, uploaded documents, identity assurance claims, case history, model traces.
6. **Flows:** Country zone → APIM → Foundry Eligibility → Logic Apps → D365; raw PII remains in sovereign zone.
7. **Necessity/proportionality:** Uses minimum claims and purpose-bound tokens; no fully automated adverse decisions.
8. **Risks:** Bias by language/country, over-reliance by caseworkers, inaccurate document extraction, excessive retention.
9. **Controls:** Human oversight, Foundry evals, Sentinel alerts, private endpoints, CMK roadmap, RBAC/PIM, audit logs.
10. **Retention:** Traces retained per legal schedule; anonymised eval samples only after DPIA approval.
11. **Transparency/rights:** Citizens receive plain-language explanation and appeal route.
12. **Consultation:** DPO, national DPAs, disability advocates, caseworker unions before production.
13. **Residual risk:** High-risk under EU AI Act; requires conformity evidence and quarterly review.
