# Yakety Words of Inspiration — Build Plan

## 1. What it is

A one-screen web app for Young Alumni Council (YAC) members who are having a rough day. The screen shows Yakety, the YAC mascot. Click him and he says something kind: what he appreciates about your YAC work, and a reminder that you're talented, capable, and wise. You never see the same message twice.

**v1 (this plan):** runs locally in a browser and needs no accounts, server, or build step.
**Later:** deploy the same files to a public URL.

## 2. Goals and non-goals

**Goals**
- Opens fast. One screen, one obvious action: click Yakety.
- Feels playful: Yakety bounces, wiggles, and talks in a speech bubble, with some confetti.
- Uses YAC colors throughout.
- No repeated messages for the same person.
- Easy to add new messages without touching the app logic.

**Non-goals for v1**
- Logins, user accounts, or a database
- Personalized messages that use the member's name (possible later, see §9)
- AI-generated messages (possible later, see §9)
- Analytics

## 3. User experience

1. The page loads. Yakety sits in the center on a YAC-colored background and idles with a gentle bob. A small prompt says "Psst… tap me for a pick-me-up! 🐾".
2. The user clicks or taps Yakety (Enter and Space also work).
3. Yakety squishes and hops, and his mouth flaps while the message types out in a speech bubble, and a little burst of confetti or hearts goes off in YAC colors.
4. Clicking again swaps in a new message with the same animation.
5. A small counter in the footer reads "You've collected 7 pep talks from Yakety". It's a nice touch and doesn't get in the way.
6. If the user has seen every possible message (unlikely, see §5), Yakety says something like "You've heard everything I've got… and it's all still true. Starting over!" and the pool resets.

**Accessibility**
- Yakety is a real `<button>` with an accessible label, so he works by keyboard.
- The speech bubble is an `aria-live="polite"` region, so screen readers announce each message.
- `prefers-reduced-motion` turns off the bouncing and confetti.
- Text and background colors meet WCAG AA contrast.

## 4. Visual design

- **Palette:** YAC colors are NCSSM's colors: navy and bright blue with white, plus a small gold accent for playfulness. They're defined as CSS variables, so a palette swap is a one-line change. *The official hex codes still need confirming. NCSSM's brand site (brand.ncssm.edu) requires an NCSSM login, so v1 uses close stand-ins: navy `#0B2A5B`, blue `#2F6FD6`, sky `#A9CDF5`, gold `#F4C542`.*
- **Yakety (the mascot):** an original, Tamagotchi-style character drawn as an inline SVG, so the parts can be animated.
  - **Who he is:** a round, chubby baby yak with a fluffy blue body in NCSSM blue, a scalloped shaggy fringe at the bottom, and darker blue bangs flopping over his forehead.
  - **Face:** big shiny eyes that blink, rosy pink cheeks, a cream muzzle with little nostrils, and a small smile that flaps open when he "talks".
  - **Details:** two curved cream horns, floppy ears, stubby feet, and a little gold bell on his collar.
  - **Tamagotchi frame:** he lives on the "screen" of an egg-shaped, navy-to-blue toy with a gold keychain ring on top and three round buttons below.
  - The same artwork is also saved as `assets/yakety.svg` for the favicon.
- **Type:** A rounded, friendly display font such as Fredoka or Baloo 2 from Google Fonts for the speech bubble and title, with a clean sans for small text.
- **Layout:** Mobile-first and centered. Yakety takes about 50% of the viewport height and the bubble sits above or beside him. It works on phones, because that's where people will open a link on a bad day.
- **Motion:** Idle bob, a squash-and-stretch on click, the bubble popping in with a slight overshoot, and confetti built from small DOM or canvas particles. No libraries are needed.

## 5. Making sure messages never repeat

The "never repeat" requirement drives most of the design, so this section covers it in detail.

### Approach: combinatorial messages + per-browser memory (recommended)

Each message is assembled from four parts:

