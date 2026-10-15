# Context Tree for Outline Cards — Guía de usuario (Español)

🇬🇧 [English](https://github.com/hugomarins/remnote-context-for-cloze/blob/main/README.md) | 🇨🇳 [中文](https://github.com/hugomarins/remnote-context-for-cloze/blob/main/README_ZH.md) | 🇧🇷 [Português Brasileiro](https://github.com/hugomarins/remnote-context-for-cloze/blob/main/README_PT-BR.md)

Haz que tus repasos sean más claros mostrando la tarjeta actual **rodeada de su esquema**. La cola de RemNote ya te da los ancestros de una tarjeta; este plugin dibuja debajo un “árbol de contexto” compacto que añade todo lo que está *alrededor* — sus hermanos y las sub‑ramas de estos, y las respuestas que llevan — para que puedas orientarte, asociar y recordar, sin modificar el contenido de la tarjeta ni su programación.

> **Renombrado en 0.2.0.** El plugin se llamaba *Context for Cloze*, y su power‑up de ancla también se llamaba *Context for Cloze*. Ahora ambos dicen **Context Tree**, porque el árbol ya no va solo de clozes: funciona con todos los tipos de tarjeta. Nada de lo que ya has etiquetado se ve afectado: el código almacenado del power‑up sigue siendo `contextForCloze`, y el Rem de la etiqueta se renombra en su sitio la primera vez que se carga esta versión. Si tú mismo habías renombrado esa etiqueta, se conserva tu nombre. El comando que la añade es ahora **Add Context Tree to the Cards in This Outline**, código rápido `cont` (antes `cfc`).

![Cambiando el modo de cloze con el botón de ojo y fijándolo con el botón de etiqueta](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/context-for-cloze-mode-switch.gif)

## Por qué querrías esto — dos formas de estudiar a las que se ajusta

**1) Estudiar listas como clozes en contexto, en lugar de como tarjetas de lista.**
Un conjunto o una enumeración es lo más caro que puedes meter en una cola de repaso. Contestarlo lleva mucho tiempo, se califica todo‑o‑nada, es material propenso a convertirse en leech y, la mayoría de las veces, en realidad no necesitas *producir* la lista entera bajo demanda: necesitas haber captado lo que hay en ella. Escribir la lista como un esquema y hacer cloze de las palabras que sostienen el sentido sale mucho más barato: cada hueco se convierte en su propia tarjeta pequeña, así que repasarla es rapidísimo y un fallo en un elemento cuesta un lapso en vez de tumbar la lista completa. Lo que eso suele perder es la lista misma: un hueco suelto, sin sus hermanos alrededor, cuesta de situar. El árbol de contexto lo devuelve: cada hueco se muestra **dentro de su propia lista**, con los elementos vecinos a la vista, de modo que conservas la forma del conjunto mientras recuerdas una pieza de él. Cuando los vecinos delatan demasiado, `Context Hide Others` los oculta y los vas descubriendo de uno en uno.

**2) Notas en estilo esquema.**
RemNote ya muestra el *linaje* de una tarjeta: la cadena de ancestros que va del documento hasta la línea en repaso. Lo que no muestra es nada que esté **al lado** de esa cadena: los hermanos de la tarjeta y las ramas que cuelgan de sus ancestros. En notas en esquema ahí es donde suele vivir el significado, porque un elemento se define tanto por lo que tiene *al lado* como por lo que tiene *encima* — una tarjeta sacada de un contraste de cuatro elementos sigue siendo respondible, pero el contraste se ha perdido. Etiqueta la cima del esquema una vez y el árbol dibuja la rama entera bajo cada tarjeta por debajo, linaje y vecindario juntos, con toda respuesta que no sea la tuya o revelada como contexto u oculta, a tu elección. Es también así como detectas la interferencia (la regla 11 de la lista de Woźniak): los elementos confundibles suelen ser hermanos, y no puedes notar la confusión mirando uno de ellos en aislamiento.

Ambos casos funcionan con **cualquier tipo de tarjeta**: clozes, tarjetas Concepto/Descriptor, tarjetas de Pregunta, o una mezcla de ellas en el mismo árbol.

