# Context Tree for Outline Cards — Guia do usuário (Português Brasileiro)

🇬🇧 [English](https://github.com/hugomarins/remnote-context-for-cloze/blob/main/README.md) | 🇨🇳 [中文](https://github.com/hugomarins/remnote-context-for-cloze/blob/main/README_ZH.md) | 🇪🇸 [Español](https://github.com/hugomarins/remnote-context-for-cloze/blob/main/README_ES.md)

Deixe suas revisões mais claras mostrando o cartão atual **cercado pelo seu outline**. A fila do RemNote já lhe dá os ancestrais de um cartão; este plugin desenha abaixo dele uma “árvore de contexto” compacta que acrescenta tudo o que está *ao redor* — os irmãos e os sub‑ramos deles, e as respostas que carregam — para você se situar, associar e recordar, sem alterar o conteúdo do cartão nem o agendamento.

> **Renomeado na 0.2.0.** O plugin se chamava *Context for Cloze*, e seu power‑up de âncora também se chamava *Context for Cloze*. Agora ambos dizem **Context Tree**, porque a árvore não é mais só sobre clozes — ela funciona com todos os tipos de cartão. Nada do que você já marcou é afetado: o código armazenado do power‑up continua sendo `contextForCloze`, e o Rem da marcação é renomeado no lugar na primeira vez que esta versão carrega. Se você mesmo tinha renomeado essa marcação, o seu nome é preservado. O comando que a adiciona agora é **Add Context Tree to the Cards in This Outline**, código rápido `cont` (antes `cfc`).

![Alternando o modo de cloze com o botão de olho e fixando a escolha com o botão de etiqueta](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/context-for-cloze-mode-switch.gif)

## Por que você iria querer isso — dois modos de estudo em que ele se encaixa

**1) Estudar listas como clozes em contexto, em vez de como cartões de lista.**
Um conjunto ou uma enumeração é a coisa mais cara que você pode colocar numa fila de revisão. Respondê‑lo leva muito tempo, é avaliado em tudo‑ou‑nada, é candidato natural a leech e, na maior parte das vezes, você não precisa de fato *produzir* a lista inteira sob demanda — você precisa ter compreendido o que há nela. Escrever a lista como um outline e clozar as palavras que sustentam o sentido sai muito mais barato: cada lacuna vira um cartão pequeno, então revisá‑la é rapidíssimo e um tropeço em um item custa um lapso em vez de derrubar a lista toda. O que normalmente se perde nisso é a própria lista — uma lacuna solta, sem os irmãos ao redor, é difícil de situar. A árvore de contexto devolve isso: toda lacuna é exibida **dentro da sua própria lista**, com os itens vizinhos visíveis, então você mantém a forma do conjunto enquanto recorda uma peça dele. Quando os vizinhos entregam demais, o `Context Hide Others` os esconde e você os descobre um a um.

**2) Anotações em estilo outline.**
O RemNote já mostra a *linhagem* de um cartão — a cadeia de ancestrais que vai do documento até a linha em revisão. O que ele não mostra é nada que esteja **ao lado** dessa cadeia: os irmãos do cartão e os ramos pendurados nos seus ancestrais. Em notas de outline é justamente aí que costuma morar o significado, porque um item é definido tanto pelo que está *ao lado* dele quanto pelo que está *acima* dele — um cartão retirado de um contraste de quatro itens continua respondível, mas o contraste se perdeu. Marque o topo do outline uma vez e a árvore desenha o ramo inteiro sob cada cartão abaixo dele, linhagem e vizinhança juntas, com toda resposta que não seja a sua ou revelada como contexto ou mascarada, à sua escolha. É também assim que você percebe a interferência (a regra 11 da lista de Woźniak): itens confundíveis costumam ser irmãos, e não dá para notar a confusão olhando para um deles isoladamente.

Os dois casos funcionam com **qualquer tipo de cartão**: clozes, cartões Conceito/Descritor, cartões de Pergunta, ou uma mistura deles na mesma árvore.

