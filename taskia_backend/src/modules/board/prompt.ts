export const SCENE_DRAW_PROMPT = `Pizarra de salida: describes una ESCENA, nunca coordenadas ni celdas.
Responde la escena en el campo "scene". draw_ops siempre [].
Si no hace falta dibujar, scene=null.

{"schemaVersion":1,"objects":[...],"task":{"type":"enter_value","target":"...","unit":"cm","claimedAnswer":0}}

Formas (generan sus vértices solas). Ejes alineados. Vértices en sentido antihorario desde abajo a la izquierda. width es el lado horizontal, height el vertical. rotation opcional, grados antihorarios, alrededor del primer vértice.
- rectangle: {"id":"R","type":"rectangle","width":6,"height":4,"vertexLabels":["A","B","C","D"]}
  A abajo-izquierda, B abajo-derecha, C arriba-derecha, D arriba-izquierda.
- right_triangle: {"id":"T","type":"right_triangle","a":3,"b":4,"vertexLabels":["A","B","C"]}
  Ángulo recto en A. a = AB horizontal. b = AC vertical. Hipotenusa BC.
- regular_polygon: {"id":"P","type":"regular_polygon","sides":6,"sideLength":2}
- path (polígono ortogonal, debe cerrar): primer tramo a la derecha, cada turn es 90° antes del tramo. left es antihorario.
  {"id":"L","type":"path","steps":[{"length":6},{"turn":"left","length":4},{"turn":"left","length":6},{"turn":"left","length":4}]}

Polígono irregular: declara cada punto y sus lados o ángulos. Nada de ángulos rectos "porque sí".
{"id":"A","type":"point"} ... {"id":"Q","type":"polygon","vertices":["A","B","C","D"],"sides":{"AB":6,"BC":4,"CD":6,"DA":4},"angles":{"B":90,"C":90,"D":90}}

También: point (lo coloca una relación; no mandes coordenadas), segment (from,to,label?,length?), circle (center,radius,label?), arc (center,from,to), angle (vertex,from,to,degrees?), label (text,of), caption (text, frase corta que no es una ecuación), number_line (min,max,step?), expression (text, por ejemplo "x + 5 = 12").
Relaciones por id: midpoint (of:[a,b]), parallel_to (of,through,length,side?), perpendicular_to, reflection_of (of,over), intersection_of (of:[a,b]).
Los vértices de una forma se nombran "R.A". Máximo 30 objetos.
task.target puede ser length:s, perimeter:R, area:R, angle:a, o la letra de una expression.
claimedAnswer es lo que tú crees: el código lo comprueba y puede rechazar la escena. No mandes coordenadas.
Si el niño debe poder mover una figura, pon "interactive":true en ese objeto. Lo demás queda violeta y quieto.
Para resaltar sin redibujar, llena "highlight" con ids, y scene=null si la figura ya está.
No digas que ya dibujaste: el servidor lo dirá solo si la escena quedó bien.
Si recibes facts, la escena debe cubrirlos todos. No agregues ni quites hechos.
Si falta una primitiva de la lista, no inventes otra figura: responde {"unsupported":"nombre_en_minusculas"} en el campo scene.
`

export const SCENE_RETRY_SYSTEM = `${SCENE_DRAW_PROMPT}
Corrige SOLO la escena. Responde {"scene":{...}} sin texto extra.
El mensaje de usuario trae la escena anterior y errores con code y objectId. No inventes coordenadas.`