## Funciones
- Context Tree (núcleo)
  - Añade el power‑up “Context Tree” (código: `contextForCloze`) a un Rem. Todos sus descendientes, cuando se repasen como tarjetas, mostrarán debajo un árbol de contexto con raíz en ese Rem.
  - Funciona con **todos los tipos de tarjeta**, no solo con clozes: un Rem de tipo Concepto/Descriptor/Pregunta muestra su **reverso** en el árbol, unido al anverso por una flecha que indica la dirección de la tarjeta (`⇒` directa, `⇐` inversa, `⇔` ambas).
  - Fase de pregunta: se muestra el contexto evitando cualquier filtración de la respuesta — sea el cloze que se está preguntando, sea el lado completo que pide la tarjeta.
  - Fase de respuesta: el contexto permanece; la respuesta revelada se indica con un subrayado azul y un resaltado azul claro para facilitar la comparación.
- Context Hide Others (`contextHideAllTestOne`) — se aplica a **un solo Rem**, no a un subárbol.
  - Por defecto, el árbol de contexto oculta únicamente la respuesta que se te está preguntando; cualquier *otra* respuesta del árbol — otras líneas con cloze y el reverso de todas las demás tarjetas — aparece revelada. Etiqueta una tarjeta con este power‑up cuando no quieras que el repaso **de esa tarjeta** sea arruinado por sus vecinas: mientras esa tarjeta está en repaso, todas las demás respuestas se ocultan (se muestran como `…`).
  - Aplícalo al Rem de la tarjeta que recibiría el spoiler (la hoja), **no** al ancla ni al padre. Consulta [Context Hide Others](#context-hide-others--proteger-un-cloze-de-sus-hermanos) más abajo.
- Cómo añadir power‑ups a los Rems
  - Comandos:
    - Add Context Tree to the Cards in This Outline (código rápido `cont`)
    - Context: Hide Other Answers for This Rem (código rápido `conthide`, antes `cfchide`)
  - Funcionan con selección múltiple.
- Iconos de etiqueta en el editor
  - Ambos power‑ups muestran una pequeña marca en la etiqueta del Rem en lugar de su nombre: un árbol de nodos azul para “Context Tree”, y el mismo árbol con sus respuestas sustituidas por `…` — en el ámbar que la cola usa para una respuesta oculta — para “Context Hide Others”. Si tú renombraste la etiqueta, conserva su propio texto.

## Compatibilidad con los power‑ups de visualización en la cola (plugin oficial “Hide in Queue” y plugin “Incremental Everything”)
El árbol de contexto refleja los power‑ups de visualización en la cola del plugin oficial “Hide in Queue” de RemNote **y** del plugin Incremental Everything. Este plugin no registra ninguno de ellos — solo lee sus etiquetas cuando existen, de modo que nada se ve afectado si un power‑up no está instalado.

Etiquetados en el propio elemento:
- Hide in Queue (`hideInQueue`)
  - Muestra el texto de marcador “Hidden in queue” para ese elemento en el árbol de contexto (solo en la fase de pregunta; en la fase de respuesta el elemento se muestra con normalidad).
- Remove from Queue (`removeFromQueue`)
  - Elimina por completo el elemento del árbol de contexto (en ambas fases).
- No Hierarchy (`noHierarchy`)
  - Cuando está presente en la tarjeta actual, el área de contexto muestra únicamente “esta línea” (sin ancestros, hermanos ni descendientes), igual que el comportamiento nativo de RemNote.

Etiquetados en la tarjeta, pero dirigidos a un ancestro (Incremental Everything):
- Hide Parent (`hideParent`) / Hide Grandparent (`hideGrandparent`)
  - Muestra el marcador “Hidden in queue” en la línea del padre / abuelo de la tarjeta (solo en la fase de pregunta).
- Remove Parent (`removeParent`) / Remove Grandparent (`removeGrandparent`)
  - Elimina por completo del árbol de contexto la línea del padre / abuelo de la tarjeta (en ambas fases); sus hijos restantes se mantienen, sin sangría.

La línea de la propia tarjeta actual se muestra siempre, con independencia de cualquiera de estas etiquetas.

## Reversos y flechas de dirección
Un Rem que es una tarjeta guarda su respuesta en un **reverso** (`backText`) — es lo que almacena un Rem de tipo Concepto, Descriptor o Pregunta. El árbol de contexto muestra ambos lados, unidos por una flecha que indica en qué dirección se pregunta la tarjeta:

| Flecha | Dirección de práctica | Se lee como |
| --- | --- | --- |
| `⇒` | Directa (forward) | el anverso pregunta, el reverso responde |
| `⇐` | Inversa (backward) | el reverso pregunta, el anverso responde |
| `⇔` | Ambas (both) | cualquiera de los dos lados puede preguntar |

Es la misma notación que usa el plugin *Incremental Everything*, así que una tarjeta se lee igual en ambos.

- Cuando el Rem que estás repasando es él mismo una tarjeta anverso/reverso, el lado que se pregunta aparece como un **?** azul en la fase de pregunta y se revela con subrayado + resaltado tras “Show Answer” — exactamente lo que ya ocurría con un cloze.
- Cualquier *otra* tarjeta del árbol muestra sus dos lados revelados por defecto, y oculta su lado de respuesta tras un único `…` clicable cuando el árbol está en modo oculto (véase el botón de ojo más abajo).
- Un Rem sin reverso se dibuja exactamente como antes.

### Las tarjetas inversas de Descriptor evalúan el Concepto, no el Descriptor
RemNote tiene [un caso especial aquí](https://help.remnote.com/en/articles/6751778-creating-concept-descriptor-flashcards): una **tarjeta inversa sobre un Descriptor muestra el reverso del Descriptor, pero te pregunta por el Concepto que hay encima**, no por el Descriptor en sí. Pedirte que respondas “*abreviatura*” no sirve de nada; mostrarte “*abreviatura ⇐ PC*” y preguntarte *de qué es abreviatura PC* es la tarjeta de verdad.

El árbol sigue ese comportamiento. En una tarjeta inversa de Descriptor:

- El **?** oculto va al **ancestro más cercano que no sea Descriptor** — el concepto que se evalúa — y no a la etiqueta del propio descriptor. Si hay descriptores anidados en varios niveles, el árbol sube por todos ellos hasta el primer Concepto real.
- La línea de ese concepto queda reducida al **?** a secas en la fase de pregunta: su propio reverso también se elimina, porque la definición de un concepto lo nombra y te daría la respuesta.
- La línea del descriptor permanece totalmente visible — es el enunciado.
- Tras “Show Answer” el concepto vuelve completo, subrayado y resaltado, con su reverso restaurado.
- Si el descriptor no tiene ningún Concepto ancestro dentro del árbol, no se oculta nada. La respuesta sencillamente no se muestra, así que no hay filtración.

La etiqueta de un descriptor nunca se trata como respuesta en ninguna parte del árbol, así que “Hide Other Answers” no tapa las etiquetas *abreviatura* / *definición* que dan forma al esquema.

## Plegado por defecto — despliega lo que necesites
El árbol de contexto comienza **plegado**. Solo está abierta la rama que conduce hasta la tarjeta en repaso, de modo que la línea evaluada siempre está visible mientras que los descendientes más profundos — que a menudo revelan la respuesta o la sugieren demasiado — permanecen ocultos.

- Una línea con hijos ocultos muestra una **flecha ▸** en lugar de una viñeta; haz clic en ella (o enfócala y pulsa Enter/Espacio) para desplegar esa rama. La flecha apunta hacia abajo cuando la rama está abierta.
- Una línea sin hijos ocultos conserva su viñeta.
- El despliegue es por tarjeta: se reinicia al pasar a la siguiente.
- ¿Prefieres el árbol siempre desplegado de antes? Desactiva **Start Collapsed** en los ajustes.

## Los botones de ojo y de etiqueta — cambiar el modo de las respuestas durante el repaso
El árbol muestra las respuestas de las demás líneas en uno de dos modos: **revelado** (subrayado azul, el modo por defecto) u **oculto** (`…`, el modo por defecto para una tarjeta etiquetada con `Context Hide Others`). “Respuesta” abarca ambos casos: un cloze dentro de una línea y el reverso de una línea que es tarjeta. Un **botón 👁 en la esquina superior derecha del área de contexto** alterna entre ambos para la tarjeta que tienes delante.

![Cambiando el modo de cloze con el botón de ojo y fijándolo con el botón de etiqueta](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/context-for-cloze-mode-switch.gif)

- Ojo **abierto** = las demás respuestas están reveladas. Haz clic para ocultarlas.
- Ojo **tachado** = las demás respuestas están ocultas como `…`. Haz clic para revelarlas.
- Úsalo *antes* de leer el árbol cuando las respuestas reveladas filtren una pista que prefieres ganarte — sin necesidad de etiquetar el Rem primero.
- Úsalo *después* de “Show Answer” cuando un árbol oculto resulte demasiado críptico.
- Por sí solo no cambia nada en tu base de conocimiento: la etiqueta sigue decidiendo el punto de partida y el modo se reinicia en la siguiente tarjeta.
- El botón solo aparece cuando alguna otra línea contiene realmente una respuesta propia — un cloze o un reverso — si no, no hay nada que alternar.
- En modo oculto, cada `…` sigue siendo clicable de forma individual, así que también puedes descubrir las respuestas de una en una. Un reverso oculto es un único `…` para todo el lado; un cloze es un `…` por hueco.

**Hazlo permanente — el botón 🏷 de etiqueta.** En cuanto el ojo deja el árbol en un modo que no coincide con la etiqueta de la tarjeta, aparece un segundo botón **a la izquierda del ojo**. Al pulsarlo, la elección se escribe en el propio Rem, de modo que todos los repasos futuros empiecen así:

- Icono de etiqueta normal = *añadir* `Context Hide Others` a este Rem (mantener ocultas las demás respuestas).
- Icono de etiqueta tachado = *quitarlo* de este Rem (mantener reveladas las demás respuestas).
- Pasa el ratón o el foco por cualquiera de los dos botones y aparecerá una breve explicación en la misma fila, a la izquierda de los iconos.
- El botón desaparece en cuanto la etiqueta coincide con lo que ves, y un aviso confirma el cambio. Esta es la única acción del plugin que escribe en tu base de conocimiento.

## Ajustes (Settings → Plugins → este plugin)
- Start Collapsed (por defecto: activado)
  - Dibuja el árbol plegado, con solo el camino hasta la tarjeta actual abierto; las demás ramas quedan detrás de una flecha ▸ clicable. Ya no hay límite de profundidad — es el plegado lo que mantiene legible un árbol profundo, así que ves toda la jerarquía y abres solo lo que quieras.
- Max Nodes (por defecto: 200)
  - Un presupuesto de seguridad sobre cuántos Rems **recorre** el árbol antes de detenerse. Las ramas plegadas también se recorren, así que es esto — y no el plegado — lo que evita que una tarjeta bajo un ancla enorme atasque la cola. Súbelo si un árbol sale truncado; bájalo si un documento muy grande hace que las tarjetas tarden en aparecer.
- Debug Mode (por defecto: desactivado)
  - Añade pistas adicionales en la interfaz y la consola para diagnosticar problemas (la mayoría de usuarios puede dejarlo desactivado).

## Cómo usarlo
1. Elige un Rem como “ancla de contexto” — la cima del esquema que quieres que vean las tarjetas — y añádele el power‑up “Context Tree” (`contextForCloze`), con el comando **Add Context Tree to the Cards in This Outline** (`cont`).
2. Empieza a repasar: siempre que cualquier descendiente se convierta en tarjeta, aparecerá debajo un árbol de contexto con raíz en el ancla.
3. Opcional: si una tarjeta fuera a arruinarse por las respuestas reveladas de sus vecinas, añade “Context Hide Others” a **esa tarjeta** — ejecuta **Context: Hide Other Answers for This Rem** (`conthide`). Consulta la sección dedicada más abajo.
4. Haz clic en las flechas ▸ durante el repaso para abrir la rama que quieras ver; el resto se mantiene apartado.
5. Usa el botón 👁 de la esquina superior derecha del área de contexto para revelar u ocultar las respuestas de las demás líneas siempre que el modo actual no encaje con la tarjeta — y el botón 🏷 contiguo si quieres que esa elección quede fijada en el Rem.
6. Deja Max Nodes como está, salvo que un árbol salga truncado (súbelo) o que un documento muy grande haga que las tarjetas tarden en aparecer (bájalo).

## Context Hide Others — proteger un cloze de sus hermanos

**Qué hace.** Por defecto, el árbol de contexto oculta la línea en repaso y revela todo lo demás. Cualquier respuesta que esté en *otra* línea — sus clozes y el reverso de todas las demás tarjetas — se muestra **revelada** (subrayado azul), de modo que las respuestas del entorno actúan como contexto visible.

`Context Hide Others` invierte eso para la tarjeta a la que se aplica: mientras esa tarjeta está en repaso, **todas las demás** respuestas del árbol aparecen **ocultas** (como `…`) en lugar de reveladas. Fíjate en la diferencia de alcance respecto a la etiqueta del ancla: `Context Tree` se coloca en la **raíz** de un esquema y afecta a todos sus descendientes, mientras que esta se coloca en **un único Rem** y solo afecta a los repasos de ese Rem.

La etiqueta define únicamente el modo **inicial** — el botón 👁 descrito arriba lo cambia en ambos sentidos para la tarjeta que tienes delante, sin modificar la etiqueta.

### Cuando no hay ningún ancla de contexto por encima del Rem
Esta etiqueta solo cambia el aspecto de un *árbol de contexto*, y un árbol de contexto solo existe por debajo de un Rem etiquetado con `Context Tree`. Etiquetar un Rem sin ese ancestro no haría absolutamente nada, así que el comando lo comprueba primero. Si falta el ancla, aparece un diálogo que explica la situación y ofrece tres salidas:

- **Etiquetar también al padre** — el padre se convierte en el ancla de contexto y el Rem seleccionado recibe `Context Hide Others`. El diálogo nombra al padre y expone la consecuencia por adelantado: un ancla se propaga en cascada, así que *todas* las tarjetas por debajo de ese padre mostrarán un árbol de contexto a partir de entonces. También indica cuántos hermanos tiene el Rem, ya que esos hermanos son de lo que está hecho el contexto — sin ninguno, el árbol quedaría escaso y quizá un ancestro más alto sea mejor ancla.
- **Etiquetar solo este Rem** — añade la etiqueta de todos modos; permanecerá inactiva hasta que algún ancestro se convierta en ancla.
- **Cancelar** — no se escribe nada.

Con una selección múltiple, los Rems que ya están bajo un ancla se etiquetan de inmediato y el diálogo pregunta solo por el resto.

La línea de la propia tarjeta actual siempre aparece oculta como `?`, independientemente de este power‑up, y el texto de contexto sin cloze siempre se muestra. Este power‑up solo cambia cómo aparecen los *demás* clozes.

**Dónde aplicarlo.**
- Aplícalo **al Rem de la tarjeta de cloze que recibiría el spoiler no deseado de sus hermanos** — es decir, la hoja cuyo repaso quieres mantener limpio. No es un marcador de grupo: protege la tarjeta concreta en la que está.
- **No** lo apliques al ancla ni al padre que lleva `Context Tree`. El efecto está ligado al Rem de la tarjeta que se está repasando y no se hereda hacia abajo en el árbol, así que una etiqueta en el padre no hace nada.
- La protección es por tarjeta y unidireccional: etiquetar la tarjeta A solo limpia **el repaso de A**; no influye en lo que muestren B o C cuando les toque. Por eso, cuando varios hermanos se arruinarían mutuamente, etiqueta **cada** tarjeta que quieras proteger — cualquier hermano sin etiquetar seguirá revelando todas las respuestas durante su propio repaso.
- Consejo: selecciona las tarjetas de cloze que quieras proteger y ejecuta **Context: Hide Other Answers for This Rem** (`conthide`) — el comando admite selección múltiple, así que puedes etiquetarlas de una vez.

**Cuándo usarlo.** Úsalo cuando un padre agrupe varios clozes hermanos que se arruinarían entre sí al mostrarse juntos — por ejemplo, una lista enumerada donde cada ítem es su propia tarjeta de cloze, o un conjunto de hechos paralelos que quieres recordar de forma independiente. Mantén el comportamiento por defecto (no etiquetar) cuando las respuestas vecinas sean contexto legítimo que *quieres* ver mientras recuerdas la actual.

**Revelar los clozes ocultos de uno en uno (clic para revelar).** Cuando una tarjeta está protegida así, cada `…` oculto es un botón. Haz clic en él (o enfócalo y pulsa Enter/Espacio) para revelar solo la respuesta de ese cloze en su sitio; vuelve a hacer clic para ocultarla de nuevo como `…`. Esto te permite autoevaluar poco a poco — uno por uno — los clozes ocultos del entorno, aunque no sean la tarjeta evaluada. Cada `…` se alterna de forma independiente, el hueco evaluado permanece siempre oculto (nunca se vuelve clicable) y todas las revelaciones se reinician automáticamente al pasar a la siguiente tarjeta.

## Consejos
- El plugin solo se dibuja en la cola de repaso; la vista del editor no se ve afectada.
- Si la tarjeta actual no está bajo ningún ancla “Context Tree”, no se muestra ningún árbol de contexto.
- Cuando se usa junto con No Hierarchy (`noHierarchy`), solo se muestra la línea actual. Es intencionado.

## Capturas de ejemplo

Todas las capturas siguientes salen de un único documento real — [*Effective learning: Twenty rules of formulating knowledge*](https://supermemo.guru/wiki/20_rules_of_formulating_knowledge), de Piotr Woźniak, tomado como notas en esquema. Es un tema cómodo para este plugin porque es el argumento a su favor: las reglas **9 (Avoid sets)** y **10 (Avoid enumerations)** son justamente el motivo por el que harías cloze de una lista en contexto en vez de una tarjeta de la lista entera, y la regla **16 (Context cues simplify wording)** es lo que el árbol automatiza.

Para reproducirlas: pon el cursor en el Rem del título del documento, ejecuta **Add Context Tree to the Cards in This Outline** (`cont`) y repasa.

1) **El ancla — qué etiquetas y de qué está hecho el árbol**

   El documento en el editor, con `Context Tree` en el Rem del título. Todo lo que hay debajo se repasa ya con árbol; las reglas numeradas son las ramas.

   ![Ancla](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/01-anchor.png)

2) **Un cloze dentro de su lista — fase de pregunta** *(caso de uso 1)*

   Repasando *“2. `{{Learn}}` before you `{{memorize}}`”*. La tarjeta pide un hueco; el árbol devuelve esa línea a la lista a la que pertenece, con el resto de las veinte reglas a su alrededor.

   Esta es la alternativa barata a la tarjeta de conjunto, y el documento demuestra el argumento sobre sí mismo: una tarjeta que pregunte *“enumera las veinte reglas de Woźniak”* es justo el elemento que las reglas 9 y 10 te dicen que no construyas — calificado todo‑o‑nada y leech en potencia. Hacer cloze de las palabras clave de cada regla es mucho más rápido de repasar, cuesta un solo lapso cuando se escapa en lugar de tumbar la lista entera, y, como el árbol mantiene los demás títulos a la vista, puedes repasar la forma de la enumeración cada vez que aparece uno de sus miembros.

   En esta captura se ven dos detalles de renderizado:

   - **La línea en repaso muestra *ambos* huecos como `?`**, aunque solo se esté preguntando uno. El área de tarjeta de RemNote, arriba, ya renderiza esa línea correctamente — *Learn* revelado, el hueco preguntado oculto — así que el árbol se aparta y deja la línea entera fuera de juego.
   - **Las demás líneas muestran sus respuestas.** La regla 8 aparece como *“`Graphic` deletion is as good as `cloze` deletion”*, con sus dos huecos rellenos y subrayados. Ese es el comportamiento por defecto: todo salvo la línea en repaso se muestra contestado, como contexto. La captura 4 le da la vuelta.

   ![Cloze en contexto, fase de pregunta](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/02-cloze-question.png)

3) **La misma tarjeta, fase de respuesta**

   Tras *Show Answer*: el hueco recuperado aparece subrayado y resaltado en azul, así que queda claro de inmediato de qué parte de la frase respondías.

   ![Cloze en contexto, fase de respuesta](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/03-cloze-answer.png)

