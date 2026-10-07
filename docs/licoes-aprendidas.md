# Lições aprendidas (produto 1: Philips MG3927)

Problemas reais do primeiro produto e o que resolveu. Leia antes de escrever prompts.

## Fotos de referência
| Problema | Solução |
|---|---|
| Fotos do anúncio com texto ("Pente íntimo", "Lâminas autoafiáveis") | Recortar só a parte da imagem (`crop`). O modelo copia texto e deforma. |
| Foto com homem sem camisa / tema íntimo | Não usar: risco de moderação (Higgsfield `nsfw`) e de política no Mercado Livre. |
| Foto com pessoa real (homem no espelho) | Não usar como referência; descrever uma pessoa nova no prompt. |
| Kling O3 recusou: "image dimensions or aspect ratio are not supported" | Foto 280×1154 (muito estreita) e recorte 320 px (pequeno). `npm run refs` agora adiciona margem branca (proporção 1:2 a 2:1) e amplia para ≥ 512 px. |
| Brilho verde da foto da lâmina apareceu no plano de uso | Tirar a foto com efeito de luz das refs daquele plano e dizer "no light, no glow" no prompt. |

## Prompts
| Problema | Solução |
|---|---|
| Pessoa passava o aparador com a lateral (não cortaria nada) | Descrever a mecânica: "blade teeth flat against the skin, teeth pointing upward, slow upward strokes against hair growth, cutting edge leads, the side never touches the face". Referência visual do usuário (vídeo de alguém aparando) ajudou a escrever. |
| Cada regravação criava uma pessoa diferente | Extrair o rosto de uma versão aprovada (`npm run frame ... --crop`) e usar como primeira referência: "the man from the portrait reference". |
| Aparador 180° invertido | Ser explícito sobre **qual face encosta na pele e qual a câmera vê**. Confirmar a orientação com o usuário antes de gerar — a primeira tentativa inverteu o pedido e custou uma versão. |
| Câmera passou a mostrar a pessoa "real" na frente do espelho (mão/nuca em primeiro plano) | Se incomodar, pedir "only the mirror reflection is visible, no foreground person". |

## Técnico
| Problema | Solução |
|---|---|
| `uploadImage` do SDK da Higgsfield retorna 403 (SignatureDoesNotMatch) | A API devolve `upload_headers` (inclui `x-amz-tagging`) que precisam ir no PUT. Implementado em `src/higgsfield.ts`. |
| Kling passou de 5 min e o SDK desistiu (job continuou e foi cobrado; ID perdido) | `maxPollTime` de 20 min. A API pública não lista requisições — sem o ID, só pelo console. |
| Vídeo emendado ficou com 9,97 s (< 10 s do Mercado Livre) | `splice` estende o último quadro até 10,2 s. |
| Legenda no ffmpeg quebrava com caminhos do Windows | Caminhos com `/` e slug sem espaços (o `.ass` vai dentro do filtro). |

## Áudio
| Problema | Solução |
|---|---|
| Modelos de áudio da Higgsfield só via CLI com login próprio; o Windows Defender pôs o executável da CLI em quarentena (`Trojan:Win32/Bearfoos.A!ml`, detecção heurística) | Não contornar o antivírus. Voz pela API da ElevenLabs. |
| Chave da ElevenLabs "ID usado como chave" | A chave válida começa com `sk_` e só aparece na criação/rotação. |
| Plano grátis: vozes da biblioteca e API de música bloqueadas | Vozes padrão (Bella aprovada) + música da Pixabay em `refs/`. |
| Música vs. voz | Música a 18% fica 8–11 dB abaixo da voz (bom para fundo). Fade-out no último segundo. |

## Produto 2: Philips Walita S7887 (barbeador rotativo) — o que mudou

| Problema | Solução |
|---|---|
| Fotos do anúncio de outra região: corpo com "NORELCO", selo de garantia dos EUA, "2000/7000 Series" | Conferir os textos **ampliados** antes de usar a foto e deixar fora as que não batem com o produto entregue; falar "Série 7000" (está no corpo e na caixa). O plano tech gerou "2000 Series" legível na base: a solução foi **enquadrar só as cabeças**, sem corpo nem texto. |
| Plano tech saiu horizontal, com faixas borradas em cima e embaixo | Pedir "portrait composition that fills the entire frame, no letterbox, no blurred bars" e "filmed from slightly above". |
| Pegada errada 3 vezes (lâminas viradas para a câmera, máquina dentro da barba, de lado) mesmo com print de referência | Prompt não resolveu. Funcionou **animar entre quadros fixos** (foto da pose certa como `first_frame_url`/`last_frame_url` no Kling): `npm run clip`. As fotos da pose o usuário gerou/aprovou. |
| Barbeador rotativo não tira barba cheia | O conceito do vídeo mudou para "só de bigode, pele lisa": o Jorge precisa de uma referência **só de bigode**. Editar o retrato (barba → bigode) com `xai/grok-imagine-image-2.0` funcionou; mas editar de novo em cima da edição escureceu o cabelo e afastou o rosto. |
| Misturar a foto do produto com a pose na edição de imagem fez o modelo girar o produto | Editar só a cor/forma, com a pose pronta como única entrada, e não usar a foto de outro modelo de barbeador como referência de forma. |
| Plano de uso muito fechado e corte entre clipes quebrando o fluxo | Quadros 9:16 com mais cena em volta; terminar um clipe exatamente no quadro em que o próximo começa e cortar 0,1 s do seguinte no `join`. |
| Transição barbudo → bigode: "câmera gira 180°" virou rolagem com a imagem de cabeça para baixo | Dizer **o eixo e o que fica parado**: câmera fixa, o espelho vira uma lâmina que gira no eixo vertical, como porta giratória; no verso, o Jorge já está sem barba e barbeando. Terminar no quadro 2 (perfil, máquina na bochecha). |
| Fala de 29 palavras durou 16 s e cobria o gesto final | A Bella fala ~2 palavras/s; "360-D" e siglas ficam longos. Enxugar a fala para terminar antes do último plano e deixar só música no gesto final. |
| Cobrança do Kling acima da tabela | Tabela US$ 0,042/s; saiu ~US$ 0,07/s (4 s = 0,28) e uma geração de 4 s com quadro inicial e final custou 0,50. Dar faixa de custo e pedir confirmação no console. |
| Detecção de corte não achou o plano 3 (planos parecidos) | `reshoot --start <s>` informa o ponto à mão. |
| `ffmpeg drawtext` com Fontconfig quebrou (segfault) no Windows | Não usar `drawtext`; para olhar tempos, imprimir os quadros sem texto ou usar a legenda gerada. |

