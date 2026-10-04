-- Estilos de planeta variados en tropas demo (C7). Idempotente por nombre.

UPDATE troops SET planet_style_id = 'rocky_blue', planet_seed = 1001
WHERE name = 'Los Veloces';

UPDATE troops SET planet_style_id = 'neon_violet', planet_seed = 1002
WHERE name = 'Estrellas del Norte';

UPDATE troops SET planet_style_id = 'forest_green', planet_seed = 1003
WHERE name = 'Guardianes del Saber';

UPDATE troops SET planet_style_id = 'ice_cyan', planet_seed = 1004
WHERE name = 'Rayos Azules';

UPDATE troops SET planet_style_id = 'lava_amber', planet_seed = 1005
WHERE name = 'Cometas del Sur';

UPDATE troops SET planet_style_id = 'rose_dust', planet_seed = 1006
WHERE name = 'Pioneros';
