# evfta.eu — MVP Build Specification

**For the Vietnam engineering team**

## 1. How to use this document

This is the functional and technical scope for the MVP. It is organized by priority, not by build order alone — every module is tagged so the team always knows what is negotiable and what is not.

| **Tag** | **Meaning**                                                               |
| ------- | ------------------------------------------------------------------------- |
| **P0**  | Must ship. The MVP does not exist without this. No cutting.               |
| **P1**  | Should ship if timeline allows. Cut first if the schedule slips.          |
| **P2**  | Explicitly out of scope for MVP. Listed so nobody accidentally builds it. |

The rule for the whole 3 months: **when in doubt, protect P0, cut P1, never touch P2.** The milestone that unlocks the next funding round depends on P0 shipping completely and working reliably — not on how many features exist.

## 2. What the MVP has to prove

By the end of month 3, the platform must demonstrably do four things:

1.  A Vietnamese exporter can, in under 10 minutes, discover how much money they are losing on tariffs, generate a usable compliance document, and get listed as verified.

2.  An EU buyer can find a verified Vietnamese exporter relevant to what they need, in their own language, faster than any alternative.

3.  The compliance AI answers real trade-compliance questions with cited sources — not confident nonsense.

4.  50–100 real companies are verified and active, and 2–3 have signed on as reference pilots.

Measure every design and engineering decision against whether it moves the platform toward these four proof points. Nothing else matters for this phase.

## 3. User roles

| **Role**                    | **Who**                                               | **Core need**                                                                             |
| --------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Exporter**                | Vietnamese company selling goods/services into the EU | Be found, get verified, save on tariffs, get compliance done easily                       |
| **Buyer**                   | EU company sourcing from Vietnam                      | Find verified suppliers fast, trust what they see, communicate without a language barrier |
| **Admin / Ops**             | The platform team                                     | Verify companies, moderate content, monitor AI answers, manage the compliance corpus      |
| **Guest (unauthenticated)** | Anyone                                                | Use the free compliance calculators with no login required                                |

The Guest role matters as much as the two paying roles — it is the free entry point. No feature-gating the calculators behind signup. That single decision is the difference between a lead magnet and a locked door.

## 4. Core data model

This is not a database schema — it is the entity list and key fields the schema must support. The dev team chooses the actual implementation (relational database is strongly recommended for this kind of structured, auditable data).

### 4.1 User

id, email, phone, password_hash, role (exporter/buyer/admin), preferred_language, created_at, last_login_at

### 4.2 Company

id, user_id (owner), legal_name, country, registration_number, tax_id, company_type (exporter/buyer), industry_sector, hs_codes[] (product categories they trade), languages_spoken[], verification_status (unverified/pending/verified/rejected), verification_level (basic/EVFTA-verified), verified_at, profile_completeness_score, logo_url, description_vn, description_en, website, created_at

### 4.3 Product (exporter listings)

id, company_id, name, hs_code, description_vn, description_en, unit_price_range, minimum_order_quantity, certifications[], images[], is_active, created_at

### 4.4 ComplianceCheck (every calculator run — this table is a strategic asset, log everything)

id, company_id (nullable, for guest use), hs_code, product_value, origin_country, destination_country, mfn_duty_rate, evfta_duty_rate, savings_amount, regional_value_content_pct, originating_status (pass/fail/inconclusive), created_at

### 4.5 Document (generated compliance paperwork)

id, company_id, document_type (C/O_draft, RoO_report), related_compliance_check_id, file_url, status (draft/finalized), created_at

### 4.6 VerificationRequest

id, company_id, submitted_documents[], reviewer_admin_id, status, review_notes, submitted_at, reviewed_at

### 4.7 Conversation / Message

**Conversation:** id, participant_company_ids[], created_at

**Message:** id, conversation_id, sender_company_id, body_original, body_translated, original_language, translated_language, sent_at, read_at

### 4.8 SavedSearch / MatchAlert

id, company_id, search_criteria (json: hs_codes, countries, keywords), created_at, last_notified_at

