# Decrypto — local party game

Four to eight players, two balanced teams of two to four, one shared TV board, and a phone for every player. The rules follow the included official PDF. All game data, photos, assets, and QR generation stay on the local server.

## Run

Requires Node.js **24 or newer** (tested on Node 26) and npm.

```bash
npm install
npm run build
npm start
```

If this machine has a system libvips installation and Sharp tries to compile from source, install with `SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install` instead.

1. Keep the server computer, TV, and all player phones on the same Wi-Fi.
2. Open the LAN URL printed by the server on the TV browser, or open it on a computer connected to the TV by HDMI. Click **Create a room**. Keep this board open during play.
3. Players scan the QR code or enter the printed address on their phones. The first person to join becomes host.
4. Each player enters a name and can upload a photo (up to 5 MB and 25 megapixels). Players choose teams; the host can move players or shuffle teams. Moving into a full team swaps its last player into the original team.
5. The host selects English or German and optionally enables the clue timer, then starts once each team contains two to four players and team sizes differ by at most one.

The default port is **3000**. Allow incoming TCP connections on that port if a firewall blocks the devices. Guest Wi-Fi/client isolation can prevent devices from reaching one another. A localhost URL is only usable on the server computer; the TV lobby automatically uses the detected LAN address in its QR code. You can edit that address if you have several network interfaces.

```bash
PORT=4000 DATA_DIR=/path/to/game-data npm start
```

## Learn together before playing

Choose **Practice match** (**Übungsspiel**) in the header for a solo rehearsal with an automated Black team. For group practice, four to eight players first join and form balanced teams of two to four; the host selects **Practice together** (**Gemeinsam üben**).

This is an interactive, fully scripted match with a fixed outcome, not a slide deck. Play round 1, fast-forward rounds 2–3, and play round 4 using the accumulated clue history. Clue-givers send fixed clues from their phones; spokespeople select the scripted codes; the host advances the same reveal sequence used in a real game. Role rotation follows the skipped rounds. Incorrect practice guesses get private coaching and can be retried without penalties.

The TV and phones show the same phase. Only the relevant phones receive practice keywords, codes, and clue-giver explanations. The TV displays the public clues, history, and practice scores. Guidance traces new clues to earlier ones, explains the clue-giver’s thinking and the information their clues expose, and distinguishes hypotheses about keywords from confirmed number–clue mappings. The skipped-round summary includes a scripted miscommunication and explains why history must record the correct code rather than a wrong guess. At the end, all practice keywords and both teams’ clue-giver reasoning are available for review.

Practice is untimed and has separate state and scores. It survives phone refreshes and server restarts, and closing it returns to the unchanged lobby. Teams, language, and real-game start are locked until the host finishes or exits practice. A host can exit early at any point. Keep the optional clue timer off for your first real match.

## Playing

- Team keywords appear only on your own team's phones. The TV never receives them until the match ends (or both keyword tiebreak answers have been submitted).
- Both clue-givers prepare three clues simultaneously. The role rotates through all team members. If enabled, the first submission gives the other clue-giver 30 seconds; valid saved draft clues are used when time expires, with blanks for unfinished clues.
- White's code is played first, then Black's. Discuss aloud; the next teammate after the clue-giver is the rotating spokesperson who locks the team's guesses. The current clue-giver stays silent while their own code is being decoded. All team members may discuss the opposing code.
- Round one has no interception. Later, both teams lock their guesses before the host reveals the interception attempt, decoding guess, and correct code in order.
- The host presses **Continue** on their phone to progress the TV. Scoring is automatic; victory is checked after both teams' turns.
- The host can select 1–30 rounds and a guess time limit of 10–1800 seconds (default: 180 seconds). Interception and team decoding each get a fresh countdown. A decoding timeout counts as a miscommunication; an interception timeout earns no point. Settings carry over into rematches.
- Two interceptions win; two miscommunications lose. Simultaneous outcomes and the configured round limit (eight by default) use net points, then opposing-keyword guesses. The host judges equivalent keyword answers; equal scores produce a shared victory.
- Clues may be words or sentences. Exact own-keyword use and repeated team clues are rejected. Meaning, translation, spelling, pronunciation, and private-reference restrictions are judged by the group. This version supports typed clues rather than performance-only clues.

## Recovery and privacy

Room state and saved clue drafts are stored in `data/games.sqlite`; processed 256×256 WebP photos are in `data/avatars`. The server restores matches and timer deadlines after restarting. Refreshing or reconnecting a phone restores its seat using a token in that browser's local storage. Keep using the same browser and room URL. Player sessions are not transferable between unrelated browsers automatically.

The host can transfer control from their phone. If the host disconnects, reconnect that phone to resume or transfer control; the game does not silently elect a new host. The TV access token is stored in its browser and initial URL fragment; player links do not contain it. Unauthorized sockets cannot subscribe to room state, and the server validates every action and role. This is a trusted home-network app over HTTP, not a public internet service.

Rematches preserve players, photos, teams, and settings while assigning new keywords and codes. Old rooms and superseded photos are retained locally; stop the server and remove `data/` to clear all saved games and images.

## Development and checks

```bash
npm test             # Engine and real-server integration tests
npm run build        # TypeScript validation and production bundle
npm run test:e2e     # TV + eight isolated phone browser sessions
```

Browser tests use `/usr/bin/chromium`; override with `CHROMIUM_PATH=/path/to/chromium`. They run an isolated server on port 3100 and store screenshots in `test-results/`. Integration tests use port 3199 and a temporary data directory.

For development, run `npm run dev` for the backend and `npx vite --host` in another terminal for the frontend with API/WebSocket proxying. Use the Vite LAN address directly when testing phones in development; use the production server for the TV's automatic QR network detection.

Architecture: React/TypeScript UI, Express/Socket.IO server, server-controlled rules engine, Node's SQLite implementation, and original English/German word banks (over 200 unique words each). No publisher artwork or card word list is included.
