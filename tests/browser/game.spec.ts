import { runGroupPractice } from "./practice-helper";
import { test, expect, type Page } from "@playwright/test";
import sharp from "sharp";
test("TV and eight independent phones complete a match, recover, and rematch", async ({
  browser,
}) => {
  const contexts = [];
  const boardContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  await boardContext.addInitScript(() =>
    localStorage.setItem("language", "en"),
  );
  contexts.push(boardContext);
  const board = await boardContext.newPage();
  const errors: string[] = [];
  board.on("pageerror", (e) => errors.push(e.message));
  await board.goto("/");
  await board.getByRole("button", { name: "Create a room" }).click();
  await expect(board).toHaveURL(/\/board\//);
  async function expectTVFits() {
    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
      { width: 3840, height: 2160 },
    ]) {
      await board.setViewportSize(viewport);
      await expect
        .poll(() =>
          board.evaluate(() => {
            const content = document
              .querySelector(".board-content")!
              .getBoundingClientRect();
            const root = document.documentElement;
            const stage = document
              .querySelector(".match-layout .stage")
              ?.getBoundingClientRect();
            const white = document
              .querySelector(".score-panel.white")
              ?.getBoundingClientRect();
            const black = document
              .querySelector(".score-panel.black")
              ?.getBoundingClientRect();
            const archive = document
              .querySelector(".match-layout > .archive")
              ?.getBoundingClientRect();
            const scoresAtLeft =
              !stage ||
              (!!white &&
                !!black &&
                !!archive &&
                white.right <= stage.left &&
                black.right <= stage.left &&
                black.top >= white.bottom &&
                archive.top >= stage.bottom &&
                Math.abs(archive.left - stage.left) < 1 &&
                Math.abs(archive.width - stage.width) < 1 &&
                stage.width > white.width * 3);
            return (
              scoresAtLeft &&
              content.bottom <= innerHeight + 1 &&
              content.left >= -1 &&
              Math.abs(content.width - innerWidth) <= 1 &&
              content.right <= innerWidth + 1 &&
              root.scrollHeight <= innerHeight &&
              root.scrollWidth <= innerWidth
            );
          }),
        )
        .toBe(true);
    }
    await board.setViewportSize({ width: 1920, height: 1080 });
  }
  const id = new URL(board.url()).pathname.split("/")[2];
  const pages: Page[] = [];
  for (let i = 0; i < 8; i++) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await ctx.addInitScript(() => localStorage.setItem("language", "en"));
    contexts.push(ctx);
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("/join?room=" + id);
    await p.getByLabel("Your name", { exact: true }).fill("Agent " + i);
    await p.getByRole("button", { name: "Connect →", exact: true }).click();
    await expect(p).toHaveURL(/\/play\//);
    pages.push(p);
    const panel = p.locator(".team-panel").nth(i < 4 ? 0 : 1);
    await panel
      .getByRole("button", { name: i === 0 ? "Team beitreten" : "Join team" })
      .click();
    if (i === 0) {
      await p.locator(".settings-row select").first().selectOption("en");
      await expect(p.locator(".settings-row select").first()).toHaveValue("en");
    }
  }
  const host = pages[0];
  await expect(board.locator(".player-row")).toHaveCount(8);
  const image = await sharp({
    create: { width: 64, height: 64, channels: 3, background: "#c5ee94" },
  })
    .png()
    .toBuffer();
  await host
    .locator("input[type=file]")
    .setInputFiles({ name: "agent.png", mimeType: "image/png", buffer: image });
  await expect(board.locator(".player-row img")).toHaveCount(1);
  await board.screenshot({ path: "test-results/tv-lobby.png", fullPage: true });
  await expectTVFits();
  await runGroupPractice(pages, board);
  await host.getByRole("button", { name: "Start match" }).click();
  await expect(board.locator("h1")).toHaveText("Enter clues");
  await pages[3].reload();
  await expect(pages[3].locator(".keyword")).toHaveCount(4);
  await expect(pages[3].locator(".connection")).toHaveText(/Connected/);
  async function submitClues(page: Page, prefix: string) {
    const code = (await page.locator(".secret-code .code").innerText())
      .match(/[1-4]/g)!
      .map(Number);
    for (let i = 0; i < 3; i++)
      await page
        .locator(".clue-inputs input")
        .nth(i)
        .fill(prefix + " clue " + i);
    await page.getByRole("button", { name: "Lock clues" }).click();
    return code;
  }
  async function guess(page: Page, code: number[]) {
    await expect(page.locator(".guess-inputs")).toBeVisible();
    for (let i = 0; i < 3; i++)
      await page
        .locator(".guess-inputs select")
        .nth(i)
        .selectOption(String(code[i]));
    await page.getByRole("button", { name: "Lock team guess" }).click();
  }
  async function reveal(round: number) {
    await expect(host.getByRole("button", { name: "Continue" })).toBeVisible();
    for (let i = 0; i < (round === 1 ? 3 : 4); i++) {
      await host.getByRole("button", { name: "Continue" }).click();
      await host.waitForTimeout(80);
    }
  }
  const wrong = (code: number[]) => [code[1], code[0], code[2]];
  const w1 = await submitClues(pages[0], "white first");
  const b1 = await submitClues(pages[4], "black first");
  await expect(board.locator(".clue-display")).toBeVisible();
  await expect(board.locator(".keyword")).toHaveCount(0);
  await guess(pages[1], wrong(w1));
  await reveal(1);
  await guess(pages[5], b1);
  await reveal(1);
  await expect(
    host.getByRole("button", { name: "Start next round" }),
  ).toBeVisible();
  await host.getByRole("button", { name: "Start next round" }).click();
  const w2 = await submitClues(pages[1], "white second");
  const b2 = await submitClues(pages[5], "black second");
  await expectTVFits();
  await board.screenshot({
    path: "test-results/tv-playing.png",
    fullPage: true,
  });
  await pages[2].screenshot({
    path: "test-results/phone-playing.png",
    fullPage: true,
  });
  await expect(pages[2].locator(".guess-inputs")).toHaveCount(0);
  await guess(pages[6], wrong(w2));
  await guess(pages[2], wrong(w2));
  await reveal(2);
  await expect(pages[6].locator(".guess-inputs")).toHaveCount(0);
  await guess(pages[2], wrong(b2));
  await guess(pages[6], b2);
  await reveal(2);
  await expect(board.locator(".winner")).toHaveText("Black team wins");
  await expect(board.locator(".history-columns p")).toHaveCount(12);
  await expect(board.locator(".final-keywords .badge")).toHaveCount(8);
  await expectTVFits();
  await board.locator(".archive summary").click();
  await expectTVFits();
  await board.screenshot({
    path: "test-results/tv-result.png",
    fullPage: true,
  });
  await host.getByRole("button", { name: "Play again", exact: true }).click();
  await expect(board.locator("h1")).toHaveText("Waiting for players");
  await expect(board.locator(".player-row")).toHaveCount(8);
  await expect(board.locator(".player-row img")).toHaveCount(1);
  await host.locator(".host-controls select").first().selectOption("de");
  await expect(board.locator("h1")).toHaveText("Warten auf das Team");
  await expect(
    pages[7].getByRole("button", { name: "Team beitreten" }),
  ).toBeVisible();
  await host.screenshot({
    path: "test-results/phone-german.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  for (const ctx of contexts) await ctx.close();
});
