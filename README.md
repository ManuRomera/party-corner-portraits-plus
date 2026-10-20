# MR- Party Corner Portraits +

Fork de [Party Corner Portraits](https://github.com/malatestaabrx/party-corner-portraits) para **Foundry VTT 13** que añade datos de ficha, barras configurables, posición libre, menús contextuales, encuadre de retratos y sustitución de la lista de jugadores.

El módulo es independiente del original: su ID es `party-corner-portraits-plus`, por lo que puedes tener ambos instalados (no los actives a la vez para evitar barras duplicadas).

- **Repositorio:** <https://github.com/ManuRomera/party-corner-portraits-plus>
- **Manifest para Foundry:** <https://github.com/ManuRomera/party-corner-portraits-plus/releases/latest/download/module.json>

---

## Funciones

### Retratos del grupo

- Selección de personajes desde la configuración (independiente de la asignación jugador → personaje).
- Varios personajes por jugador.
- Cuatro esquinas, disposición horizontal o vertical y desplazamientos en píxeles.
- **Posición libre**: arrastra la barra a cualquier punto de la pantalla.
- Tamaño global y **tamaño por personaje**.
- Orden manual mediante números o con el menú contextual.
- Clic en un retrato para abrir la ficha (si tienes permiso).

### Datos visibles

- Nombre del personaje.
- **Nombre del jugador** (detectado por la propiedad del actor, con posibilidad de escribir uno propio).
- Indicador de conexión del jugador.
- **Campos extra** de la ficha como pequeñas etiquetas: CA, nivel, estrés, etc.
- **Barras configurables** para cualquier campo numérico de la ficha:
  - ruta del valor,
  - ruta del máximo,
  - máximo fijo de reserva,
  - color libre o **automático** (verde → rojo según el porcentaje),
  - texto de valor y máximo.
- Presets automáticos para varios sistemas conocidos (D&D 5e, PF2e, CoC 7e, Alien, WoD5, Cyberpunk RED, SWADE, Fate).
- Sugerencias de rutas extraídas de las fichas reales del mundo.

Ejemplos de rutas:

| Sistema | Valor | Máximo |
| --- | --- | --- |
| D&D 5e / PF2e | `system.attributes.hp.value` | `system.attributes.hp.max` |
| Call of Cthulhu 7e | `system.attributes.hp.value` | `system.attributes.hp.max` |
| Alien / WoD5 | `system.health.value` | `system.health.max` |
| SWADE | `system.wounds.value` | `system.wounds.max` |

El prefijo `system.` es opcional: `attributes.hp.value` también funciona.

### Aspecto e imágenes

- Colores, grosor de borde, radio, sombra, opacidad y escala al pasar el ratón.
- **Marcos**: completo, mínimo o **sin marco**.
- **Fondo**: oscuro, transparente o ninguno.
- Ajuste de imagen **cover** (rellenar) o **contain** (ver completa).
- Blanco y negro.
- **Ventana de encuadre** con arrastre y rueda de zoom, por personaje.
- Posibilidad de usar PNG sin fondo, sin marco y con fondo transparente para integrar el retrato en la escena.

### Menús con el botón derecho

- **Sobre un retrato (máster)**:
  - abrir ficha,
  - tamaño (global, presets o personalizado),
  - encuadre (abrir editor, centrar, resetear zoom, cover/contain),
  - aspecto (marco, posición del nombre, borde propio),
  - orden (subir, bajar, al principio, al final),
  - quitar de la barra,
  - abrir la configuración.
- **Sobre el asa de la barra (máster)**:
  - mover la barra,
  - posición (esquinas o libre) y orientación,
  - tamaño global,
  - aspecto global (marco, ajuste, fondo, nombre),
  - nombres de personaje y de jugador,
  - ocultar la barra de macros,
  - sustituir/ocultar la lista de jugadores,
  - configuración.
- **Sobre un retrato (jugador)**:
  - abrir su ficha,
  - preferencias locales (ocultar la barra, escala, nombres y barras).
- **Sobre un nombre de jugador**:
  - *Máster*: abrir ficha, llevar a la escena, mostrar/ocultar en la barra, elegir personaje, configurar el usuario, susurrar, expulsar.
  - *Jugador*: abrir su ficha, configurar su usuario, elegir personaje, pedir al máster que lo muestre, susurrar al máster y preferencias locales.

### Accesibilidad

- Icono de accesibilidad en la cabecera de todas las ventanas del módulo, junto al de cerrar (también en el menú de la barra): **tamaño del texto** (85–160 %), **alto contraste**, **fuente de alta legibilidad** y **reducir movimiento**. Son ajustes de cada navegador: no cambian lo que ven los demás.
- Los retratos se pueden enfocar con el teclado (Tab); Intro abre la ficha y la tecla de menú o Mayús+F10 abre el menú contextual.
- Las ventanas recuerdan su posición, su tamaño y la pestaña activa.

### Interfaz

- **Ocultar la barra de macros** para todos los clientes.
- **Lista de jugadores sustitutiva**: muestra estado de conexión, personaje, color y corona del máster, con su propio menú contextual. Se aparta sola de los controles de escena y de la barra lateral de Foundry, así que nunca los tapa.
- **Preferencias por jugador**: ocultar la barra solo para uno mismo, escala local, ocultar nombres o barras. No modifican la configuración del mundo.

---

## Instalación

### Desde Foundry (recomendada)

1. Abre **Configuración → Módulos complementarios → Instalar módulo**.
2. Pega el manifest:
   `https://github.com/ManuRomera/party-corner-portraits-plus/releases/latest/download/module.json`
3. Pulsa **Instalar**.
4. Activa **Party Corner Portraits +** en *Configurar módulos*.
5. Abre **Configuración del juego → Configurar ajustes → Ajustes de módulos** y pulsa **Configurar los retratos del grupo**.

### Instalación manual

1. Descarga el ZIP desde [Releases](https://github.com/ManuRomera/party-corner-portraits-plus/releases).
2. Copia la carpeta `party-corner-portraits-plus` en:
   `<Foundry User Data>/Data/modules/`
3. Reinicia Foundry y activa el módulo.

El primer arranque selecciona automáticamente los actores de tipo `character` que tengan algún jugador como propietario. Si no hay ninguno, añade los personajes a mano en la pestaña **Personajes**.

---

## Uso rápido

1. **General**: esquina, disposición, tamaño, separación y desplazamientos.
2. **Aspecto**: marco, fondo, ajuste de imagen y colores.
3. **Datos y barras**: activa nombres, añade campos y barras con sus rutas.
4. **Jugadores e interfaz**: sustituye la lista de jugadores y oculta la barra de macros.
5. **Personajes**: activa quién aparece, ajusta el orden, el nombre del jugador y las excepciones por personaje.

Con el botón derecho sobre un retrato o sobre el asa de la barra tienes acceso rápido a casi todo.

---

## Compatibilidad

- Foundry VTT **13** (probado en 13.351). Declarado también para 14, pendiente de probar.
- Sin dependencias externas.
- Usa `ApplicationV2`, `HandlebarsApplicationMixin` y `DialogV2`.
- Los cambios de configuración se sincronizan con todos los clientes mediante el ajuste de mundo de Foundry.

---

## Créditos

- Módulo original: [Party Corner Portraits](https://github.com/malatestaabrx/party-corner-portraits) por **malatestaabrx**.
- Fork y funciones añadidas: **ManuRomera**.
- Este fork conserva la idea y parte de la estructura original, y añade las funciones descritas. Desde la 1.1.0 la interfaz se ha rehecho con otro diseño (cristal oscuro, una columna, accesibilidad).

Registro de cambios en [CHANGELOG.md](CHANGELOG.md).
