# Cambios

## 1.12.1

- En el modo por escena, los personajes de jugador salen **siempre**, también si no estaban en la lista de la barra.

## 1.12.0

- **Retratos por escena, más simple.** Un solo interruptor (menú de la barra → «Retratos por escena (fijos + tokens)», o Configuración → General): al activarlo, cada escena muestra **todo lo que tiene token en ella** (aunque no estuviera en la lista), **más los marcados como fijos**, y **los personajes de jugador siempre**. Desaparece la opción extra de «incluir tokens»: ya va incluida. Un token oculto sigue dando un retrato oculto.
- **Pilas de fichas por jugador.** Si un jugador tiene varios personajes, se ven apilados en un solo hueco, uno tras otro. **Clic izquierdo**: pasa a la siguiente ficha (con su nombre) y la anterior se desliza y se esconde detrás. **Al pasar el cursor**, las fichas se abren en **abanico** (las vecinas se apartan) y se puede elegir una directamente. **Doble clic**: abre la ficha. La ficha activa se recuerda durante la sesión.
- En una pila no salen los botones rápidos (taparían el abanico); el menú del botón derecho sigue disponible.

## 1.11.0

- **Retratos por escena.** Nuevo modo «Fijos + tokens de la escena» (Configuración → General → «Retratos por escena», o menú de la barra): cada escena muestra a los personajes **marcados como fijos** y a los que **tienen un token en la escena que se está viendo**, y los demás desaparecen. Sigue a los tokens en directo: al colocar, borrar u ocultar un token cambia el retrato.
- **Mismo estado que el token:** si el token está oculto, el retrato queda oculto para los jugadores y el máster lo ve atenuado. Con varios tokens del mismo personaje, solo se oculta si lo están todos.
- **Fijo:** interruptor por personaje (pestaña Personajes, botón rápido de la chincheta, o botón derecho → «Fijo»). Los personajes de jugador que se añaden quedan fijos por defecto; los PNJ salen con su token.
- **Incluir tokens que no están en la lista** (opcional): cualquier actor con token en la escena sale solo, sin añadirlo antes.
- El modo por defecto sigue siendo «Todos los de la lista»: nada cambia hasta que lo actives.

## 1.10.0

- **Ctrl + rueda del ratón** sobre un retrato lo inclina (5° por muesca; con Mayús, 1°). Solo gira ese retrato, no los demás, y se guarda solo. También hay un deslizador «Inclinar la carta» en el Estudio y un botón para quitar la inclinación.
- **Ocultar y mostrar un retrato al momento**, como el HUD de un token: al pasar el cursor por un retrato el máster ve una columna de botones (ocultar/mostrar a los jugadores, quitar la inclinación, sacar/meter en la barra, estudio y menú). Un retrato oculto desaparece para los jugadores y el máster lo ve atenuado y con un ojo tachado.
- El menú del botón derecho tiene también «Ocultar a los jugadores» / «Mostrar a los jugadores» y «Quitar la inclinación».

## 1.9.0

Cambios a partir de las pruebas de un beta tester. Gracias.

