# BNI Deira Dubai — Visitor Assistant

A lightweight, rule-based WhatsApp-style chatbot for BNI Deira Dubai visitors.
Pure static site — **no API keys, no backend, no cost.** Works offline.

## What it does

- Greets visitors and offers quick-tap options
- **Asks time preference** (Morning 6:45 AM / Afternoon 3:45 PM / Evening 6:15 PM) before listing chapters
- Lists the relevant chapters from the 10 Deira chapters
- **Clarifies sub-category** before checking seat availability
- Reports whether a category seat is open or full (one seat per category — no workarounds)
- Quotes fees and visiting rules
- Never invents referral/member statistics — routes those to the team

## Files

| File | Purpose |
|------|---------|
| `index.html` | Chat UI |
| `chatbot.js` | All data, rules, FAQ, and conversation flow |
| `vercel.json` | Static hosting config |
| `package.json` | Project metadata |

## Deploy to Vercel (one click)

1. Push this folder to a **GitHub** repository.
2. Go to [vercel.com](https://vercel.com) → **Add New… → Project**.
3. Import the GitHub repo.
4. Leave all build settings empty (it's a static site) → **Deploy**.

That's it. Vercel serves `index.html` automatically.

## Run locally

```bash
npx serve .
```
Then open the URL shown (usually http://localhost:3000).

## Editing content

All chapters, categories, fees, and answers live at the top of **`chatbot.js`**:

- `CHAPTERS` — meeting days, times, venues, hybrid flag
- `CATEGORIES` — `filled` vs `total` seats (open when filled < total)
- `FEES` — guest and membership pricing
- `CONTACT` — Executive Director name and phone

Update those objects and redeploy.

---
Powered by BNI Deira Dubai · Yess.ae
