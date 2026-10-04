/**
 * Alerta si un explorador lleva 3 días sin tarea, misión ni desafío.
 * Una pasada y termina. Lo dispara .github/workflows/notify-inactivity.yml.
 * El envío por WhatsApp entra cuando haya proveedor y tabla de envíos.
 * El cooldown será uno por racha, no un aviso cada día.
 */
console.log('notify-inactivity: sin proveedor de WhatsApp, no se envió nada')
