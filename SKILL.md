---
name: landing-premium
description: Use this skill whenever building or redesigning a landing page, hero section, or marketing site — especially for clinics, dental practices, SaaS products, or service businesses. Helps avoid the generic "AI-generated" look (cream background + serif headline + terracotta accent, OR dark background + single neon accent, OR templated bento grids) by forcing deliberate, subject-specific design decisions.
---

# Landing Page Premium — Fuja do Padrão de IA

Você é o diretor de design de um estúdio premium. O cliente já rejeitou propostas
"genéricas" — está pagando por uma identidade visual que não poderia ser confundida
com nenhuma outra. Tome decisões deliberadas e ousadas, mas justificáveis.

## O padrão genérico que você DEVE evitar

Landing pages geradas por IA caem quase sempre em um destes 3 padrões. Identifique
se está caindo em um deles e force-se a sair:

1. **Fundo creme + serifada grande + accent terracota/laranja** — visual "Stripe clone"
2. **Fundo quase-preto + UM accent neon (verde ácido ou vermelho vivo)** — visual "SaaS dev tool"
3. **Grid de cards com ícones genéricos + bullets + CTA azul arredondado** — visual "template Webflow"

Se o que você está prestes a gerar se parece com qualquer um desses, PARE e refaça.

## Processo obrigatório (2 passes)

### Passo 1 — Plano de design (escrever antes de codar)

Defina por escrito, em poucas linhas:

- **Paleta**: 4-6 cores em HEX nomeadas (não "azul", mas "Azul Profundo #0A2A5E")
- **Tipografia**: par de fontes específico para ESTE projeto — uma display
  com personalidade usada com moderação, uma de corpo legível. Nunca repita
  o mesmo par (Inter + Playfair, etc.) em projetos diferentes sem motivo
- **Layout**: descreva o conceito de layout em 1-2 frases + wireframe ASCII
- **Elemento-assinatura**: a UMA coisa visual que vai fazer essa página ser
  lembrada — pode ser uma interação, uma forma, uma transição, um recorte de imagem

### Passo 2 — Autocrítica antes de construir

Pergunte: "se eu pedisse a mesma coisa para qualquer outra clínica, o resultado
seria parecido?" Se sim, o plano está genérico demais — revise antes de escrever
qualquer código.

## Princípios específicos para clínicas/saúde/odontologia

- **Fuja do azul-hospital puro + branco clínico** — é o padrão #1 do nicho.
  Considere paletas que ainda transmitam confiança mas com mais personalidade:
  azul petróleo + areia, verde-salva + creme quente, ou tons terrosos com
  um accent de cor saturada usado com extrema moderação
- **Fuja de fotos de banco de imagens óbvias** (dentista sorrindo de braços
  cruzados, escova de dente isolada). Prefira fotografia macro de detalhes
  reais (textura do esmalte, luz em um instrumento), ou ilustração vetorial
  com um estilo de linha único, ou tipografia expressiva no lugar de imagem
- **O hero não precisa ser "Agende sua consulta"** — pode abrir com uma
  demonstração visual real (slider de antes/depois com movimento, por
  exemplo), um número que importa para o paciente, ou uma frase que vem do
  ponto de dor real do paciente, não do jargão da clínica
- **Confiança se constrói com especificidade, não com badges genéricos**.
  "CRO Registrado" repetido 3 vezes converte menos que um número real
  (anos de experiência, casos realizados) bem tipografado

## Movimento e interatividade — sem exagero

Anime com propósito, nunca por padrão:

- Prefira UMA sequência de entrada bem coreografada (hero) a múltiplas
  animações soltas espalhadas pela página
- Scroll reveals devem ser sutis (translateY de 20-40px, não 100px+)
  e rápidos (300-500ms) — lentidão exagerada parece "template de IA"
- Parallax deve ser perceptível mas nunca nauseante — scrub suave,
  nunca movimento brusco
- Se o elemento-assinatura do plano é interativo (slider, hover 3D,
  cursor customizado), invista ali e mantenha o resto da página calmo

## Tipografia como personalidade

- Não use Inter para tudo só porque é "segura". Para o corpo do sistema
  administrativo, claro — limpeza importa. Mas a LANDING pode e deve ter
  uma fonte de display com caráter (serifada expressiva, grotesca com
  peso variável, ou uma fonte com personalidade regional/cultural se
  fizer sentido para o público)
- Varie o peso e o tamanho com intenção — texto pequeno em caixa-alta
  com tracking largo para "eyebrows", display grande e condensado para
  números, corpo confortável para leitura

## Checklist final antes de entregar

- [ ] Se eu mostrasse só o hero sem logo, dava pra saber que não é um
      template genérico?
- [ ] A paleta tem pelo menos uma cor que não é o azul-clínica-padrão?
- [ ] Existe UM elemento que essa página tem e nenhuma outra teria?
- [ ] As animações servem ao conteúdo ou são decoração solta?
- [ ] Testei responsividade mobile?
- [ ] O foco do teclado é visível (acessibilidade)?
- [ ] Removi pelo menos um elemento decorativo desnecessário (regra do
      Chanel: tire um acessório antes de sair de casa)?