## Funcionalidades
- Context Tree (núcleo)
  - Adicione o power‑up “Context Tree” (código: `contextForCloze`) a um Rem. Todos os seus descendentes, quando revisados como cartões, exibirão abaixo uma árvore de contexto enraizada nesse Rem.
  - Funciona com **todos os tipos de cartão**, não só clozes: um Rem do tipo Conceito/Descritor/Pergunta mostra o seu **verso** na árvore, ligado à frente por uma seta que indica a direção do cartão (`⇒` direta, `⇐` inversa, `⇔` ambas).
  - Fase de pergunta: o contexto é exibido evitando qualquer vazamento da resposta — seja o cloze em teste, seja o lado inteiro que o cartão está pedindo.
  - Fase de resposta: o contexto permanece; a resposta revelada é indicada por um sublinhado azul com destaque azul‑claro, para facilitar a comparação.
- Context Hide Others (`contextHideAllTestOne`) — aplica‑se a **um único Rem**, não a uma subárvore.
  - Por padrão, a árvore de contexto esconde apenas a resposta que está sendo testada; toda *outra* resposta da árvore — outras linhas com cloze e o verso de todos os demais cartões — aparece revelada. Marque um cartão com este power‑up quando não quiser que a revisão **daquele cartão** seja estragada pelos vizinhos: enquanto ele estiver em revisão, todas as demais respostas ficam escondidas (exibidas como `…`).
  - Aplique‑o ao Rem do cartão que receberia o spoiler (a folha), e **não** à âncora nem ao pai. Veja [Context Hide Others](#context-hide-others--protegendo-um-cloze-de-seus-irmãos) abaixo.
- Como adicionar power‑ups aos Rems
  - Comandos:
    - Add Context Tree to the Cards in This Outline (código rápido `cont`)
    - Context: Hide Other Answers for This Rem (código rápido `conthide`, antes `cfchide`)
  - Funcionam com seleção múltipla.
- Ícones de marcação no editor
  - Os dois power‑ups mostram uma pequena marca na etiqueta do Rem no lugar do nome: uma árvore de nós azul para “Context Tree”, e a mesma árvore com as respostas substituídas por `…` — no âmbar que a fila usa para uma resposta escondida — para “Context Hide Others”. Se você renomeou a marcação, o texto dela é preservado.

## Compatibilidade com power‑ups de exibição na fila (plugin oficial “Hide in Queue” e plugin “Incremental Everything”)
A árvore de contexto espelha os power‑ups de exibição na fila do plugin oficial “Hide in Queue” do RemNote **e** do plugin Incremental Everything. Este plugin não registra nenhum deles — apenas lê suas marcações quando existem, de modo que nada é afetado se um power‑up não estiver instalado.

Marcados no próprio item:
- Hide in Queue (`hideInQueue`)
  - Exibe o texto de espaço reservado “Hidden in queue” para aquele item na árvore de contexto (somente na fase de pergunta; na fase de resposta o item aparece normalmente).
- Remove from Queue (`removeFromQueue`)
  - Remove o item por completo da árvore de contexto (nas duas fases).
- No Hierarchy (`noHierarchy`)
  - Quando presente no cartão atual, a área de contexto mostra apenas “esta linha” (sem ancestrais, irmãos ou descendentes), igual ao comportamento nativo do RemNote.

Marcados no cartão, mas com efeito sobre um ancestral (Incremental Everything):
- Hide Parent (`hideParent`) / Hide Grandparent (`hideGrandparent`)
  - Exibe o espaço reservado “Hidden in queue” na linha do pai / avô do cartão (somente na fase de pergunta).
- Remove Parent (`removeParent`) / Remove Grandparent (`removeGrandparent`)
  - Remove por completo da árvore de contexto a linha do pai / avô do cartão (nas duas fases); os filhos restantes permanecem, sem recuo.

A linha do próprio cartão atual é sempre exibida, independentemente de qualquer uma dessas marcações.

## Versos e setas de direção
Um Rem que é um cartão guarda a resposta no seu **verso** (`backText`) — é o que um Rem do tipo Conceito, Descritor ou Pergunta armazena. A árvore de contexto mostra os dois lados, unidos por uma seta que diz em que direção o cartão é perguntado:

| Seta | Direção de prática | Lê‑se como |
| --- | --- | --- |
| `⇒` | Direta (forward) | a frente pergunta, o verso responde |
| `⇐` | Inversa (backward) | o verso pergunta, a frente responde |
| `⇔` | Ambas (both) | qualquer lado pode perguntar |

É a mesma notação usada pelo plugin *Incremental Everything*, então um cartão se lê da mesma forma nos dois.

- Quando o Rem em revisão é ele próprio um cartão frente/verso, o lado perguntado aparece como um **?** azul na fase de pergunta e é revelado com sublinhado + destaque depois do “Show Answer” — exatamente o que já acontecia com um cloze.
- Todos os *outros* cartões da árvore mostram os dois lados revelados por padrão, e escondem o lado da resposta atrás de um único `…` clicável quando a árvore está no modo escondido (veja o botão de olho abaixo).
- Um Rem sem verso é desenhado exatamente como antes.

### Cartões inversos de Descritor testam o Conceito, não o Descritor
O RemNote tem [um caso especial aqui](https://help.remnote.com/en/articles/6751778-creating-concept-descriptor-flashcards): um **cartão inverso em um Descritor mostra o verso do Descritor, mas pergunta pelo Conceito acima dele**, e não pelo Descritor em si. Pedir que você responda “*abreviação*” não serve para nada; mostrar “*abreviação ⇐ PC*” e perguntar *de que PC é abreviação* é o cartão de verdade.

A árvore segue esse comportamento. Em um cartão inverso de Descritor:

- O **?** mascarado vai para o **ancestral mais próximo que não seja Descritor** — o conceito que está sendo testado — e não para o rótulo do próprio descritor. Se houver descritores aninhados em vários níveis, a árvore sobe por todos eles até o primeiro Conceito de verdade.
- A linha desse conceito fica reduzida ao **?** puro na fase de pergunta: o verso dele também é removido, porque a definição de um conceito nomeia o conceito e entregaria a resposta.
- A linha do próprio descritor continua totalmente visível — ela é o enunciado.
- Depois do “Show Answer” o conceito reaparece por inteiro, sublinhado e destacado, com o verso restaurado.
- Se o descritor não tiver nenhum Conceito ancestral dentro da árvore, nada é mascarado. A resposta simplesmente não é exibida, então não há vazamento.

O rótulo de um descritor nunca é tratado como resposta em lugar nenhum da árvore, então o “Hide Other Answers” não apaga os rótulos *abreviação* / *definição* que dão forma ao outline.

## Recolhida por padrão — expanda o que precisar
A árvore de contexto começa **recolhida**. Apenas o ramo que leva até o cartão em revisão fica aberto, de modo que a linha testada está sempre visível enquanto os descendentes mais profundos — que muitas vezes entregam a resposta ou dão pistas demais — permanecem escondidos.

- Uma linha com filhos escondidos exibe uma **seta ▸** no lugar do marcador; clique nela (ou dê foco e pressione Enter/Espaço) para expandir aquele ramo. A seta aponta para baixo quando o ramo está aberto.
- Uma linha sem filhos escondidos mantém seu marcador.
- A expansão é por cartão: ela se reinicia quando você passa para o próximo.
- Prefere a árvore sempre expandida de antes? Desative **Start Collapsed** nas configurações.

## Os botões de olho e de etiqueta — alternar o modo das respostas durante a revisão
A árvore exibe as respostas das outras linhas em um de dois modos: **revelado** (sublinhado azul, o padrão) ou **escondido** (`…`, o padrão para um cartão marcado com `Context Hide Others`). “Resposta” cobre os dois casos: um cloze dentro de uma linha e o verso de uma linha que é cartão. Um **botão 👁 no canto superior direito da área de contexto** alterna entre os dois para o cartão à sua frente.

![Alternando o modo de cloze com o botão de olho e fixando a escolha com o botão de etiqueta](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/context-for-cloze-mode-switch.gif)

- Olho **aberto** = as outras respostas estão reveladas. Clique para escondê‑las.
- Olho **cortado** = as outras respostas estão escondidas como `…`. Clique para revelá‑las.
- Use‑o *antes* de ler a árvore quando as respostas reveladas acabarem entregando uma pista que você preferia conquistar — sem precisar marcar o Rem antes.
- Use‑o *depois* do “Show Answer” quando a árvore escondida ficar críptica demais.
- Por si só, ele não altera nada na sua base de conhecimento: a marcação continua decidindo o ponto de partida, e o modo se reinicia no próximo cartão.
- O botão só aparece quando alguma outra linha realmente contém uma resposta própria — um cloze ou um verso — caso contrário, não há o que alternar.
- No modo escondido, cada `…` continua clicável individualmente, então você também pode descobrir uma resposta de cada vez. Um verso escondido é um único `…` para o lado inteiro; um cloze é um `…` por lacuna.

**Torne isso permanente — o botão 🏷 de etiqueta.** Assim que o olho deixa a árvore em um modo que discorda da marcação do cartão, um segundo botão aparece **à esquerda do olho**. Ao clicá‑lo, a escolha é gravada no próprio Rem, de modo que toda revisão futura comece assim:

- Ícone de etiqueta simples = *adicionar* `Context Hide Others` a este Rem (manter as outras respostas escondidas).
- Ícone de etiqueta cortado = *remover* a marcação deste Rem (manter as outras respostas reveladas).
- Passe o mouse ou o foco sobre qualquer um dos botões e uma breve explicação aparece na mesma linha, à esquerda dos ícones.
- O botão desaparece assim que a marcação corresponde ao que você vê, e um aviso confirma a mudança. Esta é a única ação do plugin que escreve na sua base de conhecimento.

## Configurações (Settings → Plugins → este plugin)
- Start Collapsed (padrão: ligado)
  - Desenha a árvore recolhida, com apenas o caminho até o cartão atual aberto; os demais ramos ficam atrás de uma seta ▸ clicável. A profundidade não é mais limitada — é o recolhimento que mantém uma árvore profunda legível, então você vê toda a hierarquia e abre só o que quiser.
- Max Nodes (padrão: 200)
  - Um limite de segurança para quantos Rems a árvore **percorre** antes de parar. Ramos recolhidos também são percorridos, então é isso — e não o recolhimento — que evita que um cartão sob uma âncora enorme trave a fila. Aumente se uma árvore vier truncada; reduza se um documento muito grande deixar os cartões lentos para aparecer.
- Debug Mode (padrão: desligado)
  - Acrescenta dicas extras na interface e no console para diagnóstico (a maioria dos usuários pode deixar desligado).

## Como usar
1. Escolha um Rem como “âncora de contexto” — o topo do outline que você quer que os cartões enxerguem — e adicione a ele o power‑up “Context Tree” (`contextForCloze`), pelo comando **Add Context Tree to the Cards in This Outline** (`cont`).
2. Comece a revisar: sempre que qualquer descendente virar um cartão, uma árvore de contexto enraizada na âncora aparece abaixo dele.
3. Opcional: se um cartão fosse ser estragado pelas respostas reveladas dos vizinhos, adicione “Context Hide Others” **àquele cartão** — execute **Context: Hide Other Answers for This Rem** (`conthide`). Veja a seção dedicada abaixo.
4. Clique nas setas ▸ durante a revisão para abrir o ramo que quiser ver; o resto fica fora do caminho.
5. Use o botão 👁 no canto superior direito da área de contexto para revelar ou esconder as respostas das outras linhas sempre que o modo atual não servir para o cartão — e o botão 🏷 ao lado se quiser fixar essa escolha no Rem.
6. Deixe o Max Nodes como está, a menos que uma árvore venha truncada (aumente) ou que um documento muito grande deixe os cartões lentos para aparecer (reduza).

## Context Hide Others — protegendo um cloze de seus irmãos

**O que faz.** Por padrão, a árvore de contexto mascara a linha em revisão e revela todo o resto. Toda resposta que esteja em *outra* linha — os clozes dela e o verso de todos os demais cartões — aparece **revelada** (sublinhado azul), de modo que as respostas ao redor funcionam como contexto visível.

`Context Hide Others` inverte isso para o cartão em que é aplicado: enquanto aquele cartão está em revisão, **todas as outras** respostas da árvore ficam **escondidas** (exibidas como `…`) em vez de reveladas. Note a diferença de alcance em relação à marcação da âncora: `Context Tree` é colocado na **raiz** de um outline e afeta todos os descendentes, enquanto esta é colocada em **um único Rem** e afeta apenas as revisões desse Rem.

A marcação define somente o modo **inicial** — o botão 👁 descrito acima o inverte nos dois sentidos para o cartão à sua frente, sem alterar a marcação.

### Quando não há âncora de contexto acima do Rem
Esta marcação só muda a aparência de uma *árvore de contexto*, e uma árvore de contexto só existe abaixo de um Rem marcado com `Context Tree`. Marcar um Rem sem esse ancestral não faria absolutamente nada, então o comando verifica isso antes. Se a âncora estiver faltando, aparece um diálogo explicando a situação e oferecendo três saídas:

- **Marcar também o pai** — o pai se torna a âncora de contexto e o Rem selecionado recebe `Context Hide Others`. O diálogo nomeia o pai e expõe a consequência de antemão: uma âncora se propaga em cascata, então *todos* os cartões abaixo daquele pai passarão a exibir uma árvore de contexto. Ele também informa quantos irmãos o Rem tem, já que é desses irmãos que o contexto é feito — sem nenhum, a árvore ficaria rala e talvez um ancestral mais alto seja a âncora melhor.
- **Marcar apenas este Rem** — adiciona a marcação mesmo assim; ela fica dormente até que algum ancestral se torne uma âncora.
- **Cancelar** — nada é gravado.

Em uma seleção múltipla, os Rems que já estão sob uma âncora são marcados imediatamente e o diálogo pergunta apenas sobre os demais.

A linha do próprio cartão atual é sempre escondida como `?`, independentemente deste power‑up, e o texto de contexto sem cloze é sempre exibido. Este power‑up muda apenas como os *outros* clozes aparecem.

**Onde aplicar.**
- Aplique **ao Rem do cartão de cloze que receberia o spoiler indesejado dos irmãos** — ou seja, a folha cuja revisão você quer manter limpa. Não é um marcador de grupo: ele protege o cartão específico em que está.
- **Não** aplique à âncora nem ao pai que carrega `Context Tree`. O efeito é atrelado ao Rem do cartão que está sendo revisado e não é herdado árvore abaixo, então uma marcação no pai não faz nada.
- A proteção é por cartão e unidirecional: marcar o cartão A limpa apenas **a revisão do próprio A**; não influencia o que B ou C mostram quando chegar a vez deles. Por isso, quando vários irmãos se estragariam mutuamente, marque **cada** cartão que quiser proteger — qualquer irmão deixado sem marcação continuará revelando todas as respostas durante a própria revisão.
- Dica: selecione os cartões de cloze que quiser proteger e execute **Context: Hide Other Answers for This Rem** (`conthide`) — o comando funciona com seleção múltipla, então dá para marcá‑los de uma vez.

**Quando usar.** Use quando um pai agrupa vários clozes irmãos que se estragariam se exibidos juntos — por exemplo, uma lista enumerada em que cada item é seu próprio cartão de cloze, ou um conjunto de fatos paralelos que você quer recordar de forma independente. Mantenha o padrão (não marcar) quando as respostas vizinhas forem contexto legítimo que você *quer* ver enquanto recorda a atual.

**Revelar os clozes escondidos um a um (clique para revelar).** Quando um cartão está protegido dessa forma, cada `…` escondido é um botão. Clique nele (ou dê foco e pressione Enter/Espaço) para revelar no lugar apenas a resposta daquele cloze; clique de novo para escondê‑la outra vez como `…`. Isso permite autoavaliar aos poucos — um por um — os clozes escondidos ao redor, mesmo que não sejam o cartão testado. Cada `…` alterna de forma independente, a lacuna testada em si permanece escondida (ela nunca se torna clicável) e todas as revelações se reiniciam automaticamente quando você passa para o próximo cartão.

## Dicas
- O plugin só é desenhado na fila de revisão; a visão do editor não é afetada.
- Se o cartão atual não estiver sob nenhuma âncora “Context Tree”, nenhuma árvore de contexto é exibida.
- Quando usado junto com No Hierarchy (`noHierarchy`), apenas a linha atual é exibida. Isso é intencional.

## Capturas de exemplo

Todas as capturas abaixo vêm de um único documento real — [*Effective learning: Twenty rules of formulating knowledge*](https://supermemo.guru/wiki/20_rules_of_formulating_knowledge), de Piotr Woźniak, anotado em estilo outline. É um assunto conveniente para este plugin porque é o próprio argumento a favor dele: as regras **9 (Avoid sets)** e **10 (Avoid enumerations)** são exatamente o motivo pelo qual você clozaria uma lista em contexto em vez de fazer um cartão da lista inteira, e a regra **16 (Context cues simplify wording)** é o que a árvore automatiza.

Para reproduzi‑las: ponha o cursor no Rem do título do documento, execute **Add Context Tree to the Cards in This Outline** (`cont`) e comece a revisar.

1) **A âncora — o que você marca e do que a árvore é feita**

   O documento no editor, com `Context Tree` no Rem do título. Tudo abaixo dele passa a ser revisado com árvore; as regras numeradas são os ramos.

   ![Âncora](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/01-anchor.png)

2) **Um cloze dentro da sua lista — fase de pergunta** *(caso de uso 1)*

   Revisando *“2. `{{Learn}}` before you `{{memorize}}`”*. O cartão pede uma lacuna; a árvore devolve essa linha à lista a que ela pertence, com o restante das vinte regras em volta.

   Esta é a alternativa barata ao cartão de conjunto, e o documento prova o argumento sobre si mesmo: um cartão que pergunte *“liste as vinte regras de Woźniak”* é exatamente o item que as regras 9 e 10 mandam não construir — avaliado em tudo‑ou‑nada e leech em potencial. Clozar as palavras‑chave de cada regra é muito mais rápido de revisar, custa um único lapso quando escapa em vez de derrubar a lista inteira, e, como a árvore mantém os outros títulos à vista, você pode reensaiar a forma da enumeração toda vez que um de seus membros aparece.

   Dois detalhes de renderização aparecem nesta captura:

   - **A linha em revisão mostra as *duas* lacunas como `?`**, embora só uma esteja sendo testada. A área de cartão do RemNote, acima, já renderiza aquela linha corretamente — *Learn* revelada, a lacuna testada mascarada — então a árvore sai da frente e tira a linha inteira de jogo.
   - **As outras linhas mostram as suas respostas.** A regra 8 aparece como *“`Graphic` deletion is as good as `cloze` deletion”*, com as duas lacunas preenchidas e sublinhadas. Esse é o padrão: tudo, exceto a linha em revisão, aparece respondido, como contexto. A captura 4 inverte isso.

   ![Cloze em contexto, fase de pergunta](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/02-cloze-question.png)

3) **O mesmo cartão, fase de resposta**

   Depois do *Show Answer*: a lacuna recuperada aparece sublinhada e destacada em azul, deixando imediatamente claro por qual parte da frase você era responsável.

   ![Cloze em contexto, fase de resposta](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/03-cloze-answer.png)

