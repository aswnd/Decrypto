import { expect, type Page } from "@playwright/test";
export async function practiceGuess(
  page: Page,
  code: number[],
  label = "Submit practice code",
) {
  const form = page.getByRole("dialog").locator(".practice-guess");
  await expect(form).toBeVisible();
  for (let i = 0; i < 3; i++)
    await form.locator("select").nth(i).selectOption(String(code[i]));
  await page.getByRole("button", { name: label }).click();
}
async function reveal(host: Page, count: number) {
  for (let i = 0; i < count; i++)
    await host
      .getByRole("dialog")
      .getByRole("button", { name: "Continue", exact: false })
      .click();
}
export async function runGroupPractice(pages: Page[], board: Page) {
  const host = pages[0];
  await host.getByRole("button", { name: "Practice together" }).click();
  for (const phone of pages)
    await expect(phone.getByRole("dialog")).toBeVisible();
  await expect(board.getByRole("dialog")).toBeVisible();
  await expect(
    pages[1].getByRole("button", { name: "Begin practice" }),
  ).toHaveCount(0);
  await host.getByRole("button", { name: "Begin practice" }).click();
  await expect(board.locator(".practice-private")).toHaveCount(0);
  await expect(board.locator(".tutorial-code")).toHaveCount(0);
  await expect(pages[1].locator(".tutorial-code")).toHaveCount(0);
  await expect(pages[0].locator(".tutorial-code")).toHaveText(/3 · 1 · 4/);
  await expect(pages[4].locator(".tutorial-code")).toHaveText(/2 · 4 · 1/);
  await expect(pages[0].getByRole("dialog")).toContainText("Bark → Dog");
  await pages[0].getByRole("button", { name: "Send scripted clues" }).click();
  await pages[4].getByRole("button", { name: "Send scripted clues" }).click();
  await practiceGuess(pages[1], [1, 2, 3]);
  await expect(pages[1].getByRole("status")).toContainText("Not quite");
  await expect(board.getByRole("status")).toHaveCount(0);
  await practiceGuess(pages[1], [3, 1, 4]);
  await reveal(host, 3);
  await practiceGuess(pages[5], [2, 4, 1]);
  await reveal(host, 3);
  await expect(
    board.getByRole("heading", { name: "Fast-forward: rounds 2–3" }),
  ).toBeVisible();
  await expect(board.getByRole("dialog")).toContainText(
    "White gains one interception",
  );
  await expect(board.locator(".practice-skipped-log p")).toHaveCount(4);
  await pages[3].reload();
  await expect(
    pages[3].getByRole("heading", { name: "Fast-forward: rounds 2–3" }),
  ).toBeVisible();
  await host.getByRole("button", { name: "Skip rounds 2–3" }).click();
  await expect(
    pages[3].getByRole("button", { name: "Send scripted clues" }),
  ).toBeVisible();
  await expect(
    pages[0].getByRole("button", { name: "Send scripted clues" }),
  ).toHaveCount(0);
  await pages[3].getByRole("button", { name: "Send scripted clues" }).click();
  await pages[7].getByRole("button", { name: "Send scripted clues" }).click();
  await expect(board.getByRole("dialog")).toContainText(
    "Bakery → Toast + Sandwich",
  );
  await expect(board.getByRole("dialog")).toContainText(
    "plausible connections, not confirmed",
  );
  await board.screenshot({
    path: "test-results/practice-history-tv.png",
    fullPage: true,
  });
  await pages[0].screenshot({
    path: "test-results/practice-history-phone.png",
    fullPage: true,
  });
  await practiceGuess(pages[0], [2, 4, 3]);
  await practiceGuess(pages[4], [2, 4, 3]);
  await reveal(host, 4);
  await practiceGuess(pages[0], [3, 1, 2]);
  await practiceGuess(pages[4], [3, 1, 2]);
  await reveal(host, 4);
  await expect(
    board.getByRole("heading", { name: "White wins the practice match" }),
  ).toBeVisible();
  await expect(board.locator(".practice-final")).toContainText("Fire");
  await host.locator(".practice-review summary").first().click();
  await expect(host.locator(".practice-review")).toContainText("Bark → Dog");
  await host.getByRole("button", { name: "Ready for a real match" }).click();
  await expect(board.getByRole("dialog")).toHaveCount(0);
  await expect(board.locator("h1")).toHaveText("Waiting for players");
}