- **Retratos sueltos:** cualquier personaje o PNJ puede salir de la barra y quedar donde quieras de la pantalla, individualmente (botón derecho → «Sacar de la barra (retrato suelto)» / «Meter en la barra»). Cada uno conserva su aspecto, su vista ampliada y su menú. Sirve para montar disposiciones libres y para PNJ sueltos.
- **Arrastrar con el botón derecho:** mantén el botón derecho sobre la barra o sobre un retrato suelto y arrástralo; al soltar se queda fijado. Un clic derecho sin arrastrar sigue abriendo el menú.
- **Añadir personajes:** nuevo selector con buscador («Añadir personajes…» en el menú de la barra y en la pestaña Personajes), con «A la barra» o «Suelto». Si la barra queda vacía, aparece un botón «+» para el máster.
- **Arrastrar actores desde el directorio:** al arrastrar un personaje o PNJ aparecen dos zonas, «a la barra» y «retrato suelto». (Antes se veía el «+» pero no añadía.)
- **Cartas solapadas:** el hueco entre retratos admite valores negativos (hasta −120) para apilarlos como cartas; al pasar el cursor, el retrato sube al frente.
- **Barras de datos (PG…):** interruptor para ocultarlas todas (Datos, y menú de la barra) sin borrar su configuración.
- **Abrir la ficha:** con un clic, con doble clic o nunca (Configuración → General).
- **Ajustes de grupo en el Estudio:** nueva sección «Marco e imagen» para cambiar a la vez, en todos los retratos elegidos, la imagen (retrato/token/archivo), el marco, el ajuste («Ver completa»…) y la posición del nombre.
- **«Ver completa» ya no rellena de gris:** el hueco es transparente y deja ver lo que hay detrás.
- **Colores rápidos del halo** en el Estudio, además del selector de color.
- **Barra por escenas:** «Mostrar la barra en esta escena» (menú de la barra) para ocultarla en escenas de carga, mapas, etc.

## 1.8.1

- Nueva página del repositorio (README con capturas) y créditos al autor original.
- La barra y los paneles se vuelven a colocar solos cuando cambian de tamaño los controles de escena, la lista de jugadores o la barra de macros de Foundry.
- Pestañas de la configuración con nombres más cortos y pie del estudio más ordenado.

## 1.8.0

- **Estudio de la imagen ampliada.** El Estudio tiene ahora dos pestañas: «Retrato de la barra» e «Imagen ampliada». En la segunda se ajusta, **por personaje**, lo que se ve al dejar el cursor sobre el retrato: tamaño, transparencia, halo (con pulso), giro y volteo, con vista previa en vivo de la imagen grande. Es independiente del retrato pequeño. Se abre con botón derecho → «Estudio de la imagen ampliada…».
- **El vídeo y las imágenes pequeñas vuelven a ampliarse** hasta el tamaño elegido (en 1.7.0 quedaban limitados a su tamaño real). El límite de nitidez pasa a ser opcional: Vista ampliada → «No agrandar por encima del original».
- **Menú del botón derecho ordenado por grupos:** «Retrato de la barra» (qué se muestra, tamaño, encuadre, aspecto, orden, quitar), «Imagen ampliada» (qué se muestra, tamaño, estudio, mover, mostrar a todos) y «Barra de retratos» (mover, estudio, configuración). El menú de la barra sigue el mismo criterio.
- El tamaño de la imagen ampliada elegido en el menú vale para todos y quita los tamaños propios.
- Quitado del menú el «Estudio de este retrato» del retrato pequeño; sigue en el menú de la barra.

## 1.7.0

- **El aspecto también en la imagen ampliada:** transparencia, halo (con pulso), giro, volteo y blanco y negro del retrato se aplican ahora a la imagen grande. Se puede desactivar en Vista ampliada → «Aplicar el aspecto a la imagen ampliada».
- **Más nitidez en la imagen ampliada:**
  - Ya no se agranda por encima de su tamaño real (agrandar una imagen la emborrona). Si quieres forzar el tamaño aunque pierda calidad: Vista ampliada → «Ampliar por encima del tamaño original».
  - Se coloca siempre en píxeles enteros (con medios píxeles el navegador reescala la imagen).
  - La animación de aparición ya no usa escala, que dejaba la capa rasterizada a menor resolución.
  - Se pide la decodificación síncrona de la imagen.

## 1.6.1

- **Mover la barra de retratos como la imagen ampliada:** botón derecho sobre cualquier retrato → «Mover la barra de retratos», la arrastras desde cualquier punto y al soltar se queda fijada (Esc cancela). Durante el movimiento no sale la imagen ampliada.
- **Volver a la configuración original:** en Configuración → Ajustes del módulo («Restablecer el módulo…») y en el pie de la ventana de configuración («Restablecer…»). Pide confirmación, deja el módulo como recién instalado y, si quieres, restablece también tus preferencias de este navegador. No toca personajes ni nada de Foundry. También por macro: `game.partyCornerPortraitsPlus.reset()`.