4) **`Context Hide Others` — quando os vizinhos entregam a resposta**

   Duas capturas do mesmo cartão: a linha de duas lacunas sob **9. Avoid sets**.

   **Sem a marcação — o padrão.** Tudo, exceto a linha em revisão, aparece respondido. O irmão destacado em vermelho, *“if sets are absolutely necessary, you should always try to ⇒ **convert them into Enumerations**”*, lhe entrega boa parte do que essa regra diz antes que você tenha recordado qualquer coisa — e as regras 2 e 8 também estão com as próprias lacunas preenchidas.

   ![Padrão: as respostas vizinhas aparecem reveladas](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/04-hide-others.png)

   **Com `Context Hide Others` (`conthide`) — recomendado para um cartão assim.** Toda *outra* resposta da árvore encolhe para um `…`: os versos dos irmãos e os clozes das regras 2 e 8. Cada `…` é um botão, então, depois de responder o seu próprio cartão, dá para clicar neles um a um e se autoavaliar no resto. O olho no canto superior direito agora está cortado, e é assim que você vê de relance em que modo está.

   ![Recomendado: as respostas vizinhas ficam escondidas](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/04-hide-others-recomended.png)

   Compare as duas: a linha em revisão é idêntica nas duas. A marcação nunca toca no cartão que está sendo perguntado — só nos vizinhos dele.

