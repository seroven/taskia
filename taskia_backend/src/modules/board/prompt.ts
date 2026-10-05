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
Circunferencias. El centro ya tiene nombre. No mandes coordenadas. Si el enunciado da un ángulo, coloca los puntos con ese dato. Si no lo da, omite angleDeg.
- point_on_circle: {"id":"T","type":"point_on_circle","circle":"C","angleDeg":20}
- radius: {"id":"OT","type":"radius","circle":"C","to":"T"}
- diameter: {"id":"d","type":"diameter","circle":"C","from":"A","to":"B"}
  Un solo extremo: {"id":"d","type":"diameter","circle":"C","through":"A"}. El otro punto es d.far.
- chord: {"id":"TQ","type":"chord","circle":"C","from":"T","to":"Q"}
- tangent_line: {"id":"L1","type":"tangent_line","circle":"C","at":"T","arrows":true,"label":"L1"}
  Pasa por T y queda perpendicular al radio. No escribas 90. Los extremos son L1.a y L1.b.
- secant: {"id":"s","type":"secant","circle":"C","through":["A","B"]}
  Los extremos exteriores son s.a y s.b.
- central_angle: {"id":"c1","type":"central_angle","circle":"C","from":"A","to":"B","degrees":80,"label":"80°"}
  degrees solo si el enunciado lo da. major:true si es el arco mayor.
- inscribed_angle: {"id":"i1","type":"inscribed_angle","circle":"C","vertex":"P","from":"A","to":"B","sameArc":"c1","label":"3x"}
  No mandes la medida. label es un dato del enunciado o una incógnita ("3x"), nunca el resultado.
Marcas. Son decoración. No agregan una medida que el enunciado no tenga.
- mark: {"id":"m1","type":"mark","kind":"right_angle","of":"c1"}
- {"id":"m2","type":"mark","kind":"equal_side","of":"R.e0","group":"1"}
- {"id":"m3","type":"mark","kind":"parallel","of":"R.e0","group":"1"}
- {"id":"m4","type":"mark","kind":"dimension","of":"R.e0","text":"6 cm"}
- {"id":"m5","type":"mark","kind":"angle_arc","of":"i1","text":"3x"}
multiple_choice no se dibuja y no se marca la alternativa correcta. Va en task:
{"type":"multiple_choice","target":"x+y","unit":"°","choices":[{"id":"a","text":"50°"},{"id":"c","text":"75°"}]}
target puede ser length:s, angle:i1, o una expresión de incógnitas ya etiquetadas, como x+y.
`

export const SCENE_RETRY_SYSTEM = `${SCENE_DRAW_PROMPT}
Corrige SOLO la escena. Responde {"scene":{...}} sin texto extra.
El mensaje de usuario trae la escena anterior y errores con code y objectId. No inventes coordenadas.`
