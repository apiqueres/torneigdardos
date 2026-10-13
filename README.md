# Dardos Bracket

Generador de cuadros de **doble eliminación** para torneos de dardos, con el estilo
de los brackets de esports (fondo granate, acento naranja, tipografía condensada).

## Cómo abrir

Doble clic en `index.html`. No necesita instalación ni servidor.
Las fuentes se cargan de Google Fonts: sin internet se usa una fuente del sistema parecida.

## Uso

1. Escribe el nombre del torneo y añade jugadores (Enter para añadir, o pega una lista
   separada por comas o saltos de línea). De 3 a 32 jugadores.
2. **Sortear orden** baraja los emparejamientos. **Generar cuadro** crea el bracket.
3. Haz clic sobre el jugador que gana cada partido. El ganador avanza y el perdedor
   baja al cuadro de perdedores. Cada victoria lanza una animación aleatoria
   (confeti, fuegos artificiales, humo, bengala u onda).
4. Bajo el cuadro, **Orden de partidos** lista los partidos en orden cronológico con
   su estado (jugado, siguiente, listo, pendiente). Un clic en una fila salta a ese
   partido en el cuadro.
5. **Deshacer** revierte el último resultado. **Editar jugadores** vuelve a la
   configuración conservando los nombres. **Nuevo torneo** borra todo.

Si el número de jugadores no es potencia de 2, se rellena con *byes*: los
jugadores con bye pasan la primera ronda sin jugar.

El torneo se guarda automáticamente en el navegador (localStorage), así que
puedes cerrar la pestaña y seguir más tarde en el mismo navegador.

## Archivos

| Archivo       | Contenido                                                      |
| ------------- | -------------------------------------------------------------- |
| `index.html`  | Estructura de la página                                        |
| `styles.css`  | Estilo visual                                                  |
| `bracket.js`  | Lógica pura de doble eliminación (construcción y resolución)   |
| `effects.js`  | Animaciones de victoria sobre canvas                           |
| `app.js`      | Estado, pantallas, render del cuadro y conectores              |
