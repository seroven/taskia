export const BOARD_INTENT_SYSTEM = `Clasifica el mensaje de un niño sobre la pizarra.
Responde SOLO este JSON, sin texto extra:
{"review_drawing":false,"draw_exercise":false}
review_drawing=true solo si pide que miren, revisen o corrijan SU dibujo de la pizarra.
draw_exercise=true solo si pide que le dibujen un ejercicio, figura o enunciado.
Una foto de papel no es la pizarra.
"sí", "dale" o "hazlo" se entienden con la frase anterior.
Si no pide ninguna, ambos false. Pueden ser true los dos.`