### 4.9 Notification

id, user_id, type (new_match/message/verification_status/expiry_alert/compliance_update), payload (json), is_read, created_at

### 4.10 AIQuery (Compliance Co-Pilot interaction log — also a strategic asset)

id, user_id (nullable for guest), question_text, answer_text, cited_sources[], confidence_score, was_helpful (user feedback), escalated_to_human (bool), created_at

### 4.11 AuditLog (compliance-sensitive actions, required for trust and any future legal scrutiny)

id, actor_id, action_type, entity_type, entity_id, before_state, after_state, created_at

## 5. Module-by-module functional specification

### 5.1 Onboarding & Authentication — **P0**

- Email + password signup, with phone number capture (used for WhatsApp/Zalo-style notifications later).

- Role selection at signup: Exporter or Buyer. This determines the entire subsequent UX — do not build one generic dashboard for both.

- Language selection at signup (Vietnamese / English for MVP), changeable anytime.

- Company creation flow immediately follows account creation — a user account with no company attached should not be a dead end; prompt to complete the company profile.

- **Acceptance criteria:** a new user can go from landing page to a saved, incomplete company profile in under 3 minutes, on mobile and desktop.

### 5.2 Company Profiles — **P0**

**Exporter profile fields:** legal name, registration number, tax ID, HS codes traded, product categories, certifications held (upload), company description (bilingual), photos/logo, years in operation, export markets already served, languages spoken by staff.

**Buyer profile fields:** legal name, country, industry, sourcing categories of interest, company size, procurement volume estimate.

**Profile completeness score** — a visible percentage (e.g. "68% complete") with a clear list of what's missing. This is the first habit-forming mechanic: an incomplete profile nags the user to return and finish it. Build this from day one, it is cheap and high-leverage.

**Acceptance criteria:** profile data is structured (not free-text blobs) so it can be filtered and searched later. Every field that will be used in search/matching (Section 5.5) must be a structured field, not embedded in a description paragraph.

### 5.3 Compliance Calculators — **P0, this is the most important module in the MVP**

Three connected tools, usable without login (guest mode), with results saved to ComplianceCheck:

**a) Tariff Savings Calculator**

- Input: HS code (searchable dropdown/autocomplete, not free text — users don't know their HS code by heart, help them find it), product value, destination EU country.

- Output: current MFN duty rate vs. EVFTA preferential rate, the euro difference, and an annualized projection if the user enters shipment frequency.

- Display this as a large, unmissable number. This is the hook — design it to be screenshot-worthy.

**b) Rules-of-Origin Calculator**

- Input: HS code, ex-works price, list of input materials with origin country and value each.

- Logic: calculate non-originating materials percentage against the ex-works price, compare to the allowed threshold for that HS code's Product-Specific Rule.

- Output: Pass / Fail / Inconclusive (inconclusive when the PSR for that code requires expert review — be honest when the tool cannot give a clean answer).

- **Scope constraint:** the legal corpus for MVP covers the top 50 HS codes by Vietnam-EU trade volume (agriculture, food, textiles, footwear are the priority — confirm the exact 50 with the trade-law researcher in week 1). Codes outside this set show "not yet supported — contact us" rather than a wrong answer. **Never guess on compliance logic.**

**c) Certificate of Origin (EUR.1) Draft Generator**

- Input: pulls from the company profile + the RoO calculation result + basic invoice data (product, quantity, value, buyer details).

- Output: a pre-filled PDF in the official EUR.1 layout, clearly watermarked **"DRAFT — for review before submission to issuing authority."**

- **Critical product decision, confirm before building:** this tool pre-fills the document. It does not — and must not claim to — issue an official, legally valid Certificate of Origin. Official issuance still goes through the Vietnamese Chamber of Commerce (VCCI) or authorized body. Making this boundary explicit in the UI protects the company from liability and manages user expectations correctly.

**Acceptance criteria:** all three tools work end-to-end with real data for the 50 supported HS codes, verified against actual EVFTA tariff schedules by the trade-law reviewer before launch — this validation step is not optional and should be budgeted as real time in the sprint plan (see Section 9).