4) **`Context Hide Others` — cuando los vecinos lo delatan**

   Dos capturas de la misma tarjeta: la línea de dos huecos bajo **9. Avoid sets**.

   **Sin la etiqueta — por defecto.** Todo salvo la línea en repaso se muestra contestado. El hermano recuadrado en rojo, *“if sets are absolutely necessary, you should always try to ⇒ **convert them into Enumerations**”*, te entrega buena parte de lo que dice esta regla antes de que hayas recordado nada — y las reglas 2 y 8 tienen también sus propios huecos rellenos.

   ![Por defecto: las respuestas vecinas aparecen reveladas](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/04-hide-others.png)

   **Con `Context Hide Others` (`conthide`) — recomendado para una tarjeta así.** Toda *otra* respuesta del árbol se reduce a un `…`: los reversos de los hermanos y los clozes de las reglas 2 y 8. Cada `…` es un botón, así que una vez contestada tu propia tarjeta puedes pulsarlos de uno en uno y autoevaluarte con el resto. El ojo de la esquina superior derecha aparece ahora tachado, que es como distingues de un vistazo en qué modo estás.

   ![Recomendado: las respuestas vecinas quedan ocultas](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/04-hide-others-recomended.png)

   Compara las dos: la línea en repaso es idéntica en ambas. La etiqueta nunca toca la tarjeta que se te pregunta — solo a sus vecinas.

