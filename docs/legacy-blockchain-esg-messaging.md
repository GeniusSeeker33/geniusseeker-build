# Legacy blockchain / ESG / Genius Dollar messaging (archived 2026-07-11)

This file preserves marketing copy that was removed from the live site when we
repositioned GeniusSeeker as a human-centered talent platform. Nothing here was
deleted because the underlying features are gone — Hedera identity, NFT badges,
employer verification tiers, and the ESG attestation fields in
`infra/identity-service` are all still live. This is just the old front-of-house
*messaging* that used to lead with blockchain/ESG language, kept so it can be
reused (e.g. on a future "Our Approach" / "Trust & Transparency" page) without
digging through git history.

## index.html (hero, pre-rewrite)

- Kicker: "✨ GeniusSeeker"
- H1: "This isn't just a platform. It's a portal."
- Subhead: "Where blockchain meets human brilliance. Where your gifts become
  currency. Where your journey is the product — and your genius the map."
- Badges: "Discover & showcase your genius" / "AI-powered matching across
  STEAM" / "Own your data & identity" / "Hedera + DigiByte aligned"
- "Why we exist" aside: "Built with digital ledger technology and
  forward-looking smart contracts that automate payment when deliverables are
  complete."
- Meta description: "A decentralized talent and innovation ecosystem where
  blockchain meets human brilliance. Discover your genius, earn Genius
  Dollars, and align to purpose."

## partials/footer.html (pre-rewrite)

- Footer brand line: "Blockchain + AI + Human Potential"
- Footer quote: "Your path is the product — and your genius the map."

## meet-the-founder.html (pre-rewrite)

- Meta description: "Meet Desiree Thayer, founder of GeniusSeeker.com — where
  blockchain, AI, and human potential converge."
- Bio: "A talent acquisition professional with over 25 years of experience.
  She is building a blockchain-enabled talent platform that uses smart
  contracts, on-chain identity, and tokenized payments to bring trust and
  transparency to modern work."
- "Built with strategic technologies like DigiByte and Hedera, leveraging IBM
  Hyperledger, on-chain identity, and token-based value exchange via Genius
  Dollars."
- "What we're building" aside: "A decentralized talent + innovation ecosystem
  that rewards real-world contributions, grows communities, and unlocks new
  revenue streams for individuals and organizations."

## platform.html (pre-rewrite)

- Meta description: "GeniusSeeker is a verified talent ecosystem for STEAM
  professionals — built on salary transparency, equity-first hiring, and
  on-chain identity."
- H1: "Hiring that's verifiable. Talent that's valued."
- Hero sub: "GeniusSeeker is a verified talent ecosystem for STEAM
  professionals. We connect equity-first employers with candidates whose
  identity, skills, and work history are on-chain — transparent from day one."
- "What GeniusSeeker does" list item: "Anchors candidate identity on Hedera"
- ESG band ("ESG BAND" section, `.esg-band-sm`):
  - Eyebrow: "ESG · Social Pillar"
  - Headline: "GeniusSeeker is the S in your ESG."
  - Body: "The hardest part of ESG reporting isn't the E. It's proving your
    Social commitments with real, verifiable data — not self-reported
    numbers. GeniusSeeker builds that evidence into every hire: salary
    transparency, attested hiring practices, and independent candidate
    reviews that live outside your own systems."
  - CTA: "See Verification Tiers"
  - Three mini-cards: Pay Equity / Workforce Diversity / Third-Party Record
- "How GeniusSeeker Works" step 2: "STEAM professionals create verified
  profiles anchored to their Hedera identity — their data, their record,
  owned by them."
- Roadmap row ("What's Built. What's Coming."):
  - Live Now: "On-chain Hedera identity" (list item)
  - Coming Soon: "HashPack wallet connect", "ESG hiring report (PDF)"
  - Phase 3 — "Smart Contracts & GeniusDollars": Hedera milestone escrow,
    automatic payment on delivery, GeniusDollars (OGBUSD-backed), on-chain
    placement records, IRENA-aligned energy accounting
- "Built for Everyone in the Hiring Chain" — Employers card: "Get verified.
  Access top STEAM talent. Build an ESG hiring record that your investors can
  actually cite — not just a policy document nobody reads."

## employer-verify.html (pre-rewrite)

- Hero sub: "Verification isn't a badge — it's evidence. Every commitment you
  attest to below becomes part of your hiring record: documentable,
  candidate-reviewed, and ready to support your ESG disclosures."
- Meta description: "Apply for GeniusSeeker employer verification. Demonstrate
  salary transparency, diverse hiring panels, and structured feedback — and
  give your ESG reporting real evidence."
- ESG callout above the form: "This form generates your ESG Social record. //
  Your attestations are stored on GeniusSeeker and verified over time through
  candidate reviews. Committed-tier employers can reference their
  GeniusSeeker status directly in ESG disclosures, investor reports, and
  human capital reporting as evidence of structured, equity-focused hiring
  practices."
- Attestation section subhead: "— these form your ESG Social attestation" and
  the per-item "ESG" tag pills on: salary ranges, written equality policy,
  diverse interview panels, structured feedback, track & report retention
  equity, pay equity audit.

## employers.html — ESG band (kept on-page but see note)

This page's Genius Dollar corporate-rewards content stayed live (it's a real
program, not blockchain/ESG framing), but its ESG band section was removed
from the messaging pass:

- Eyebrow: "ESG · Social Pillar"
- Headline: "GeniusSeeker is the S in your ESG."
- Body: "The hardest part of ESG isn't the E. It's proving your Social
  commitments with real, verifiable data. GeniusSeeker builds that evidence
  into every hire — so your investors, board, and candidates can see it."
- Pillars: Pay Equity / Workforce Diversity / Third-Party Verification
- Quote: "'Our hiring pipeline is sourced from a platform that requires
  salary transparency, diverse interview panels, structured feedback, and
  third-party candidate reviews.' — What your ESG disclosure can say, once
  you're GeniusSeeker Verified."
- Meta description: "Fund your team's growth in Genius Dollars — $1 = $1 USD,
  redeemable for real experiences at Earthtone Analog. Plus GeniusSeeker
  verified hiring: salary transparency, diverse panels, and third-party
  candidate reviews — the S in your ESG, built in."

## Where this can resurface

Per the messaging redo, blockchain/ledger/ESG-disclosure framing belongs on a
future "Our Approach" or "Trust & Transparency" page, positioned as supporting
infrastructure rather than the headline pitch. The underlying features
(Hedera identity anchoring, NFT badge minting, ESG attestation fields on
employer verification, Genius Dollars) are untouched in code — only this
front-of-house copy was retired.