5) **Um cartão frente/verso, sua seta de direção e a prévia de uma referência**

   Revisando *“you should avoid such items whenever possible ⇒ ?”* — um Descritor direto sob **9. Avoid sets**. O verso é a resposta, então a árvore o mascara como **?**, e o `⇒` registra que o rem tem um cartão perguntado da frente para o verso.

   A linha logo abaixo mantém a própria resposta, e essa resposta carrega uma referência de Rem: *“…you should always try to ⇒ convert them into **Enumerations**”*. As referências dentro da árvore são ativas, e se comportam de modo diferente ao passar o mouse e ao clicar.

   **Passar o mouse** abre uma prévia daquele Rem ao lado da árvore — aqui, tudo o que as notas dizem sob *Enumerations* — sem sair da fila.

   ![Cartão frente/verso com seta de direção e prévia de referência](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/05-arrow-and-reference.png)

   **Clicar** não navega. Em vez disso, aparece uma barra de confirmação no pé da árvore — *“Open **Enumerations**? This leaves the queue and ends the review session.”* — com **Open anyway** e **Cancel**. Abrir um Rem move o painel, e isso encerraria a sessão no meio da revisão; então o clique apenas arma a ação e deixa a decisão com você.

   ![Clicar em uma referência pede confirmação antes de sair da fila](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/05-navigating-to-a-tree-reference.png)