### 5.4 Compliance Co-Pilot (AI) v1 — **P0**

A retrieval-augmented chat assistant, not a fine-tuned model at this stage — that is the correct, cheaper, more controllable architecture for v1.

**How it must work:**

1.  A curated corpus is assembled: EVFTA treaty text, the Rules of Origin protocol, the product-specific rules for the 50 supported HS codes, common FAQ answers reviewed by the trade-law researcher, and (as a reference layer, not primary source) EU Customs guidance.

2.  User asks a question in natural language (Vietnamese or English).

3.  The system retrieves the most relevant corpus passages and generates an answer **grounded only in those passages.**

4.  Every answer displays its source citation (which treaty article, which schedule) — visibly, not buried.

5.  A confidence indicator accompanies every answer: **High / Medium / Low confidence**, or "outside supported scope — recommend contacting a trade compliance advisor."

**Non-negotiable safety requirement:** when the system cannot ground an answer confidently in the corpus, it must say so and offer to escalate to a human reviewer — it must never fabricate a confident-sounding answer to a question outside its verified scope. This is a legal and reputational risk control, not a nice-to-have. Log every interaction to AIQuery and review a sample weekly during the pilot phase.

**Acceptance criteria:** tested against a set of 50 real trade-lawyer-reviewed Q&A pairs before launch, with accuracy and citation-correctness measured explicitly. The trade-law researcher signs off on the eval set, not just the engineering team.

### 5.5 Directory & Search — **P0**

- Buyers can browse and filter verified exporters by HS code / product category, country, certification, and keyword.

- Exporters appear in search **only once verified** (unverified profiles are not publicly listed — protects the trust layer from day one).

- Each result shows: company name, verification badge, product categories, country, a short bilingual description, and a "Request Quote" action.

- **Acceptance criteria:** search returns results in under 2 seconds for a directory of up to 500 companies; filtering by HS code and country works correctly against the structured profile fields from Section 5.2.

### 5.6 Matching (basic, rule-based) — **P1**

Full AI-powered natural-language matching (Section 4 of the AI vertical discussion) is explicitly **P2 for this phase** — too heavy for the timeline. What ships instead:

- A buyer can save a search (HS code + country + keywords).

- When a new exporter matching that saved search is verified, the buyer gets a notification (Section 5.9).

- This is rule-based matching, not AI matching — simple, reliable, cheap to build, and it delivers real value.

**Acceptance criteria:** a saved search correctly triggers a notification within 24 hours of a matching company being verified.

### 5.7 Messaging & RFQ — **P0**

- A buyer can send a structured Request for Quote to an exporter: product, quantity, target price, delivery terms, message.

- Basic threaded conversation view per company-pair.

- **Machine translation integrated into every message** — the sender writes in their language, the recipient reads in theirs, both versions are stored (body_original, body_translated). Use a reliable third-party translation API for MVP; do not attempt to build custom translation.

- Email notification when a new message arrives (not everyone will check the platform daily yet — email is the bridge).

**Acceptance criteria:** a full RFQ-to-reply cycle is achievable in-platform for both a Vietnamese-only and an English-only speaker.

### 5.8 Dashboard — **P0, this is the habit-formation engine, do not treat it as a summary page**

Different dashboards for Exporter vs Buyer, each showing something that changes regularly:

**Exporter dashboard:** profile completeness and what's missing; number of profile views this week; new RFQs received; verification status and expiry countdown; a "your tariff savings so far" running total from calculator use; recent Compliance Co-Pilot questions asked.

**Buyer dashboard:** saved searches and new matches; recent RFQs sent and their status; recently viewed suppliers; a "verified suppliers added this week in your categories" feed.

**Acceptance criteria:** the dashboard shows at least one piece of genuinely new information on 90% of return visits during the pilot phase — this is the metric that proves the habit mechanic is working, track it.

### 5.9 Notifications — **P0**

- In-platform notification center (bell icon, unread count).

