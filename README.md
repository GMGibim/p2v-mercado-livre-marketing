# P2V Mercado Livre Marketing

Agente e ferramentas para transformar **as fotos de um anúncio do Mercado Livre** num **clip vertical (9:16, 10–15 s)** com vídeo gerado por IA, **voz**, **legenda sincronizada** e **música** — pronto para subir como Clip no anúncio.

```
fotos do anúncio ──► refs normalizadas ──► vídeo 3 planos (Wan 3.0 Prime) ──► ajustes por plano ──► voz + legenda + música ──► clip final
   npm run refs          npm run video                    npm run reshoot           npm run audio
```

Feito para ser operado por um agente de código (Codex, Claude Code etc.): as instruções do agente estão em [`AGENTS.md`](AGENTS.md). Também dá para rodar os comandos à mão.

## O que você precisa

- Node.js 20+ e `ffmpeg` (com `ffprobe`) no PATH.
- Conta na **[Higgsfield](https://open.higgsfield.ai)** (vídeo) com chave de API.
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
cp -r products/_template products/meu-produto     # edite products/meu-produto/product.json
npm run refs  -- meu-produto                      # baixa e prepara as fotos
npm run video -- meu-produto --dry-run            # mostra payload e custo estimado
npm run video -- meu-produto                      # gera (cobra)
npm run reshoot -- meu-produto uso "uso com mecanica correta" --dry-run
npm run audio -- meu-produto --music refs/minha-faixa.mp3
```

Os vídeos saem em `products/<produto>/out/` com nomes `[Produto] - [Modelo] vN - [ajuste].mp4`. Fotos, vídeos, vozes e músicas **não** são versionados (`.gitignore`).

Exemplo real e aprovado: [`products/philips-mg3927/product.json`](products/philips-mg3927/product.json).

## Comandos

| Comando | Faz |
|---|---|
| `npm run refs -- <produto>` | Baixa/recorta as fotos, adiciona margem em imagens estreitas e amplia as pequenas |
| `npm run video -- <produto> [--model wan\|kling] [--dry-run]` | Gera o vídeo completo a partir das referências |
| `npm run reshoot -- <produto> <plano> "<ajuste>" [--base <arquivo>] [--dry-run]` | Regera um plano (detectado por corte de cena) e emenda no vídeo |
| `npm run clip -- <produto> <clipe> [--dry-run]` | Anima um clipe (Kling O3) **entre quadros fixos** de início e fim: a técnica para acertar a pose do produto em uso |
| `npm run join -- <produto> "<ajuste>" "<arq>[@ini-fim]" ...` | Junta trechos de `out/` (com recorte opcional), sem custo |
| `npm run frame -- <produto> "<vídeo>" <segundos> <nome.png> [--crop w:h:x:y]` | Extrai um quadro para usar como referência (ex.: manter a mesma pessoa) |
| `npm run sheet -- <produto> "<vídeo>"` | Gera uma montagem de 10 quadros para revisão |
| `npm run voices` | Lista vozes femininas em português na ElevenLabs |
| `npm run audio -- <produto> [--music refs/x.mp3] [--base <arquivo>]` | Voz (com cache), legenda estilo CapCut e música de fundo |

## Custos de referência

| Item | Preço de tabela (out/2026) |
|---|---|
| Wan 3.0 Prime 720p | ~US$ 0,084/s (10 s ≈ US$ 0,84) |
| Kling O3 std | tabela US$ 0,042/s (promoção); **cobrado ~US$ 0,07/s** e até ~US$ 0,125/s em clipes com quadro inicial e final |
| Voz ElevenLabs | créditos do plano (~150 caracteres por clip) |
| Música Pixabay | grátis |

O primeiro produto (Philips MG3927) saiu por cerca de US$ 4–5 em gerações, incluindo testes e 3 regravações de plano. O segundo (Philips Walita S7887, com pessoa fixa e quadros de referência) ficou perto de US$ 6.

## Pessoa fixa

`products/_shared/` (fora do git) guarda o retrato e os quadros do "Jorge Sérgio", o modelo que aparece em todos os anúncios, e as músicas em `_shared/musica/`. Os exemplos reais estão em [`products/philips-walita-s7887/product.json`](products/philips-walita-s7887/product.json).

## Documentação

- [`AGENTS.md`](AGENTS.md) — fluxo completo e regras para o agente.
- [`docs/regras-mercado-livre.md`](docs/regras-mercado-livre.md) — o que pode e o que não pode nos clips.
- [`docs/licoes-aprendidas.md`](docs/licoes-aprendidas.md) — problemas reais e como foram resolvidos.

## Segurança

Chaves só no `.env.local` (ignorado pelo git). O SDK da Higgsfield é usado apenas no servidor/terminal. Nunca cole chaves em chats ou issues.