| Part | Example |
|---|---|
| **Opener** | "Hold onto your horns!" / "Ding ding! You've got yak-mail." |
| **Appreciation** (your YAC work, kept general) | "Your work on the YAC is unbe-yak-ably good." |
| **Affirmation** (talented/capable/wise) | "You are talented, capable, and wise. Yak it from me." |
| **Closer** | "Herd it here first: you're amazing." / "Yak you very much for being you." |

With 20 openers × 30 appreciations × 30 affirmations × 20 closers, that's **360,000 unique messages**. Each part is written so that any combination reads naturally.

On top of that:
- **Hand-written "specials":** about 35 complete messages that are longer or funnier and don't fit the template, such as knock-knock jokes, "Yakety Facts", and "I'm not saying you're the GOAT. I'm saying you're the YAK." They're mixed in at around 1 in 5 clicks.
- **No-repeat tracking:** each message gets an ID (a combination ID or special ID), and the IDs already shown are stored in the browser's `localStorage`. The picker skips anything already seen.
- **Variety guard:** the same appreciation or affirmation can't appear in two back-to-back messages, even inside a new combination, so consecutive messages don't feel samey.

### Yakety's voice

Goofy and punny, with lots of yak jokes: *yak* as in talking ("I'm not just yakking"), yak puns ("unbe-yak-able", "yak-cellent", "horn-ored", "herd it here first", "fur real"), mountain and Himalaya jokes, and hoof-bumps. Under the jokes, every message still lands on the sincere point: the YAC appreciates you, and you're talented, capable, and wise. v1 keeps YAC appreciation general and doesn't name specific activities.

**Limitations to be honest about**
- "Never repeat" applies per browser. Clearing site data or switching phone ↔ laptop resets the memory. Real cross-device tracking needs accounts and a backend, which v1 doesn't have.
- Combination messages share pieces, so a user will eventually see a familiar sentence inside a new message. The full message is still unique.

### Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| **A. Combinatorial + localStorage** (recommended) | Free, offline, instant, effectively unlimited | Pieces recur inside new combos |
| B. Large hand-written list only (~300) | Every message feels crafted | Runs out eventually; lots of writing |
| C. AI-generated via Claude API | Truly fresh every time; could personalize | Needs a server for the API key, costs money, has latency, and needs a content guardrail. Better as a phase-2 option. |

## 6. Tech approach

- **Stack:** Plain HTML, CSS, and vanilla JavaScript. There's no framework or build step. You open `index.html` in a browser, or run a tiny local server.
- **Why so simple:** The app is one interaction. Static files can later be deployed for free to Netlify, Vercel, or GitHub Pages without changes.

### File structure

```
yakety-words-of-inspiration/
├── PLAN.md               ← this file
├── README.md             ← how to run locally / deploy
├── index.html            ← page shell, Yakety button, speech bubble
├── styles.css            ← YAC palette variables, layout, animations
├── app.js                ← click handling, animation triggers, confetti
├── messages.js           ← message engine: compose, pick, no-repeat tracking
├── messages-data.js      ← openers / appreciations / affirmations / closers / specials
└── assets/
    └── yakety.svg        ← standalone Yakety artwork / favicon
```

`messages-data.js` is kept separate so you, or any YAC member, can add new lines without touching the logic.

### Message engine (messages.js)

- `nextMessage()` returns `{ id, text }`:
  1. Decide between a special and a combination (about 20% / 80%).
  2. Pick randomly from that pool, skipping seen IDs and the previous message's parts.
  3. Record the ID in `localStorage` under `yakety.seen`, stored compactly.
  4. If a pool is exhausted, use the other one. If both are exhausted, show the "starting over" line and reset.
- All `localStorage` access is wrapped in try/catch. If storage is blocked (some private browsing modes), the app still works and tracks history in memory for the session.

## 7. Build steps

1. **Scaffold:** create the files and the YAC palette variables, with the layout placing Yakety and the bubble.
2. **Yakety art:** draw the Tamagotchi-style SVG yak with animatable parts (blinking eyes, talking mouth, squash-and-stretch body).
3. **Interaction:** button click → squash/hop → bubble with message → confetti, plus keyboard support and reduced motion.
4. **Message engine:** composition, no-repeat tracking, variety guard, exhaustion reset.
5. **Write the content:** a first draft of every pool in Yakety's voice: goofy, punny, and full of yak jokes, with general YAC appreciation. You review and edit.
6. **Polish:** footer counter, title, favicon, and checks at phone width.
7. **Run locally:** open in the browser and verify (see §8).