Custos do produto 2 (estimativa): Wan base + tech ≈ US$ 1,1 · Kling (barbear perfil 0,28 + final 0,21 + transições, a última 0,50) ≈ US$ 1,5 · edições de imagem ≈ US$ 0,25 · tentativas descartadas ≈ US$ 3. Total próximo de US$ 6.

## Produto 3: Philips OneBlade QP220 (lâmina de reposição) — o que mudou

| Problema | Solução |
|---|---|
| O produto vendido é só a **lâmina de reposição**; o aparelho não vem na caixa | Herói e planos de detalhe mostram a embalagem e as lâminas; o aparelho só aparece como contexto de uso. A fala diz "lâmina de reposição" e "compatível com todos os cabos OneBlade" (isso está na descrição do anúncio; conferir antes de afirmar). |
| "Dura até 4 meses" aparece com asterisco | A descrição amarra a condição ("2 vezes por semana, resultados podem variar"). Fora da fala e da legenda. |
| Fotos do anúncio com mão e rosto reais (troca da lâmina, homem barbudo em oval) | Usadas só como referência de **forma**; a pessoa vem do Jorge fixo. Foto de avaliação de cliente serve de referência do produto real, mas traz texto da caixa e QR code: recortar só a parte do produto, senão o modelo copia o texto. |
| Barbear parecendo "retoque de maquiagem" (toquinhos curtos e repetidos) | Descrever **passadas longas e contínuas**: "uma passada lenta da orelha até o canto da mandíbula, levanta, uma segunda passada mais abaixo, uma longa pelo pescoço; a lâmina fica em contato durante cada passada, nunca toques". Clipe de 5 s para caber duas passadas. |
| O modelo desenhou a base de plástico da lâmina solta sobre o cabo | No produto real a **base preta vem presa à lâmina** (colar redondo e duas hastes longas). Dizer no prompt "ONE single unit, the base is part of the blade and never separate" e usar a foto das unidades na bandeja (recorte sem texto) como referência. A foto da mão com a peça solta induzia o erro, então saiu das referências. |
| O encaixe do cabo vazio saiu largo, com furo redondo e duas fendas, diferente do real | Mandar **print do detalhe real** (abertura estreita, pino hexagonal central, fendas em "X", furinhos nos cantos, plaquinha com triângulo) como primeira referência e descrever o formato no prompt. Resolveu na primeira tentativa. |
| Final do clipe com deriva de identidade (olhos fechados, cabelo mais volumoso) | Acontece no fim de clipes de 3 s sem quadro final: o prompt de "gesto final" solta o rosto. Se aparecer, regenerar só esse plano pedindo cabeça reta e cabelo igual. Neste produto a reação final do Jorge foi aprovada como estava. |
| Detecção de corte não achou planos no Wan (nenhum corte detectado) | Os planos do Wan eram parecidos (fundo único). Use `reshoot --start/--end` com os tempos do roteiro (ex.: `--start 6 --end 10`). |
| Verificação de segurança do ambiente falhou várias vezes seguidas e bloqueou o terminal | Falha passageira do ambiente, não do comando. Fazer o que não depende de comando (editar `product.json`), tentar de novo mais tarde e, se persistir, dar ao usuário os comandos prontos. |

Custo do produto 3 (estimativa, Kling com a faixa observada): Wan base US$ 0,84 + 4 trocas/ajustes de 4 s no Wan (~US$ 1,4) + Kling uso e final (~US$ 0,9–1,5) ≈ US$ 3,2–3,8.

## Custos do produto 1 (tabela)
Seedance de teste ~US$ 2,31 (descartado: 5–10× mais caro) · Wan v1 US$ 0,84 · Kling (falha + timeout) ~US$ 0,42 · 3 regravações de 4 s ~US$ 1,02. Total ≈ US$ 4,60.
