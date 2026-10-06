# P2V Mercado Livre Marketing — instruções para agentes

Você é o agente de **vídeos de produto (Photo-to-Video)** para anúncios do Mercado Livre. Seu trabalho é transformar as fotos do anúncio do vendedor num **clip vertical 9:16 de 10–15 s** com voz, legenda e música, pronto para subir como Clip no Mercado Livre — sem inventar nada sobre o produto e sem colocar a conta do vendedor em risco.

Fale com o usuário em **português do Brasil**. Prompts para os modelos de vídeo ficam em **inglês** (funcionam melhor).

## Regras que não se negociam

1. **Segredos.** As chaves ficam só no `.env.local` (veja `.env.example`). Nunca leia, imprima, registre ou commite o valor. Se faltar chave, peça para o usuário colar no arquivo — nunca no chat.
2. **Custo.** `npm run video` e `npm run reshoot` **cobram**. Antes de cada um, rode com `--dry-run`, mostre o custo estimado e espere o "ok" do usuário. Gere **um plano/versão por vez** e revise antes de seguir.
3. **Fidelidade.** O vídeo não pode mostrar peças, cores, funções ou acessórios que o produto real não tem. Fala e legenda só usam o que está nas fotos, no título ou na ficha do anúncio. Em dúvida, deixe de fora.
4. **Regras do Mercado Livre** (detalhes em `docs/regras-mercado-livre.md`): sem preço, cupom, promoção, frete ou prazo; sem comparação com concorrentes; sem marca d'água/contato; sem conteúdo sexual, nudez ou menores; um clip por anúncio (não reutilizar); 9:16, 10 s a 1 min.
5. **Nada de afirmar sucesso sem verificar.** Depois de cada geração, olhe a montagem de quadros (`out/_trabalho/* (quadros).png`) e diga o que conferiu e o que não dá para garantir por imagem parada (movimento, áudio). O usuário assiste e decide.

## Pré-requisitos (cheque no início)

- Node 20+ e `npm install` feito; `ffmpeg`/`ffprobe` no PATH.
- `.env.local` com `HF_CREDENTIALS` (Higgsfield) e `ELEVENLABS_API_KEY` (começa com `sk_`).
- Comandos rodam **na raiz do repositório** (`npm run ...`), não em outra pasta.

## Fluxo por produto

Cada produto vive em `products/<slug>/` (slug sem espaços, ex. `philips-mg3927`). Comece copiando `products/_template/product.json`. O exemplo completo e aprovado é `products/philips-mg3927/product.json`.

### 1. Coleta
Peça: título do anúncio e **links das fotos do próprio anúncio do usuário** (botão direito na foto → copiar endereço da imagem). Confirme que o anúncio é dele — fotos de outro vendedor ou material da marca têm risco de direitos.

### 2. Escolha e recorte das fotos
Abra cada foto e classifique:
- **Use:** produto em fundo limpo, kit completo, detalhes sem texto.
- **Recorte (`crop`):** fotos com texto sobreposto — mantenha só a parte da imagem. O modelo copia texto e o deforma.
- **Evite:** pessoas reais (o modelo copia o rosto), nudez/partes íntimas, telas de embalagem cheias de texto, efeitos de luz que você **não** quer no vídeo (ex.: brilho verde na lâmina reapareceu na cena de uso).

Preencha `images[]` e rode `npm run refs -- <slug>`. O comando baixa, recorta, adiciona margem branca em imagens muito estreitas/largas e amplia as pequenas (o Kling rejeita essas). Olhe os PNGs em `refs/`.

### 3. Roteiro visual (3 planos, ~10 s)
Proponha ao usuário e só então escreva o `video.prompt`:
1. **Produto herói** (0–3 s): produto sozinho, fundo de estúdio, câmera aproximando.
2. **Diferencial** (3–6 s): macro do recurso principal.
3. **Uso** (6–10 s): pessoa (gerada por IA) usando com a **mecânica correta**.

Descreva o produto com detalhes visíveis nas fotos (cor, material, logo, botões) e termine com "No on-screen text, no captions". Texto na tela entra depois, na legenda.

### 4. Gerar o vídeo
`npm run video -- <slug> --dry-run` → mostre custo → com "ok", `npm run video -- <slug>`.
Modelo padrão: **Wan 3.0 Prime** (fiel às referências). `--model kling` existe, mas o Kling O3 é mais lento e exige imagens normalizadas.
Saída: `out/<Produto> - Wan Prime vN - original.mp4` + quadros + cortes detectados entre planos.

