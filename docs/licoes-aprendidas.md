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

## Custos do produto 1 (tabela)
Seedance de teste ~US$ 2,31 (descartado: 5–10× mais caro) · Wan v1 US$ 0,84 · Kling (falha + timeout) ~US$ 0,42 · 3 regravações de 4 s ~US$ 1,02. Total ≈ US$ 4,60.
