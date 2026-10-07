# Diário de produtos

O que aconteceu em cada produto e qual regra saiu dali. As regras ficam só no `AGENTS.md` (códigos R, J, P, E, M, A, V); aqui fica o histórico. Custos são estimativas pela tabela e pelo que o usuário viu no console.

## 1. Philips MG3927 — aparador 9 em 1

- Fotos com texto ("Pente íntimo", "Lâminas autoafiáveis"): recortadas → **R1**. Foto de homem sem camisa e de pessoa real no espelho: fora → **R2, R3**.
- O Kling recusou uma foto de 280×1154 e um recorte de 320 px → `refs` passou a normalizar → **R7**.
- O brilho verde da foto da lâmina apareceu na cena de uso → **R5**.
- O homem passava o aparador com a lateral; descrever o contato e o sentido resolveu → **P3**.
- Cada regravação criava outra pessoa; o rosto extraído de uma versão aprovada (`npm run frame`) virou referência → origem da **pessoa fixa (J1)**.
- O aparador saiu 180° invertido porque o pedido de orientação estava ambíguo → **P1**.
- O plano emendado ficou com 9,97 s → extensão automática → **M5**.
- Custo ≈ US$ 4,60, incluindo um teste descartado com Seedance (5 a 10 vezes mais caro que o Wan).

## 2. Philips Walita S7887 — barbeador rotativo

- Fotos do anúncio com "NORELCO", garantia dos EUA e "2000/7000 Series" → **R4**; fala com "Série 7000" → **A2**.
- O plano tech gerou "2000 Series" legível no corpo → **E5**; saiu horizontal com faixas borradas → **E4**.
- A pegada errou três vezes no prompt, mesmo com print de referência; resolveu com quadros fixos de fotos que o usuário gerou → **P4, P5**, comando `npm run clip`.
- Barbeador rotativo não tira barba cheia: o conceito virou "só de bigode", e a variante de bigode do Jorge foi feita por edição de imagem → **J1**. Editar de novo em cima da edição escureceu o cabelo e afastou o rosto → **J2**.
- Misturar a foto do produto com a pose fez o modelo girar o barbeador → **E6**.
- A transição "câmera gira 180°" virou rolagem de cabeça para baixo; a porta giratória funcionou → **E3**. A emenda ficou contínua terminando a transição no quadro em que o clipe seguinte começa → **M1**.
- Uma fala de 29 palavras durou 16 s e cobriu o gesto final → **A4**.
- A detecção de corte não achou o plano 3 → **M4**.
- Custo ≈ US$ 6 (cerca de metade em tentativas descartadas).

## 3. Philips OneBlade QP220 — lâmina de reposição

- O produto é só a lâmina; o aparelho não vem na caixa → **A3**. "Dura até 4 meses*" ficou de fora → **A1**.
- O barbear parecia retoque de maquiagem (toquinhos curtos) → **P2**.
- O modelo desenhou a base de plástico solta sobre o cabo; no produto real ela vem presa à lâmina → **R6** ("one single unit"). A foto da mão com a peça solta induzia o erro e saiu das referências.
- O encaixe do cabo saiu diferente do real; um print do detalhe real resolveu na primeira tentativa → **R6**.
- Fotos de avaliação de clientes mostraram o produto real, com texto da caixa e QR code → **R1**.
- Custo ≈ US$ 3,2–3,8.

## 4. Mondial Climatizador CL-03