## 1.6.0

- **La imagen ampliada sale siempre en el mismo sitio** para todos los personajes: un punto fijo que eliges tú. Se acabó «junto al retrato» (cambiaba con cada personaje).
- **Por defecto, sin marco ni fondo**: solo la figura (con sombra, pensado para recortes transparentes). El cuadro con fondo es opcional: Vista ampliada → «Marco y fondo».
- **Tamaño simple desde el botón derecho**: «Tamaño de la imagen ampliada» (240 a 900 px o personalizado) y «Tamaño de los retratos (todos)». Un tamaño vale para todos los personajes; al elegir el de los retratos se quitan los tamaños propios de cada uno (los individuales se siguen pudiendo poner en el Estudio).
- **Modo mover la imagen ampliada** (botón derecho → «Mover la imagen ampliada»): sale una de ejemplo, la arrastras hasta donde convenga y al soltar queda fijada. Esc cancela.
- **Modo mover la barra de retratos** con aviso claro: arrastra, suelta para fijarla, Esc cancela y vuelve a su sitio.

## 1.5.0

**Estudio de retratos** (botón derecho sobre la barra o sobre un retrato → «Estudio de retratos…»), con las opciones de MR Token Stage que tienen sentido en una barra de retratos. Los controles actúan **en vivo** al arrastrar y se guardan al soltar:

- **Tamaño**: deslizador, ±10 %, atajos ×0,5 … ×2, «Tamaño global» e «Igualar a todos».
- **Aspecto**: transparencia, giro (rotación), voltear horizontal y vertical, restablecer encuadre.
- **Halo** sobre la silueta: color, fuerza, opacidad, suavidad (de banda nítida a luz difusa) y pulso (se detiene con «Reducir movimiento»).
- **Cuenta atrás** sobre el retrato: baja sola al avanzar el combate, por ronda o en el turno del propio personaje; se pone roja en 0 y avisa al máster.
- **Presets**: Fantasma, Jefe y los tuyos (se guardan por usuario).
- **Copiar / Pegar** el aspecto, **Deshacer** (30 pasos) y **Original**.
- **Focus y Spotlight**: atenúan el resto de retratos en tu pantalla, con anillo opcional.
- Selección de varios personajes a la vez (Todos / Ninguno / Invertir).
- API para macros: `game.partyCornerPortraitsPlus.size / scale / opacity / glow / flip / rotate / countdown / preset / undo`.

No se han portado las opciones que solo tienen sentido sobre el mapa (humanizar multitudes, modo escénico, regla y orientación al mover).

## 1.4.0

- **Vista ampliada al dejar el cursor sobre un retrato** (inspirada en Image Hover, pero disparada por los retratos de este módulo). Nueva pestaña «Vista ampliada»: qué se muestra (token, retrato o lo mismo que la barra), espera, tamaño, dónde aparece (junto al retrato, centro o esquinas), nombre debajo y permiso mínimo sobre el personaje.
- **Por personaje** se puede elegir qué se ve ampliado, incluido un **archivo propio** (imagen, GIF o vídeo en bucle) con selector de archivos, en Personajes → Más opciones o con el botón derecho → «Vista ampliada».
- **Mostrar a todos:** el máster puede enseñar la imagen ampliada de un personaje a todos los conectados (botón derecho → «Mostrar a todos»; dura los segundos que se configuren).
- **Recortes con transparencia** (PNG/WebP o vídeo webm con alfa): opción «Sin cuadro» para ver solo la figura con sombra. En la barra se usan con Marco «Sin marco», Fondo «Transparente» y Ajuste «Ver completa».
- Cada jugador puede desactivarla para sí mismo desde el menú del retrato; también aparece al enfocar el retrato con el teclado.

## 1.3.0