## 8. How we'll verify it works

- Click 200+ times in a row (automated in the browser console) and confirm zero duplicate message IDs.
- Reload the page and confirm the history persists and no repeats occur.
- Simulate an exhausted pool with a tiny test dataset and confirm the "starting over" behavior.
- Keyboard-only run: Tab to Yakety, press Enter, and confirm the screen reader region updates.
- Check phone width (375px), desktop, and reduced-motion mode.
- Read 30 random composed messages aloud to confirm they all sound natural.

## 9. Later phases (not in v1)

- ~~**Public deployment**~~ Done 2026-10-11 at heyyakety.github.io. **Moved 2026-10-12** to **https://yac-yakkety.github.io/** (GitHub Pages, repo `yac-yakkety/yac-yakkety.github.io` in the `yac-yakkety` org, which also holds the Yakkety productivity suite, so ownership can be handed to YAC leadership as one org). A custom domain is still possible later.
- **Personalization:** "What's your name?" on first visit, stored locally, so Yakety can say "Hey Priya, …".
- **Sharing:** a "Send this to a fellow YAC member" button that copies the message.
- **AI mode:** a serverless function that calls Claude for fresh, never-before-written messages, with the template engine as fallback.
- **Member submissions:** a form where YAC members suggest new lines for Yakety.

## 10. Decisions (answered 2026-10-11)

| Question | Decision |
|---|---|
| YAC colors | Same as NCSSM's colors. The official hex codes are still to be confirmed (see §4). |
| Yakety artwork | Generate an original, fun, cute mascot in a Tamagotchi style (see §4). The name is spelled **Y-A-K-E-T-Y**. |
| Voice | Goofy and punny, with lots of yak jokes. |
| "Never repeat" scope | Per-browser memory is enough for v1. |
| YAC activities | Keep it general for v1, with no specific activities. |
| Off-limits topics | None for now. A content guardrail may come later. |

## 11. Implementation approach (agreed 2026-10-11)

| Topic | Decision |
|---|---|
| Starting point | Reuse the draft files already in this folder, fixing and updating them as tasks go. |
| Orchestration | Opus 5.5 plans, delegates, and reviews every task's output before the next starts. |
| Coding | Haiku 5.5 subagents do all coding tasks. This applies to this project only; it's partly an experiment to see how Haiku 5.5 performs. |
| Yak jokes | Opus writes all message content (`messages-data.js`), because pun quality is what users notice. |
| Check-in | Pause after the Yakety artwork is done so Akhil can approve the look before UI work builds on it. |
| Version control | Local git repo now; move to GitHub later. |
| Running | Double-click `index.html`, with no server needed. |
| Fonts | Google Fonts is fine (needs internet; offline isn't required). |
| Colors | Stand-in NCSSM colors (§4). |
| Done means | Works in desktop Chrome and at phone width (375px) and passes every check in §8. Only Chrome is tested for now. |

### Task breakdown

| # | Task | Model | Depends on | Files |
|---|---|---|---|---|
| A | Yakety artwork + Tamagotchi frame | Haiku | — | SVG in `index.html`, `assets/yakety.svg`, mascot/device CSS |
| B | Message engine + automated tests | Haiku | — | `messages.js`, `tests/messages.test.js` |
| C | Yak-pun message content | Opus | — | `messages-data.js` |
| — | **Check-in: Akhil approves artwork** | | A | |
| D | Page layout, animations, confetti, accessibility | Haiku | A, check-in | `index.html`, `styles.css`, `app.js` |
| E | README (run locally, add messages, deploy later) | Haiku | B, C, D | `README.md` |
| F | Final verification against §8 in Chrome | Opus | all | — |

A, B, and C run in parallel. They don't touch the same files, so Haiku agents never overwrite each other.

### Still open
- **Official NCSSM hex codes:** if you can grab them from brand.ncssm.edu, I'll swap them into the CSS variables.
