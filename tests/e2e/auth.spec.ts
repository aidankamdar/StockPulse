import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("landing page loads and has sign in link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("StockPulse")).toBeVisible();
    await expect(page.getByText("Sign in")).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("register page loads", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("Create an account")).toBeVisible();
    await expect(page.getByLabel("Display Name")).toBeVisible();
  });

  test("login page has link to register", async ({ page }) => {
    await page.goto("/login");
    const signUpLink = page.getByRole("link", { name: "Sign up" });
    await expect(signUpLink).toBeVisible();
  });

  test("register page has link to login", async ({ page }) => {
    await page.goto("/register");
    const signInLink = page.getByRole("link", { name: "Sign in" });
    await expect(signInLink).toBeVisible();
  });
});
