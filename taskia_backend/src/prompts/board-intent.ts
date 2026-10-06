export const BOARD_INTENT_SYSTEM = `Clasifica el mensaje de un niño sobre la pizarra.
Responde SOLO este JSON, sin texto extra:
{"review_drawing":false,"draw_exercise":false,"help_exercise":false}
review_drawing=true solo si pide que miren, revisen o corrijan SU dibujo o SU respuesta.
draw_exercise=true solo si pide que le pongan un ejercicio, figura o enunciado nuevo.
help_exercise=true si pide ayuda para entender o resolver un ejercicio (aunque mande la foto del enunciado).
Una foto de papel no es la pizarra.
"sí", "dale" o "hazlo" se entienden con la frase anterior.
Si no pide ninguna, los tres false. Pueden ser true varios.`