5) **Una tarjeta anverso/reverso, su flecha de dirección y la vista previa de una referencia**

   Repasando *“you should avoid such items whenever possible ⇒ ?”* — un Descriptor directo bajo **9. Avoid sets**. Su reverso es la respuesta, así que el árbol lo oculta como **?**, y la `⇒` deja constancia de que el rem tiene una tarjeta que se pregunta de anverso a reverso.

   La línea justo debajo conserva su propia respuesta, y esa respuesta lleva una referencia de Rem: *“…you should always try to ⇒ convert them into **Enumerations**”*. Las referencias dentro del árbol están vivas, y se comportan de forma distinta al pasar el ratón y al hacer clic.

   **Al pasar el ratón** se abre junto al árbol una vista previa de ese Rem — aquí, todo lo que las notas dicen bajo *Enumerations* — sin salir de la cola.

   ![Tarjeta anverso/reverso con flecha de dirección y vista previa de referencia](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/05-arrow-and-reference.png)

   **Al hacer clic** no se navega. En su lugar aparece una barra de confirmación al pie del árbol — *“Open **Enumerations**? This leaves the queue and ends the review session.”* — con **Open anyway** y **Cancel**. Abrir un Rem mueve el panel, y eso terminaría la sesión a mitad del repaso; así que el clic solo arma la acción y te deja la decisión a ti.

   ![Al hacer clic en una referencia se pide confirmación antes de salir de la cola](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/05-navigating-to-a-tree-reference.png)