- O título diz "Flash Air" e o aparelho diz "Fresh Air": a fala ficou só com "Climatizador Mondial" → **A2**. "Livre de bactérias", temperatura e "substitui o ar-condicionado" ficaram de fora → **A1**.
- O quadro do Jorge no sofá foi gerado com retrato + foto de pose + produto e depois ajustado por edição (climatizador virado para ele, meias no lugar do tênis, versão barbuda de camisa vermelha) → modelo **T4**.
- Depois de várias edições o Jorge "mudou"; o resgate foi editar a cena aprovada levando os retratos originais e descrevendo os traços → **J2**, modelo **T2**. No corpo inteiro o rosto fica pequeno → **J3**.
- O prompt dizia "no visible breath, no vapor" e o Kling desenhou uma nuvem branca saindo da boca. Cortar o trecho no `join` tirou a nuvem e também a respiração, e o usuário recusou → **M2**. Reescrever sem nomear o efeito resolveu → **E1**.
- A névoa do climatizador podia sugerir água pulverizada; foi tirada do quadro inicial e o vento ficou só no cabelo e na camiseta → **regra 3, E2**, modelo **T3**.
- Ação e reação num clipe só de 8 s, sem corte → **M3**.
- Uma geração foi recusada por saldo ("credit balance is too low"), sem cobrança → **regra 2**.
- Custo ≈ US$ 3,4–5,2 (Wan US$ 0,84 + quatro clipes de 8 s + ~9 edições de imagem).

## 5. Philips depilador rosa (com fio)

- A modelo loira foi gerada direto pelo Wan, com o rosto fora do quadro: o cabelo loiro não aparecia → **J4**; e o aparelho ficou deitado ao longo da canela → **P5**.
- Três rodadas de edição de imagem (texto, croqui e composição nova) não mudaram a pose nem o enquadramento: o modelo se prendeu à imagem da mulher → **P4**. O usuário gerou a imagem base com a pose certa.
- "Perpendicular" teve duas leituras: na primeira base, o aparelho estava com a face do botão para a câmera; o certo era visto de lado, horizontal, a 90° da perna → **P1**. O movimento passou a ser só de baixo para cima no comprimento da perna → **P2, P3**.
- Os prints de referência eram de outro modelo (com faixa vermelha), e a base herdou uma faixa que o produto não tem. O usuário corrigiu só a aparência com o prompt **T1** → **R4, E6**.
- Um recorte de revisão mal posicionado mostrou só a borda do aparelho → **V1**.
- Custo ≈ US$ 2,2–3,1.

## Ambiente e técnico

| Situação | O que fazer |
|---|---|
| `uploadImage` do SDK da Higgsfield retorna 403 (SignatureDoesNotMatch) | A API devolve `upload_headers` (inclui `x-amz-tagging`) que precisam ir no PUT. Já implementado em `src/higgsfield.ts`. |
| O Kling passou de 5 min e o SDK desistiu; o job continuou e foi cobrado, com o ID perdido | `maxPollTime` de 20 min. A API pública não lista requisições: sem o ID, só pelo console. |
| Modelos de áudio da Higgsfield só via CLI, com login próprio; o Windows Defender pôs o executável da CLI em quarentena (detecção heurística) | Não contornar o antivírus. Voz pela API da ElevenLabs. |
| ElevenLabs: "API key ID used as API key" | A chave válida começa com `sk_` e só aparece na criação ou rotação. |
| ElevenLabs grátis: vozes da biblioteca e API de música bloqueadas | Vozes padrão (Bella) e música da Pixabay em `products/_shared/musica/`. |
| Música vs. voz | Música a 18% fica 8–11 dB abaixo da voz; fade-out no último segundo. |
| Legenda no ffmpeg quebrava com caminhos do Windows | Caminhos com `/` e slug sem espaços (o `.ass` vai dentro do filtro). |
| `ffmpeg drawtext` causou segfault (Fontconfig) no Windows | Não usar `drawtext`; para tempos, use a legenda gerada. |
| `npm run refs` falhou com "fetch failed" uma vez | Instabilidade da rede ou do CDN: rode de novo. |
| A verificação de segurança do ambiente do agente bloqueou o terminal várias vezes seguidas | Falha passageira do ambiente. Faça o que não depende de comando (editar `product.json`), tente de novo e, se persistir, entregue os comandos prontos ao usuário. |
