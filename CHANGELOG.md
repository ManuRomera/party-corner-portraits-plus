# Cambios

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