6) **Um cartão inverso de Descritor — quem é mascarado é o Conceito, não o rótulo**

   Revisando *“example ⇐ the alphabetical list of the members of the EU”* — um Descritor inverso sob o Conceito **Enumerations―ordered lists of members**, sob **10. Avoid enumerations**. O **?** cai no *Conceito*, que é o que de fato se pede que você recorde, e não no rótulo *example* do descritor. O verso do próprio Conceito também é removido, então aquela linha fica só com o **?**. Isso espelha o comportamento nativo do RemNote — veja [Cartões inversos de Descritor testam o Conceito, não o Descritor](#cartões-inversos-de-descritor-testam-o-conceito-não-o-descritor).

   ![Cartão inverso de descritor](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/06-backward-descriptor.png)

7) **Recolhida por padrão — abra só o que você quiser**

   Revisando um cartão qualquer no fundo do documento enquanto as outras dezenove regras ficam recolhidas atrás de setas ▸. Clique em uma para abrir aquele ramo só para este cartão.

   ![Árvore recolhida, expandindo um ramo](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/07-collapsed-expand.gif)

## Histórico de mudanças

Do mais recente para o mais antigo. Mantido a partir da 0.2.1; o que veio antes está no [histórico de commits](https://github.com/hugomarins/remnote-context-for-cloze/commits/main).

### 0.2.1
- **As marcações mostram um ícone no lugar do nome do power‑up.** “Context Tree” é uma árvore de nós azul tirada do logo do plugin; “Context Hide Others” é a mesma árvore com as duas respostas substituídas por `…`, no âmbar que a fila usa para uma resposta escondida. Se você renomeou a marcação, o texto dela é preservado. A marca é aplicada por Rem, então um Rem que tenha um destes power‑ups *e* outra marcação a exibe nas duas etiquetas.
- **O código rápido de “Context: Hide Other Answers for This Rem” agora é `conthide`** (antes `cfchide`), assim os dois comandos do plugin começam com `cont`.