- **Retrato o token:** en Foundry son cosas distintas (la imagen de la ficha frente a la figura del mapa). Ahora eliges qué se muestra: un valor global (Configuración → Aspecto → «Imagen de los personajes») y, por personaje, retrato, token o archivo propio.
- **Archivo propio por personaje:** desde la pestaña Personajes (campo y selector de archivos) o con el botón derecho sobre el retrato → «Imagen a mostrar». Vale una imagen, un GIF en bucle o un vídeo corto en bucle (webm, mp4). La vista previa se actualiza al momento.
- Los tokens con ruta aleatoria («*») se ignoran y se usa el retrato; si el archivo elegido no existe se prueba con el resto antes de mostrar la imagen por defecto.
- Los archivos propios de la 1.2.0 se conservan como «archivo propio».

## 1.2.1

- **La barra de macros ya no estorba a los retratos.** Si al aparecer (o estando visible) se solapa con la barra de retratos, se aparta hacia el lado contrario o se pone delante y semitransparente, según elijas en Configuración → General («Si la barra de macros tapa los retratos») o en el menú del asa de la barra. Por defecto se aparta.

## 1.2.0

- **Barra de macros y lista de jugadores de Foundry:** cada una puede estar *visible*, *oculta del todo* o *aparecer al acercar el cursor* (como el dock). Se elige en Configuración → General y en el menú del asa de la barra. Los mundos que ya tenían «ocultar» lo conservan.
- **Retratos animados:** admiten vídeo (webm, mp4, m4v, ogv), GIF y WebP/APNG animados. Cada personaje puede tener su propia animación (Personajes → Más opciones → Animación o vídeo del retrato, con selector de archivos), distinta de la imagen de la ficha. Funcionan también en el encuadre. Con «Reducir movimiento» el vídeo se queda en su primer fotograma (los GIF no se pueden detener).

## 1.1.1

- La lista de jugadores de Foundry ya **no se mueve**: la lista sustitutiva pasa a ser opcional y viene desactivada (también en mundos que ya tenían el módulo).
- Nueva opción **Ocultar la lista de jugadores de Foundry**, igual que la de la barra de macros (en Configuración → General y en el menú de la barra).
- Créditos al autor original, malatestaabrx, en el README y el manifiesto.

## 1.1.0

Revisión completa del módulo: fallos corregidos, interfaz rehecha y accesibilidad.

**Fallos corregidos**
- La lista de jugadores se colocaba encima de los controles de escena de Foundry y tapaba las primeras herramientas. Ahora la lista y la barra de retratos se apartan solas de los controles de escena, la barra lateral y la lista original.
- Los desplegables de esquina de la configuración mostraban la clave sin traducir (`PCP.Position.BottomLeft`).
- Arrastrar en la ventana de encuadre no seguía al puntero; ahora la imagen se mueve 1:1 y el ajuste es fino (0,1 %).
- Expulsar a un jugador podía dejarlo vetado si fallaba la segunda actualización; ahora el rol siempre se restaura.
- La barra se repintaba entera con cualquier cambio de cualquier actor; ahora solo con los de la barra, y también al cambiar objetos y efectos (CA, PG máximos…).
- La barra y la lista se recolocan al cambiar el tamaño de la ventana.
- Los textos de las ventanas tenían colores fijos y se leían mal con el tema claro de Foundry; las ventanas del módulo usan ahora su propio tema oscuro.
- Dos ajustes de accesibilidad pulsados seguidos ya no se pisan.

**Interfaz**
- Configuración rehecha: una columna, grupos de filas con interruptores, pestañas segmentadas, barras con color automático y ruta visibles sin desplazamiento lateral, opciones por personaje plegadas.
- Menús, lista de jugadores y ventanas con un diseño común (cristal oscuro, esquinas redondeadas).

**Nuevo**
- Accesibilidad: tamaño del texto, alto contraste, fuente legible y reducir movimiento (icono en la cabecera de las ventanas).
- Memoria de ventanas (posición, tamaño y pestaña).
- Los retratos se manejan con el teclado.
- Compatibilidad declarada con Foundry 14 (sin probar).

## 1.0.0

Primera versión.
