export const tutorialContent = {
  en: {
    open: "Practice match",
    lead: "Practice together",
    close: "Exit practice",
    title: "Guided practice match",
    label: "SCRIPTED PRACTICE",
    sample: "Fixed examples · practice scores only",
    round: "Round",
    white: "White team",
    black: "Black team",
    next: "Continue",
    begin: "Begin practice",
    finish: "Ready for a real match",
    skip: "Skip rounds 2–3",
    scripted: "Scripted",
    waiting: "Follow your phone’s role. The host advances the reveals.",
    solo: "Solo rehearsal: play White’s roles. Black is simulated automatically.",
    words: "Your practice keywords",
    secret: "Private to your team",
    code: "Your scripted code",
    suggestions: "The script has prepared these clues",
    send: "Send scripted clues",
    locked: "Submitted",
    cluegiver: "Clue-giver",
    speaker: "Spokesperson",
    teammate: "Teammate",
    yourRole: "Your role",
    thinking: "Why the clue-giver chose these clues",
    deduce: "What can we infer from the history?",
    hypothesis:
      "These are plausible connections, not confirmed opponent keywords. Only the number–clue mappings are certain.",
    intercept: "Interceptions",
    mistakes: "Miscommunications",
    decode: "Team decoding",
    attempt: "Interception attempt",
    correct: "Correct code",
    lock: "Submit practice code",
    guessLabel: "Number for clue",
    tryAgain:
      "Not quite. Follow the links below and try again. Practice mistakes do not add tokens.",
    hint: "Guided answer",
    history: "Practice clue history",
    noHistory: "No clues have been revealed yet.",
    historyNumber: "Number",
    ready: "Clues ready",
    preparing: "Waiting for clue-giver",
    teamWait:
      "Discuss the clues aloud. Only the assigned spokesperson submits.",
    silent:
      "You gave these clues: stay silent while your team decodes. You may help intercept the other team.",
    first: "Round 1: no interceptions. Your team only decodes its own code.",
    guessed: "Your team has locked the guided answer.",
    revealWait:
      "The host reveals guesses first, then the code. Watch the practice score update only when the code is revealed.",
    archiveExplain:
      "A revealed code confirms which number each clue belongs to. It does not reveal the keyword. Keep possible themes in mind for later clues.",
    skippedSummary:
      "We simulate both teams’ turns in rounds 2 and 3. In round 2, White intercepts Black’s 1 · 3 · 2 and Black decodes it incorrectly as 1 · 2 · 3: White gains one interception and Black one miscommunication. White could link Smoke to Heat (1) and Kitten to Purr (2); Ice (3) was still a less certain guess with no earlier clue for 3. Black swapped Ice (3) and Kitten (2). History records the correct code, not Black’s wrong guess. Round 3 adds clues but no tokens.",
    skipRoles:
      "Jump to round 4. Clue-givers and spokespeople rotate through each team again. The four secret words have stayed the same.",
    scoring:
      "A correct own-team answer earns nothing. A failed interception costs nothing. A correct interception earns one token; a wrong own-team answer earns one miscommunication. Check victory only after both teams have played.",
    win: "White wins the practice match",
    winReason:
      "White has two interceptions. Black has one interception and one miscommunication. We finish both transmissions before declaring the winner.",
    wrap: "You have prepared clues, decoded a code, used history to intercept, watched a miscommunication, and finished a match. Close practice to return to the unchanged lobby. Keep the timer off for your first real game.",
    introTitle: "Play a short match, with a coach.",
    intro:
      "Play round 1, fast-forward rounds 2–3, then play round 4. Every clue, code, and outcome is scripted. You perform the real actions; guidance explains each decision.",
    introRules:
      "4–8 players in two balanced teams of 2–4. Two interceptions win; two miscommunications lose. Codes contain three different numbers from 1–4. Your team’s four keywords stay fixed. Never show them on the TV.",
    introClues:
      "Clues must concern meaning and public knowledge. Never reuse a clue or use a keyword, its translation, spelling, sound, or position. Once clues are submitted, give no extra hints.",
    titles: {
      intro: "Your first practice match",
      clues: "Prepare the scripted transmission",
      guess: "Decode or intercept the transmission",
      reveal: "Reveal and understand the result",
      skip: "Fast-forward: rounds 2–3",
      complete: "Practice complete",
    },
    whyPrivate: {
      1: {
        white: [
          "Bark → Dog (3): a familiar action strongly associated with the word. Clear for teammates, but opponents may notice an animal theme.",
          "Crater → Moon (1): an indirect feature instead of saying the keyword. It suggests a surface or a place in space.",
          "Tide → Ocean (4): a related natural phenomenon. It is easy to connect, but also gives opponents a water theme.",
        ],
        black: [
          "Purr → Cat (2): a distinctive behavior that teammates can recognize. It is useful, but can expose an animal theme.",
          "Flower → Garden (4): something found there, rather than the keyword itself.",
          "Heat → Fire (1): an effect of the keyword. This avoids directly naming it.",
        ],
      },
      4: {
        white: [
          "Bakery → Bread (2): a new clue, connected to earlier Toast and Sandwich. It is easy for teammates, but the same food theme now makes interception easier.",
          "Current → Ocean (4): a water-related property instead of repeating Tide or Waves. Fresh wording can still expose the same theme.",
          "Leash → Dog (3): an object associated with the word rather than another animal sound. Bark and Kennel already give opponents enough context.",
        ],
        black: [
          "Frost → Snow (3): a related cold-weather concept. Ice and Ski have already suggested the same theme.",
          "Flame → Fire (1): a close connection that avoids repeating Heat or Smoke. Clear clues are often easier to intercept.",
          "Whiskers → Cat (2): a physical feature instead of repeating sounds such as Purr and Meow. Opponents can still connect the animal theme.",
        ],
      },
    },
    whyHistory: {
      white: [
        "Bakery → Toast + Sandwich → number 2. The shared food/baking theme makes 2 a reasonable inference.",
        "Current → Tide + Waves + Reef → number 4. These all fit a water or sea theme.",
        "Leash → Bark + Kennel → number 3. These suggest a familiar pet-related theme.",
      ],
      black: [
        "Frost → Ice + Ski → number 3. These support a cold-weather or snow-sport theme.",
        "Flame → Heat + Smoke → number 1. The clues share a burning or heat-related theme.",
        "Whiskers → Purr + Kitten + Meow → number 2. Several independent clues now point to the same animal theme.",
      ],
    },
    early: {
      white:
        "Bark is now filed under 3, Crater under 1, and Tide under 4. An opponent might suspect animal, space, and water themes, but one clue per number is still weak evidence.",
      black:
        "Purr is filed under 2, Flower under 4, and Heat under 1. An opponent might suspect an animal, a place with plants, and something hot. More clues will strengthen or change those guesses.",
    },
    advanced: "What about ties?",
    ties: "In a real match, simultaneous win/loss conditions or the eight-round limit use interceptions minus miscommunications. A remaining tie is resolved by guessing opposing keywords; equal correct answers mean a shared victory.",
  },
  de: {
    open: "Übungsspiel",
    lead: "Gemeinsam üben",
    close: "Übung verlassen",
    title: "Geführtes Übungsspiel",
    label: "GESKRIPTETE ÜBUNG",
    sample: "Feste Beispiele · nur Übungspunkte",
    round: "Runde",
    white: "Team Weiß",
    black: "Team Schwarz",
    next: "Weiter",
    begin: "Übung starten",
    finish: "Bereit für ein echtes Spiel",
    skip: "Runden 2–3 überspringen",
    scripted: "Geskriptet",
    waiting: "Beachtet eure Rolle auf dem Handy. Die Spielleitung deckt auf.",
    solo: "Einzelübung: Du übernimmst die Rollen von Weiß. Schwarz spielt automatisch.",
    words: "Eure Übungswörter",
    secret: "Nur für euer Team",
    code: "Dein vorgegebener Code",
    suggestions: "Das Skript gibt diese Hinweise vor",
    send: "Vorgegebene Hinweise senden",
    locked: "Abgegeben",
    cluegiver: "Verschlüssler",
    speaker: "Teamsprecher",
    teammate: "Teammitglied",
    yourRole: "Deine Rolle",
    thinking: "Warum diese Hinweise gewählt wurden",
    deduce: "Was lässt sich aus dem Verlauf ableiten?",
    hypothesis:
      "Das sind plausible Zusammenhänge, keine bestätigten gegnerischen Schlüsselwörter. Sicher sind nur die Zuordnungen von Hinweisen zu Nummern.",
    intercept: "Abgefangen",
    mistakes: "Missverständnisse",
    decode: "Teamantwort",
    attempt: "Abfangversuch",
    correct: "Richtiger Code",
    lock: "Übungscode abgeben",
    guessLabel: "Nummer für Hinweis",
    tryAgain:
      "Noch nicht ganz. Folge den Verbindungen unten und versuche es erneut. Fehler beim Üben geben keine Marker.",
    hint: "Geführte Antwort",
    history: "Übungsverlauf der Hinweise",
    noHistory: "Noch wurden keine Hinweise aufgedeckt.",
    historyNumber: "Nummer",
    ready: "Hinweise bereit",
    preparing: "Warten auf den Verschlüssler",
    teamWait:
      "Besprecht die Hinweise laut. Nur der zuständige Teamsprecher gibt ab.",
    silent:
      "Du hast diese Hinweise gegeben: Bleibe still, während dein Team entschlüsselt. Beim gegnerischen Code darfst du mit abfangen.",
    first:
      "Runde 1: kein Abfangen. Jedes Team entschlüsselt nur den eigenen Code.",
    guessed: "Euer Team hat die geführte Antwort abgegeben.",
    revealWait:
      "Die Spielleitung zeigt erst die Antworten und dann den Code. Die Übungspunkte ändern sich erst beim Aufdecken des Codes.",
    archiveExplain:
      "Ein aufgedeckter Code bestätigt die Nummern der Hinweise, aber nicht das Schlüsselwort. Merkt euch mögliche Themen für spätere Hinweise.",
    skippedSummary:
      "Wir simulieren beide Teamzüge in den Runden 2 und 3. In Runde 2 fängt Weiß den schwarzen Code 1 · 3 · 2 ab. Schwarz antwortet falsch mit 1 · 2 · 3: Weiß erhält einen Abfangmarker, Schwarz einen Missverständnismarker. Weiß konnte Rauch mit Hitze (1) und Kätzchen mit Schnurren (2) verbinden; Eis (3) war ohne früheren Hinweis zu 3 noch eine unsichere Vermutung. Schwarz vertauschte Eis (3) und Kätzchen (2). Der Verlauf speichert den richtigen Code, nicht die falsche Antwort. Runde 3 ergänzt Hinweise ohne weitere Marker.",
    skipRoles:
      "Weiter zu Runde 4. Die Rollen zum Verschlüsseln und Sprechen wechseln erneut innerhalb jedes Teams. Die vier geheimen Wörter bleiben gleich.",
    scoring:
      "Richtige eigene Antworten geben keine Belohnung, falsche Abfangversuche keine Strafe. Richtiges Abfangen gibt einen Marker, eine falsche eigene Antwort ein Missverständnis. Erst nach beiden Teams wird der Sieg geprüft.",
    win: "Weiß gewinnt das Übungsspiel",
    winReason:
      "Weiß hat zwei Abfangmarker. Schwarz hat einen Abfangmarker und ein Missverständnis. Erst nach beiden Übertragungen steht der Sieger fest.",
    wrap: "Ihr habt Hinweise vorbereitet, Codes entschlüsselt, den Verlauf zum Abfangen benutzt, ein Missverständnis gesehen und ein Spiel beendet. Nach dem Schließen seid ihr wieder in der unveränderten Lobby. Lasst im ersten echten Spiel den Timer aus.",
    introTitle: "Ein kurzes Spiel mit Hilfestellung.",
    intro:
      "Spielt Runde 1, überspringt die Runden 2–3 und spielt dann Runde 4. Alle Hinweise, Codes und Ergebnisse stehen fest. Ihr führt die echten Aktionen aus; die Anleitung erklärt jede Entscheidung.",
    introRules:
      "4–8 Spieler in zwei ausgeglichenen Teams mit je 2–4 Spielern. Zwei abgefangene Codes gewinnen, zwei Missverständnisse verlieren. Codes bestehen aus drei verschiedenen Zahlen von 1–4. Eure vier Schlüsselwörter bleiben gleich. Zeigt sie niemals auf dem Fernseher.",
    introClues:
      "Hinweise müssen sich auf Bedeutung und öffentliches Wissen beziehen. Keine Wiederholung, Schlüsselwörter, Übersetzungen, Schreibweisen, Laute oder Positionen. Nach dem Abgeben keine zusätzlichen Tipps.",
    titles: {
      intro: "Euer erstes Übungsspiel",
      clues: "Die vorgegebene Übertragung vorbereiten",
      guess: "Die Übertragung entschlüsseln oder abfangen",
      reveal: "Aufdecken und das Ergebnis verstehen",
      skip: "Zeitsprung: Runden 2–3",
      complete: "Übung abgeschlossen",
    },
    whyPrivate: {
      1: {
        white: [
          "Bellen → Hund (3): eine bekannte Handlung mit klarer Verbindung. Für Mitspieler leicht, aber die Gegner erkennen vielleicht ein Tierthema.",
          "Krater → Mond (1): ein Merkmal statt des Schlüsselworts. Es deutet auf eine Oberfläche oder einen Ort im All hin.",
          "Gezeiten → Ozean (4): ein verwandtes Naturphänomen. Leicht zu verbinden, aber auch ein Hinweis auf Wasser.",
        ],
        black: [
          "Schnurren → Katze (2): ein typisches Verhalten. Gut erkennbar, verrät aber womöglich ein Tierthema.",
          "Blume → Garten (4): etwas, das dort vorkommt, statt des Schlüsselworts selbst.",
          "Hitze → Feuer (1): eine Wirkung statt der direkten Benennung.",
        ],
      },
      4: {
        white: [
          "Bäckerei → Brot (2): ein neuer Hinweis, verbunden mit Toast und Sandwich. Für Mitspieler klar, für Gegner durch das wiederkehrende Thema leichter abzufangen.",
          "Strömung → Ozean (4): eine Eigenschaft von Wasser, ohne Gezeiten oder Wellen zu wiederholen. Neue Wörter können dasselbe Thema verraten.",
          "Leine → Hund (3): ein zugehöriger Gegenstand statt eines weiteren Tierlauts. Bellen und Hundehütte liefern schon genügend Kontext.",
        ],
        black: [
          "Frost → Schnee (3): ein verwandtes Kältekonzept. Eis und Ski deuteten bereits dasselbe Thema an.",
          "Flamme → Feuer (1): eine klare Verbindung ohne Hitze oder Rauch zu wiederholen. Verständliche Hinweise sind oft leichter abzufangen.",
          "Schnurrhaare → Katze (2): ein Merkmal statt wiederholter Laute wie Schnurren und Miau. Das Tierthema bleibt trotzdem erkennbar.",
        ],
      },
    },
    whyHistory: {
      white: [
        "Bäckerei → Toast + Sandwich → Nummer 2. Das gemeinsame Back- und Essensthema stützt diese Vermutung.",
        "Strömung → Gezeiten + Wellen + Riff → Nummer 4. Alles passt zu einem Wasser- oder Meeresthema.",
        "Leine → Bellen + Hundehütte → Nummer 3. Das deutet auf ein bekanntes Haustierthema hin.",
      ],
      black: [
        "Frost → Eis + Ski → Nummer 3. Das stützt ein Kälte- oder Wintersportthema.",
        "Flamme → Hitze + Rauch → Nummer 1. Die Hinweise verbindet ein Hitze- oder Verbrennungsthema.",
        "Schnurrhaare → Schnurren + Kätzchen + Miau → Nummer 2. Mehrere Hinweise stützen jetzt dasselbe Tierthema.",
      ],
    },
    early: {
      white:
        "Bellen gehört nun sicher zu 3, Krater zu 1 und Gezeiten zu 4. Gegner könnten Tier-, Weltraum- und Wasserthemen vermuten. Ein einzelner Hinweis pro Nummer ist aber noch wenig Beleg.",
      black:
        "Schnurren gehört zu 2, Blume zu 4 und Hitze zu 1. Gegner könnten ein Tier, einen Ort mit Pflanzen und etwas Heißes vermuten. Weitere Hinweise stützen oder verändern diese Vermutungen.",
    },
    advanced: "Und bei Gleichstand?",
    ties: "Im echten Spiel zählen bei gleichzeitigen Sieg-/Niederlagebedingungen oder nach acht Runden die Abfangmarker minus Missverständnisse. Bei weiterem Gleichstand erratet ihr gegnerische Schlüsselwörter. Gleich viele richtige Antworten bedeuten einen gemeinsamen Sieg.",
  },
};
