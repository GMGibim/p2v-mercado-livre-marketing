# Modelos de prompt e edição de imagem

Prompts que funcionaram, prontos para adaptar. As regras que explicam cada um estão no `AGENTS.md` (códigos entre parênteses).

## Edição de imagem pela Higgsfield

Não há comando `npm run` para isso. Crie um script temporário na raiz do repositório, rode e apague:

```ts
// tmp-edit.mts — npx tsx --env-file=.env.local tmp-edit.mts
import { writeFile } from "node:fs/promises";
import { higgsfield } from "@higgsfield/client/v2";
import { uploadImage } from "./src/higgsfield.ts"; // uploadImage também configura as credenciais

const urls = [
  await uploadImage("products/<slug>/refs/<imagem-base>.png"), // image 1: a que será editada
  // await uploadImage("products/_shared/<ref>.png"),          // image 2, 3...: referências
];
const prompt = `Edit image 1. ...`;
const r: any = await higgsfield.subscribe("xai/grok-imagine-image-2.0", {
  input: { prompt, image_urls: urls, aspect_ratio: "9:16", resolution: "2k", quality: "medium" },
  withPolling: true,
});
const url = r.images?.[0]?.url;
if (r.status !== "completed" || !url) throw new Error(`${r.status} ${r.error ?? ""}`);
await writeFile("products/<slug>/refs/<saida>.png", Buffer.from(await (await fetch(url)).arrayBuffer()));
```

~US$ 0,04 por imagem. Gere no máximo 2 variações por rodada, mostre ao usuário e espere aprovação antes de animar.

## T1 — Trocar só a aparência do produto, travando a pose (E6, R4, P4)

Use quando a pose está certa e o produto está diferente do real (cor, faixa, cabeça, botão). Também é o prompt para entregar ao usuário quando o modelo de imagem não acerta a pose (P4). Anexe a imagem da pose como image 1; a foto do produto como image 2 só se a ferramenta não girar o produto.

```
Edit image 1. Keep absolutely everything the same: the person, face, hair, clothes, the room, the lighting, the framing, the hands, the cord, and above all the exact position, angle and rotation of the <product>: <descreva a orientação em três pontos, P1>. Do NOT rotate, move, resize or reposition the <product>.

Only change the appearance of the <product> so it matches the real product shown in image 2:
- Body: <cor e acabamento>, one uniform color. Remove <o que está errado, ex.: the darker band/stripe>.
- <parte funcional, ex.: the tip pressed against the skin is a rounded silver metal head made of small metal discs>.
- <botão, logo, indicadores>.
- <cabo/fio e onde ele sai>.
Keep the size of the <product> the same as in image 1. Photorealistic, natural skin texture, no text other than <logo real>.
```

## T2 — Resgatar a identidade da pessoa fixa numa cena aprovada (J2, J3)

Image 1 é a cena aprovada; images 2, 3… são as referências **originais** da pessoa (retrato e quadros de vídeo aprovados).

```
Edit image 1. Keep exactly the same: the room, the furniture, the clothes, the pose, the product and its position, the framing and the light.
Only change the man's head: he must look exactly like the man in images 2, 3 and 4. <traços: idade, cabelo (cor, ondulação, penteado), olhos, sobrancelhas, mandíbula, barba ou bigode (cor e corte)>. Same pose and angle. Natural, candid, unretouched look: visible skin texture and pores, a few flyaway hairs, not a polished render, not airbrushed.
```

## T3 — Tirar um efeito do quadro inicial (E1, E2)

```
Edit image 1. Keep everything exactly the same: <pessoa, roupa, pose, cenário, luz, produto e posição>.
Only change: the air everywhere is completely clear and transparent; the <área afetada, ex.: grille of the air cooler and the space in front of it> show nothing in the air, and the <objetos atrás> are sharp and clean. Keep <o que mostra o efeito desejado, ex.: his hair and t-shirt very slightly moved>. Photorealistic.
```

## T4 — Quadro de cena com pessoa fixa e produto (J1, J5, P1)

Images: retrato(s) da pessoa, foto de referência **só da pose** (sem copiar rosto, roupa ou cenário), foto do produto.

```
Photorealistic vertical photo, full body.
Images 1 and 2 show the man: keep his exact face, hair, eyes and <barba/bigode>. Image 3 is a pose reference only: copy only <a pose>; do NOT copy that person's face, clothes or room. Image 4 is the product.
Scene: <cenário, luz>. The man <pose detalhada>, wearing <roupa>.
<Produto> from image 4, exactly as in that image, <posição e orientação em relação à pessoa, P1>.
Natural, candid, unretouched look: visible skin texture and pores, slight natural asymmetry, a few flyaway hairs, not a polished render, not airbrushed.
```

## T5 — Ajustar só o olhar e a posição da cabeça (J6)

Image 1 é o quadro escolhido; image 2 é o quadro cujo olhar é o desejado.

```
Edit image 1. Keep absolutely everything the same: the person's identity, hair, <barba>, <acessórios, ex.: safety glasses>, gloves, clothes, the <cenário>, the <produto> and its exact position, his hands, the framing and the light.
Only change his gaze and head pose, matching the man in image 2: his head is turned in three-quarter profile toward <alvo>, his eyes are <descrição, ex.: narrowed behind the safety glasses> and fixed on <alvo exato do olhar, ex.: the tip of the drill bit where it touches the wall>, <expressão, ex.: a serious, intense, concentrated expression with slightly furrowed brows>. Do not copy anything else from image 2 (not hair, clothes, wall or tool). Photorealistic, natural skin texture.
```

Gere 2 variações e mostre ao usuário.

## Clipe de movimento (Kling, `clips`)

Estrutura que funcionou nos `prompt` de `clips`:

1. Quem e onde (curto): "The bearded man lies back relaxed on the brown sofa…".
2. Produto **igual ao primeiro quadro**, com a orientação em três pontos (P1).
3. Movimento com sentido e forma (P2), e a mecânica do tipo de produto (P3).
4. Reação final, se houver, nos últimos 2 s.
5. "Camera almost static", identidade estável ("His face, hair and beard stay exactly the same all the time"), J5 e "No text".
6. Nada de nomear efeitos indesejados (E1).
