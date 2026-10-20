# Auditoría 1.1.0 (2026-10-20)

Revisión del módulo 1.0.0 en Foundry 13.351 con dnd5e, un máster y una jugadora conectados a la vez.

## Fallos encontrados y arreglados
| Dónde | Fallo | Arreglo |
| --- | --- | --- |
| Lista de jugadores | Esquina por defecto sobre `#scene-controls`: tapaba las primeras herramientas | `scripts/layout.js`: la lista y la barra se apartan de controles, barra lateral y lista original |
| Configuración | Desplegables de esquina con la clave sin traducir | `localize` en `buildOptions` |
| Encuadre | Arrastre sin relación con el desplazamiento real; paso de 1 % | Cálculo 1:1 con el tamaño real de la imagen; paso 0,1 |
| Expulsar | Si fallaba la 2.ª actualización el usuario quedaba vetado | `finally` que restaura el rol |
| Refresco | Todo el HUD se rehacía con cualquier cambio de actor; no reaccionaba a objetos/efectos | Filtra por actores de la barra y escucha objetos y efectos |
| Ventana | Sin recolocación al cambiar el tamaño de ventana | Listener `resize` |
| Colores | Textos con colores fijos: ilegibles con el tema claro | Ventanas con `themed theme-dark` y variables propias |
| Accesibilidad | Inexistente | Panel (texto, contraste, fuente legible, movimiento), teclado en retratos |
| Memoria | Ventanas sin memoria, 960 px fijos | `scripts/memory.js`, tamaño limitado a la pantalla |
| Botones de cabecera | Riesgo de pisar la fuente de iconos con el CSS propio | Fuente acotada a `.window-content`, comprobado `Font Awesome 6 Pro` |

## Pendiente
- Probar en Foundry 14 (declarado, no probado).
- Probar con ratón real el arrastre de la barra y del encuadre (se probó con eventos sintéticos).
- Con texto al 130 % los nombres largos de los retratos se recortan con puntos suspensivos: la tarjeta no crece. Se resuelve subiendo también el tamaño del retrato.
- Sin marca MR-: es una mejora del módulo de malatestaabrx y se publica con su nombre, por respeto al autor original.
