import { test, expect } from "@playwright/test";
import { practiceGuess } from "./practice-helper";
test("standalone scripted match works in German on a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Übungsspiel", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Euer erstes Übungsspiel" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Sprache", { exact: true }).selectOption("de");
  await page.getByRole("button", { name: "Übungsspiel", exact: true }).click();
  await page.getByRole("button", { name: "Übung starten" }).click();
  await expect(page.getByRole("dialog")).toContainText("Bellen → Hund");
  await page
    .getByRole("button", { name: "Vorgegebene Hinweise senden" })
    .click();
  await practiceGuess(page, [3, 1, 4], "Übungscode abgeben");
  for (let i = 0; i < 6; i++)
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Weiter" })
      .click();
  await expect(
    page.getByRole("heading", { name: "Zeitsprung: Runden 2–3" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Runden 2–3 überspringen" }).click();
  await page
    .getByRole("button", { name: "Vorgegebene Hinweise senden" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Bäckerei → Toast + Sandwich",
  );
  await practiceGuess(page, [2, 4, 3], "Übungscode abgeben");
  for (let i = 0; i < 4; i++)
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Weiter" })
      .click();
  await practiceGuess(page, [3, 1, 2], "Übungscode abgeben");
  for (let i = 0; i < 4; i++)
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Weiter" })
      .click();
  await expect(
    page.getByRole("heading", { name: "Weiß gewinnt das Übungsspiel" }),
  ).toBeVisible();
  await page.getByText("Und bei Gleichstand?", { exact: true }).click();
  await expect(page.getByText(/Gleich viele richtige Antworten/)).toBeVisible();
  await page
    .getByRole("button", { name: "Bereit für ein echtes Spiel" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Raum erstellen" }),
  ).toBeVisible();
});
