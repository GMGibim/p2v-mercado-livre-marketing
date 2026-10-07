# P2V Mercado Livre Marketing

Agente e ferramentas para transformar **as fotos de um anúncio do Mercado Livre** num **clip vertical (9:16, 10–20 s)** com vídeo gerado por IA, **voz**, **legenda sincronizada** e **música** — pronto para subir como Clip no anúncio.

```
fotos do anúncio ─► refs ─► produto (Wan, 10 s) ─────────────────────────┐
                            pessoa: quadro fixo ─► clipe (Kling, 4–8 s) ─┴─► join ─► voz + legenda + música ─► clip final
   npm run refs        npm run video        npm run clip                 npm run join     npm run audio
```

Feito para ser operado por um agente de código (Codex, Claude Code etc.): as regras e o fluxo estão em [`AGENTS.md`](AGENTS.md). Também dá para rodar os comandos à mão.

## O que você precisa

- Node.js 20+ e `ffmpeg` (com `ffprobe`) no PATH.
- Conta na **[Higgsfield](https://open.higgsfield.ai)** (vídeo e edição de imagem) com chave de API e saldo.
- Conta na **[ElevenLabs](https://elevenlabs.io)** (voz). Contas grátis usam só as vozes padrão pela API; uso comercial exige plano pago — confira os termos.
- Uma faixa de música livre para uso comercial (ex.: **[Pixabay Music](https://pixabay.com/music/)**).

## Instalação

```bash
git clone https://github.com/GMGibim/p2v-mercado-livre-marketing.git
cd p2v-mercado-livre-marketing
npm install
cp .env.example .env.local   # preencha as chaves; o arquivo não vai para o git
```

## Uso rápido

```bash
cp -r products/_template products/meu-produto            # edite products/meu-produto/product.json
npm run refs  -- meu-produto                             # baixa e prepara as fotos
npm run video -- meu-produto --dry-run                   # payload e custo estimado do vídeo do produto
npm run video -- meu-produto                             # gera (cobra)
npm run clip  -- meu-produto uso --dry-run               # clipe da pessoa entre quadros fixos
npm run join  -- meu-produto "montagem" "<produto>.mp4@0-10" "<clipe>.mp4"
npm run audio -- meu-produto --music ../_shared/musica/minha-faixa.mp3
```

Os vídeos saem em `products/<produto>/out/` com nomes `[Produto] - [Modelo] vN - [ajuste].mp4`. Fotos, vídeos, vozes, músicas e a pasta `products/_shared/` **não** são versionados (`.gitignore`).

## Comandos

| Comando | Faz |
|---|---|
| `npm run refs -- <produto>` | Baixa e recorta as fotos, adiciona margem em imagens estreitas e amplia as pequenas |
| `npm run video -- <produto> [--model wan\|kling] [--dry-run]` | Gera o vídeo do produto a partir das referências |
| `npm run reshoot -- <produto> <plano> "<ajuste>" [--base <arquivo>] [--start s] [--end s] [--dry-run]` | Regera um plano e emenda no vídeo |
| `npm run clip -- <produto> <clipe> [--dry-run]` | Anima um clipe (Kling O3) **entre quadros fixos** de início e fim: a técnica para acertar a pose do produto em uso |
| `npm run join -- <produto> "<ajuste>" "<arq>[@ini-fim]" ...` | Junta trechos de `out/` (com recorte opcional), sem custo |
| `npm run frame -- <produto> "<vídeo>" <segundos> <nome.png> [--crop w:h:x:y]` | Extrai um quadro para usar como referência |
| `npm run sheet -- <produto> "<vídeo>"` | Gera uma montagem de 10 quadros para revisão |
| `npm run voices` | Lista vozes femininas em português na ElevenLabs |
| `npm run audio -- <produto> [--music ../_shared/musica/x.mp3] [--base <arquivo>]` | Voz (com cache), legenda estilo CapCut e música de fundo |

## Custos de referência

| Item | Preço (out/2026) |
|---|---|
| Wan 3.0 Prime 720p | ~US$ 0,084/s (10 s ≈ US$ 0,84) |
| Kling O3 std | cobrado entre ~US$ 0,07/s e ~US$ 0,125/s (a tabela promocional dizia US$ 0,042/s) |
| Edição de imagem (Grok Imagine 2.0) | ~US$ 0,04 por imagem |
| Voz ElevenLabs | créditos do plano (~150 caracteres por clip) |
| Música Pixabay | grátis |

Produtos feitos até aqui (custo aproximado, com tentativas):

| Produto | Destaque | Custo |
|---|---|---|
| [Philips MG3927](products/philips-mg3927/product.json) | primeiro produto, pessoa fixa nasce aqui | ~US$ 4,6 |
| [Philips Walita S7887](products/philips-walita-s7887/product.json) | quadros fixos, transição porta giratória | ~US$ 6 |
| [Philips OneBlade QP220](products/philips-oneblade-qp220/product.json) | produto de reposição, troca da peça | ~US$ 3,2–3,8 |
| [Mondial Climatizador CL-03](products/mondial-climatizador/product.json) | cena em casa, clipe único de 8 s | ~US$ 3,4–5,2 |
| [Philips depilador rosa](products/philips-depilador-rosa/product.json) | pessoa nova, quadro base do usuário | ~US$ 2,2–3,1 |

## Pessoa fixa

`products/_shared/` (fora do git) guarda os retratos e quadros do "Jorge Sérgio", o modelo que aparece nos anúncios (variantes barbudo e só de bigode), e as músicas em `_shared/musica/`.

## Documentação

- [`AGENTS.md`](AGENTS.md) — fluxo e **todas as regras** (fonte única).
- [`docs/modelos-de-prompt.md`](docs/modelos-de-prompt.md) — prompts reutilizáveis e o trecho de código da edição de imagem.
- [`docs/regras-mercado-livre.md`](docs/regras-mercado-livre.md) — o que pode e o que não pode nos clips, a partir da lista oficial.
- [`docs/licoes-aprendidas.md`](docs/licoes-aprendidas.md) — diário de cada produto e de onde veio cada regra.

## Segurança

Chaves só no `.env.local` (ignorado pelo git). O SDK da Higgsfield é usado apenas no terminal. Nunca cole chaves em chats ou issues.