- Email notifications for: new message, new RFQ, verification status change, saved-search match, verification expiry approaching.

- **Acceptance criteria:** every notification type in Section 4.9's data model actually fires correctly and links to the relevant page.

### 5.10 Admin / Verification Back-Office — **P0**

This is an internal tool, not public-facing — keep the UI simple, prioritize function over polish.

- Queue of pending verification requests with submitted documents visible.

- Admin can approve, reject (with reason), or request more information.

- Admin can view and moderate any company profile or product listing.

- Admin can view flagged/low-confidence AI Co-Pilot answers for review (this is how the team catches AI mistakes before they cause real harm).

- Simple internal dashboard: total verified companies, pending queue size, AI queries this week, average confidence score.

**Acceptance criteria:** an admin can take a submitted company from "pending" to "verified" in under 5 minutes, with the decision and reasoning logged to AuditLog.

## 6. Non-functional requirements

| **Requirement**           | **Standard for MVP**                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Languages**             | Vietnamese and English fully supported across UI, calculators, and Co-Pilot. Document generation (C/O) should support bilingual output where the official form allows. Additional languages (German, French, Czech, Dutch) are explicitly P2, deferred to the seed-funded phase.                                                        |
| **Data protection**       | EU buyer personal and company data must be handled to GDPR-compatible standards from day one — even if full EU data-residency infrastructure is a later investment, the _practices_ (consent capture, data minimization, right-to-delete capability) must exist now. Retrofitting compliance is far more expensive than building it in. |
| **Security**              | Passwords hashed (never stored plain), HTTPS everywhere, role-based access control enforced server-side (not just hidden in the UI), rate-limiting on the public calculator endpoints to prevent abuse.                                                                                                                                 |
| **Performance**           | Public pages (calculators, directory) load in under 3 seconds on a standard mobile connection — many Vietnamese SME users are on mobile, not desktop.                                                                                                                                                                                   |
| **Auditability**          | Every compliance-relevant action (verification decisions, AI answers, document generation) is logged with who/what/when. This matters for trust and for any future dispute.                                                                                                                                                             |
| **Mobile responsiveness** | Full functionality on mobile web for the Exporter-side flows in particular — do not assume desktop-only usage.                                                                                                                                                                                                                          |

## 7. Explicitly out of scope for MVP — **P2**

Naming these clearly prevents scope creep, which is the single biggest threat to a \$111,111 budget:

- Full AI-powered natural-language matching (rule-based matching only, Section 5.6)

- Trade finance, escrow, or payment processing of any kind

- Logistics/freight booking or integration

- Voice AI / voice agents

- ESG / CSRD / EUDR verification tooling

- EVIPA / investment-matching features

- Official, legally-binding Certificate of Origin issuance (draft generation only)

- More than 2 platform languages

- Native mobile apps (responsive web only)

- Any payment or subscription billing system (verification and access are free during the pilot; monetization mechanics are a seed-phase build)

If a pilot user or a VYBE stakeholder requests any of the above during the build, the answer is: "that's on the seed-phase roadmap" — not a scope addition to the current sprint.

## 8. Suggested technical architecture

Described at the pattern level — the Vietnam engineering lead should choose the specific stack based on team expertise, but the shape should be:

- **Frontend:** a responsive web application (works well on both mobile and desktop browsers), separate views/flows for Exporter and Buyer roles.

- **Backend:** a REST or GraphQL API layer with clear separation between public endpoints (calculators, directory search — no auth required) and authenticated endpoints (profiles, messaging, dashboard).

- **Database:** a relational database for all structured data (companies, products, compliance checks, messages, verification records) — the auditability and query-filtering needs in this spec strongly favor relational over document-store as the primary data layer.

- **AI / Co-Pilot layer:** a retrieval pipeline — corpus documents chunked and embedded into a vector store, a retrieval step against user questions, and a generation step constrained to cite retrieved sources. This should be architecturally separate from the core application so the corpus and retrieval logic can be improved independently as the legal content grows.

