# Ripple — product context

## What it is

A chat product where a "mode" is a **workflow with a rubric**, not a prompt persona.
Four modes, one per conversation:

| Mode | What it does | Scored |
|---|---|---|
| General | Direct assistant, no ceremony | — |
| Coach | Mock interview. Asks, scores the answer, raises the bar | 0–100 on structure, specifics, impact, ownership |
| Resume Review | Reads a pasted or attached resume the way a hiring manager does | 0–100 on impact, relevance, clarity, credibility |
| Document Q&A | Answers strictly from passages retrieved out of an uploaded PDF/txt, with inline citations | — |

## The unique mechanism

Evaluative modes reply in a **fixed JSON envelope**, not prose. The backend composes the
visible markdown itself, so the *shape* of a turn is deterministic even though the words
are not. The parsed scores persist on the message, which is what lets the session compute
a trend — a user can watch themselves get better across turns of one conversation.

This is the thing no competitor chat UI can copy-paste: **a scored, improving session.**

## Audience

People preparing for something they will be judged on — interviews, applications — plus
anyone who needs a document interrogated with citations rather than summarised from memory.
They arrive skeptical of "AI chat" because they have used the generic kind.

## Stack truth

- Frontend: React 19 + Vite, hash routing, no router library (the hero→chat transition is
  one continuous scroll-driven stage; splitting it across routes would unmount the thing
  the transition animates).
- Backend: Serverless on AWS Lambda + API Gateway, Postgres, SQS ingest queue for document
  embedding, Groq for generation, Cohere for embeddings.
- Auth: JWT in localStorage, email/password + Google Sign-In.

## Brand commitments (locked)

- Palette, type and token system in `web/src/styles/tokens.css`. Near-black canvas
  `#0a0a0b`, ice-cyan accent `#5cc8e8` (the tokens call it "emerald"; it is not).
- Inter (roman + italic for tone) and JetBrains Mono. One grotesque throughout.
- The wordmark is "Ripple" beside a soft glowing orb.

## Constraints

- One mode per conversation, enforced server-side from `conversations.mode`.
- Scores are 0–100 everywhere; legacy 0–5 cards are rescaled on read.
- No commercial claims may be invented: no prices, customers, benchmarks, or logos.
  Any such slot ships as a clearly marked placeholder.

## Assumptions (inferred from the brief and code, not confirmed by interview)

- No published pricing exists yet, so the landing page carries no pricing section.
- No real customer logos or testimonials exist; social proof is omitted rather than faked.
- "How it works" is the nav label's intent; the page's job is who we are / what we do /
  why choose.
