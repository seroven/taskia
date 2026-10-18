# Taskia — Recorrido actual (capturas)

Documentación corta de **cómo se ve y se recorre** la plataforma hoy. Las capturas se tomaron de la app en local. El detalle de reglas está en [FUNCIONES.md](../FUNCIONES.md).

---

## 1. Entrada

Cualquier rol llega a la misma puerta. Usuario y contraseña (cuentas demo: explorador `Seroven`, guardián `Claudia`, admin `Sebastian`).

![Pantalla de login](capturas/01-login.png)

---

## 2. Explorador — Hub

Tras entrar, el explorador elige a dónde ir. **Tripulación** está cerrada a propósito. **Mundos** y **Campamento** están abiertos.

![Hub del explorador](capturas/02-hub-explorador.png)

---

## 3. Campamento — Hoy y Proyectos

Lista del día (diarias) y pestaña de proyectos. Se agregan tareas, se marca Listo o se entra a estudiar con Taskia.

![Campamento — Hoy](capturas/03-campamento-hoy.png)

![Campamento — Proyectos](capturas/04-campamento-proyectos.png)

---

## 4. Estudio con Taskia

Desde una tarea con ayuda, el chat abre en fase de entendimiento. Texto, Hablar o Foto.

![Estudio de una tarea](capturas/05-estudio-tarea.png)

Al pulsar **Hablar**, el micrófono se abre al lado del chat: se toca el círculo para hablar y Taskia responde en voz.

![Estudio con audio](capturas/05b-estudio-hablar.png)

---

## 5. Mundos

Temas, cursos, misiones y desafíos. Primero la lista, luego el detalle del mundo y el del curso.

![Lista de mundos](capturas/06-mundos-lista.png)

![Detalle de un mundo](capturas/07-mundo-detalle.png)

![Detalle de un curso](capturas/08-curso-detalle.png)

Un desafío ya hecho se abre en su detalle: puntaje y cada pregunta con lo que se respondió.

![Detalle de un desafío](capturas/08b-desafio-detalle.png)

Al empezar uno nuevo, Taskia no habla: una pregunta a la vez, con reloj y avance.

![Desafío en juego](capturas/08c-desafio-juego.png)

---

## 6. Guardián

Panel del adulto: chat del día a la izquierda; nivel, tripulación y avisos a la derecha. Cambia de explorador con los chips.

![Panel del guardián](capturas/09-guardian.png)

---

## 7. Administrador

Resumen del sistema y alta de **Guardianes y Exploradores** (vínculo obligatorio).

![Panel de administrador](capturas/10-admin-panel.png)

![Guardianes y Exploradores](capturas/11-admin-cuentas.png)

---

## Mapa rápido

```
Login
 ├─ Explorador → Hub → Campamento → Estudio
 │                 └→ Mundos → Mundo → Curso → (misión / desafío)
 ├─ Guardián → Panel (chat + progreso del explorador)
 └─ Admin → Panel → Guardianes y Exploradores
```

Para regenerar las capturas (con front y back en marcha):

```bash
node docs/producto/recorrido/capture.mjs
```
