# Yakety Words of Inspiration

Yakety the yak gives YAC members a never-repeating pep talk when they tap him. 🐾

**Try it:** https://heyyakety.github.io/

## Run it locally

Double-click `index.html`. That's it, nothing to install.

It uses one Google Font, so it needs an internet connection to look its best. Offline, it still works and uses a fallback font.

## Add new messages

Everything Yakety says lives in `messages-data.js`. You never need to touch the app logic.

A regular message is built from four pools, one line from each, in this order:

1. **openers**: "Hold onto your horns!"
2. **appreciations**: what Yakety appreciates about your YAC work
3. **affirmations**: a reminder that you're talented, capable, and wise
4. **closers**: "Go get 'em! 🐾"

**Rules for pool lines:**

- Every line must be a complete sentence that reads naturally next to a line from any other pool.
- **Only add to the end of a list. Never reorder or delete lines.** A line's position is its message ID, and those IDs track what each person has already seen. Moving or removing a line scrambles that history.
- Keep the yak puns coming. That's what makes Yakety, Yakety.

**Specials** are complete, hand-written messages (jokes, facts, longer pep talks) that show up now and then. To add one, append it to the end of the `specials` list:

```js
  specials: [
    "...the existing specials...",
    "Yakety Fact #99: a yak in a good mood is a yak who has just heard from you. 💙"
  ],
```

Make sure the line before your new one ends with a comma, and keep the closing `]` after the last line.

## How "never repeat" works

- **Lots of combinations.** Four pools of about 20 to 30 lines each make hundreds of thousands of different messages, plus the specials. A variety guard keeps back-to-back messages from sharing a piece.
- **History is saved in the browser.** Seen messages are stored in the browser's `localStorage`.
- **It's per browser.** Clearing site data or switching to another device or browser starts fresh.
- **Reset after everything has been seen.** Once every possible message has been shown, Yakety says a "starting over" message and the history resets.

## Tests

```sh
npm test
```

Needs Node 18 or newer. There are no dependencies to install.

## Deploying

The site is hosted with GitHub Pages from the `main` branch, root folder. Pushing to `main` redeploys automatically within a minute or two.

## Project files

```
yakety-words-of-inspiration/
├── index.html          Page layout, Yakety's SVG artwork, speech bubble
├── styles.css          YAC colors (CSS variables), layout, animations
├── app.js              Click handling, animations, confetti, counter
├── messages.js         Message engine: picks messages and tracks what's been seen
├── messages-data.js    All of Yakety's lines: pools and specials
├── assets/
│   └── yakety.svg      Standalone Yakety artwork (also the favicon)
├── tests/              Automated tests for the message engine (npm test)
└── PLAN.md             Design and build plan
```