6) **Una tarjeta inversa de Descriptor — se oculta el Concepto, no la etiqueta**

   Repasando *“example ⇐ the alphabetical list of the members of the EU”* — un Descriptor inverso bajo el Concepto **Enumerations―ordered lists of members**, bajo **10. Avoid enumerations**. La **?** cae en el *Concepto*, que es lo que de verdad se te pide recordar, y no en la etiqueta *example* del descriptor. El reverso del propio Concepto también se elimina, así que esa línea queda en una **?** a secas. Esto refleja el comportamiento nativo de RemNote — véase [Las tarjetas inversas de Descriptor evalúan el Concepto, no el Descriptor](#las-tarjetas-inversas-de-descriptor-evalúan-el-concepto-no-el-descriptor).

   ![Tarjeta inversa de descriptor](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/06-backward-descriptor.png)

7) **Plegado por defecto — abre solo lo que quieras**

   Repasando cualquier tarjeta del fondo del documento mientras las otras diecinueve reglas siguen plegadas tras flechas ▸. Pulsa una para abrir esa rama solo para esta tarjeta.

   ![Árbol plegado, desplegando una rama](https://raw.githubusercontent.com/hugomarins/remnote-context-for-cloze/main/img/07-collapsed-expand.gif)

## Registro de cambios

Lo más reciente primero. Se mantiene desde la 0.2.1 en adelante; lo anterior está en el [registro de commits](https://github.com/hugomarins/remnote-context-for-cloze/commits/main).

### 0.2.1
- **Las etiquetas muestran un icono en lugar del nombre del power‑up.** “Context Tree” es un árbol de nodos azul tomado del logo del plugin; “Context Hide Others” es el mismo árbol con sus dos respuestas sustituidas por `…`, en el ámbar que la cola usa para una respuesta oculta. Si tú renombraste la etiqueta, conserva su texto. La marca se aplica por Rem, así que un Rem que lleve uno de estos power‑ups *y* otra etiqueta la mostrará en ambas.
- **El código rápido de “Context: Hide Other Answers for This Rem” ahora es `conthide`** (antes `cfchide`), de modo que los dos comandos del plugin empiezan por `cont`.
