# CRM Browser — Interação automatizada com o CRM Odontológico

Skill para controlar o CRM Odontológico rodando em http://localhost:5173 via dev-browser --connect.

## Iniciar sessão de teste

```powershell
# 1. Verificar porta 9222
Get-NetTCPConnection -LocalPort 9222 -State Listen -ErrorAction SilentlyContinue

# 2. Se não ativa, iniciar Chrome
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222

# 3. Iniciar dev server (em outro terminal)
# cd C:\Users\Adriana\Desktop\CRM\crm-odonto-react && pnpm dev
```

## Script: Login completo

```powershell
@"
const page = await browser.getPage("main");
await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });

// Clicar no botão login na Navbar
await page.click("button[class*='nav-login'], .nav-login, button:has-text('Login'), button:has-text('Entrar')");
await page.waitForSelector(".minp", { timeout: 5000 });

// Preencher credenciais
await page.fill("input[placeholder='Usuário']", "admin");
await page.fill("input[placeholder='Senha']", "admin123");
await page.evaluate(() => document.querySelector(".mbtn").click());

await page.waitForURL("**/admin", { timeout: 5000 });
console.log("Login OK. URL:", page.url());
"@ | dev-browser --connect
```

## Script: Screenshot da tela atual

```powershell
@"
const page = await browser.getPage("main");
await page.screenshot({ path: "C:/Users/Adriana/AppData/Local/Temp/crm-screenshot.png" });
console.log("Screenshot salvo");
"@ | dev-browser --connect
```

## Script: Ler título e URL

```powershell
@"
const page = await browser.getPage("main");
console.log("Titulo:", await page.title());
console.log("URL:", page.url());
"@ | dev-browser --connect
```
