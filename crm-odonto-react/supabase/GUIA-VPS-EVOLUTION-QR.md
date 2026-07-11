# Guia — VPS + Evolution API para conectar WhatsApp por QR Code

Este é o único passo que depende de você (Lucas): contratar um VPS e subir a Evolution API.
Todo o resto (tela, banco, integração) já está pronto no CRM. Depois de fazer isto, você cola
2 dados na Central WhatsApp (⚙ → WhatsApps conectados por QR) e pronto.

## 1. Contratar um VPS (~R$ 25–40/mês, serve para TODOS os seus clientes)
Opções boas e baratas:
- **Hetzner Cloud** (CX22, ~€4,5/mês) — https://www.hetzner.com/cloud — melhor custo, data center na Alemanha
- **Contabo** (VPS S, ~R$ 30/mês) — https://contabo.com — tem opção com IP no Brasil
- **DigitalOcean / Vultr** (~US$6/mês) — mais caros, mais simples

Escolha Ubuntu 22.04. Mínimo 2 GB RAM.
> IMPORTANTE: a compra e a conta do VPS são suas — eu não posso pagar nem criar a conta.
> Quando tiver o IP e o acesso SSH, me avise que eu te passo os comandos exatos (ou faço junto).

## 2. Instalar a Evolution API (1 bloco de comandos, via SSH no VPS)
```bash
# instala Docker
curl -fsSL https://get.docker.com | sh

# cria a chave global (guarde este valor — é a "API key" que vai na Central)
APIKEY=$(openssl rand -hex 24); echo "SUA_API_KEY = $APIKEY"

# sobe a Evolution API v2
docker run -d --name evolution --restart always -p 8080:8080 \
  -e AUTHENTICATION_API_KEY="$APIKEY" \
  -e DEL_INSTANCE=false \
  atendai/evolution-api:v2.1.1
```

## 3. Deixar acessível por HTTPS (a Meta/CRM exige URL https)
Opção mais simples — Cloudflare Tunnel (grátis, sem abrir porta):
```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
cloudflared tunnel --url http://localhost:8080
# ele imprime uma URL https://xxxx.trycloudflare.com  ← essa é a "URL do servidor"
```
(Para produção séria, depois trocamos por um domínio fixo com Nginx + Let's Encrypt.)

## 4. Ligar no CRM (30 segundos, na tela)
1. Entre no CRM como admin → **Central WhatsApp** → botão **⚙**
2. Em "📱 WhatsApps conectados (QR Code)", cole:
   - **URL do servidor** = a URL https do passo 3
   - **API key** = o valor `SUA_API_KEY` do passo 2
3. Clique **➕ Conectar por QR** → dê o nome (ex: "Recepção — Ana") → aparece o QR Code
4. No celular da funcionária: WhatsApp → **Aparelhos conectados** → **Conectar aparelho** → escaneia
5. Pronto — as conversas dela caem na Central. Repita para cada funcionário.

## Segurança / observações
- A `API key` fica guardada no banco (RLS admin) e é usada só pelo servidor do CRM — nunca aparece no navegador.
- Conexão por QR é o WhatsApp Web não-oficial: tem risco de bloqueio se usar para disparo em massa.
  Para atendimento (receber e responder) é o uso correto e seguro. Disparo em massa = use a Cloud API oficial.
- Se o QR sumir antes de escanear, clique em "Conectar por QR" de novo (ele expira rápido, é normal).
