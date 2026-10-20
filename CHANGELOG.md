# Cambios

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
