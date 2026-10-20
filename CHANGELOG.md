# Cambios

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