- **Translation:** integrate a third-party translation API for the messaging module rather than building custom translation — not a differentiator worth custom engineering at this stage.

- **File storage:** for uploaded certifications, generated documents, and profile images.

- **Notification service:** email as the MVP baseline; architecture should allow adding SMS/Zalo notifications later without a rebuild.

## 9. Twelve-week sprint plan

| **Weeks** | **Focus**                        | **Key deliverable**                                                                                                                                                                                   |
| --------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1–2**   | Foundation                       | Data model built, auth + company profile CRUD working, UI shell for both roles, legal corpus collection begins (this is the bottleneck resource — start it immediately, in parallel with engineering) |
| **3–4**   | Compliance calculators           | Tariff Savings Calculator and Rules-of-Origin Calculator live and functioning for the first 20 HS codes                                                                                               |
| **5–6**   | Documents & verification         | C/O draft generator working; admin verification back-office v1 live; remaining 30 HS codes added (50 total)                                                                                           |
| **7–8**   | AI Co-Pilot                      | RAG pipeline built over the completed corpus; eval against the 50-question trade-lawyer-reviewed test set; confidence scoring live                                                                    |
| **9–10**  | Directory & connection           | Search/filter directory live; saved searches and match notifications; messaging with translation working end-to-end                                                                                   |
| **11**    | Dashboard, notifications, polish | Habit-forming dashboards for both roles; full notification suite; mobile responsiveness pass                                                                                                          |
| **12**    | Hardening & pilot onboarding     | Security review, load testing, bug fixes, onboard the first 50–100 verified companies and finalize the 2–3 signed pilots, prepare demo materials                                                      |

**Critical path warning:** the legal corpus (for both the RoO calculator and the AI Co-Pilot) is the resource most likely to slip, because it depends on the trade-law researcher's availability and the quality of source material, not just engineering hours. Start corpus work in week 1, not week 7. If the corpus is late, the AI Co-Pilot timeline slips directly — build in a 1-week buffer around weeks 7–8 specifically for this reason.

## 10. Team roles required

| **Role**                                    | **Allocation**                 | **Primary responsibility**                                                 |
| ------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------- |
| Senior full-stack engineer (technical lead) | Full-time, 3 months            | Architecture decisions, core application build, code review                |
| Mid-level engineer                          | Full-time, 3 months            | Feature build under technical lead's direction                             |
| AI/ML engineer                              | Part-time (≈ 50%), from week 5 | RAG pipeline, corpus embedding, eval framework                             |
| Trade-law researcher                        | Part-time (≈ 30%), from week 1 | Corpus assembly, RoO logic validation, AI eval sign-off                    |
| Founder / product owner                     | Full-time throughout           | Scope discipline, pilot relationships, weekly priority calls with the team |

The trade-law researcher role is the one most founders underweight — and the one most likely to determine whether the compliance tools are trustworthy or embarrassing. Do not treat this as an afterthought hire.

## 11. Definition of done — for the MVP as a whole

The build is complete, not when every listed feature technically exists, but when:

- A real Vietnamese exporter can go from first visit to a verified, listed profile with a working compliance document, unaided, in under 20 minutes.

- A real EU buyer can find that exporter, message them in English, and receive a translated reply, unaided.

- The Compliance Co-Pilot answers correctly and cites sources on the 50-question eval set at an accuracy bar the trade-law researcher signs off on.

- 50–100 companies are verified and active.

- 2–3 pilot users have signed on, are using the platform, and can speak to their experience on a call with a prospective investor.

## 12. Why this scope, and not more

Every module marked P2 in this document is a real, valuable feature that belongs on the roadmap — just not in this budget or this timeline. The seed round exists specifically to fund AI-powered matching, trade finance, ESG verification, and the rest of the seventeen-category platform. Building those now, with this budget, means building all of it badly instead of building the compliance wedge and trust layer excellently. Investors fund a narrow, working, trustworthy MVP far more readily than a broad, half-finished one. Discipline on scope is not a constraint on the vision — it is what gets the vision funded.