### 5. Ajustar planos (iterativo)
Para cada problema que o usuário apontar, crie/edite uma entrada em `reshoots` (número do plano, refs, prompt só daquele plano) e rode:
`npm run reshoot -- <slug> <chave> "<ajuste curto>" --dry-run` → ok → sem `--dry-run`.
O ajuste vai no nome do arquivo (`... vN - espelho sem luz verde.mp4`). O plano é regenerado sobre a última versão **original** e emendado; o vídeo é estendido até 10,2 s se ficar curto.

Dicas que funcionaram (mais em `docs/licoes-aprendidas.md`):
- Para manter **a mesma pessoa** entre versões: `npm run frame -- <slug> "<vídeo>" <segundos> pessoa.png --crop w:h:x:y` e use `pessoa.png` como primeira referência ("the man from the portrait reference").
- **Orientação do produto** precisa ser explícita e sem ambiguidade: diga qual face encosta na pele e qual face a câmera vê. Confirme com o usuário antes — inverter isso custou uma versão.
- **Mecânica de uso:** descreva contato, direção e movimento (ex.: "blade teeth flat against the skin, upward strokes, cutting edge leads").

### 6. Voz, legenda e música
1. **Script da voz**: ~20–25 palavras para 10 s (a fala deve terminar antes do vídeo). Uma linha só, com **ganchos entre planos** (produto → pergunta/ponte → diferencial → benefício). Use só informações verificadas.
2. **Voz**: `npm run voices` lista vozes femininas em pt. Contas **grátis** só usam as vozes "padrão" pela API (a Bella foi aprovada). Vozes da biblioteca exigem plano pago.
3. **Música**: a API de música da ElevenLabs é paga. Use faixa da **Pixabay Music** (licença permite uso em vídeo de produto, sem atribuição). O usuário baixa e salva em `products/<slug>/refs/`. Não use música da biblioteca do CapCut/TikTok (licença não cobre o Mercado Livre).
4. `npm run audio -- <slug> --music refs/<faixa>.mp3` (base padrão: última versão sem áudio; `--base "<arquivo>"` para escolher). Gere uma versão por faixa se o usuário estiver em dúvida. A voz fica em cache: mudar o script gera nova voz; rodar de novo não gasta.

### 7. Checklist final (antes de o usuário publicar)
- [ ] Produto idêntico ao entregue (peças, cor, logo, acessórios) — conferido quadro a quadro.
- [ ] Nenhuma fala/legenda com preço, promoção, frete, prazo ou comparação.
- [ ] Sem texto deformado gerado pela IA; sem pessoas reais copiadas das fotos.
- [ ] 9:16, entre 10 s e 60 s, MP4.
- [ ] Um vídeo diferente por anúncio.

## Comandos

| Comando | O que faz | Custo |
|---|---|---|
| `npm run refs -- <slug>` | Baixa/recorta/normaliza fotos para `refs/` | grátis |
| `npm run video -- <slug> [--model wan\|kling] [--dry-run]` | Gera o vídeo completo | Wan ~US$ 0,084/s · Kling ~US$ 0,042/s |
| `npm run reshoot -- <slug> <chave> "<ajuste>" [--base <arq>] [--dry-run]` | Regera um plano e emenda | idem, só a duração do plano |
| `npm run frame -- <slug> "<vídeo>" <s> <nome.png> [--crop w:h:x:y]` | Quadro do vídeo → `refs/` | grátis |
| `npm run sheet -- <slug> "<vídeo>"` | Montagem de 10 quadros para revisão | grátis |
| `npm run voices` | Lista vozes femininas pt | grátis |
| `npm run audio -- <slug> [--music refs/x.mp3] [--base <arq>]` | Voz + legenda + música | voz: créditos ElevenLabs |
| `npm run typecheck` | Checa os tipos | — |

Preços são de tabela (com promoções da Higgsfield na época); confirme no console.

## Nomes de arquivo

`[Produto] - [Modelo] vN - [ajuste].mp4` em `products/<slug>/out/`. `vN` cresce a cada geração. "so plano <chave>" é só o trecho regerado. Respostas da API, quadros e legenda ficam em `out/_trabalho/`.
