# Guia rapida para editar el mapa en Sprite Fusion

## Archivos creados

- `assets/tileset-water-labyrinth-16.png`: tileset real para importar.
- `assets/tileset-water-labyrinth-preview.png`: vista ampliada con indices y nombres.

## Configuracion en Sprite Fusion

1. Abre Sprite Fusion.
2. Crea un mapa nuevo.
3. Importa `assets/tileset-water-labyrinth-16.png` como tileset.
4. Usa `16 x 16` como tamano de tile.
5. Crea un mapa de prueba, por ejemplo:
   - `60 x 36` tiles si quieres un mapa amplio.
   - `40 x 24` tiles si quieres algo mas compacto.
6. Pinta el terreno usando el tileset.
7. Exporta el mapa como `JSON`.
8. Guarda el archivo exportado como `dashboard/assets/map.json`.

## Capas recomendadas

Usa estos nombres de capas si la herramienta te deja crearlas:

- `ground`: agua, pasto, arena, bordes.
- `decorations`: rocas, flores, objetos visuales.
- `collision`: zonas bloqueadas.
- `objects`: puntos interactivos como ACLED, NASA, GDELT o laboratorio de modelos.

## Convencion para objetos

Cuando podamos agregar objetos interactivos, estos nombres seran utiles:

- `ACLED_station`
- `NASA_station`
- `GDELT_station`
- `NEWS_station`
- `MODEL_lab`
- `METRICS_room`

## Nota

El tileset actual sale del mapa Water Labyrinth original y sirve para prototipar.
Mas adelante podemos crear un tileset propio con mas piezas, edificios y estaciones
OSINT para que el mundo se parezca mas al proyecto final.
