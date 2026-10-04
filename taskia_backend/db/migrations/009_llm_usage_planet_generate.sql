-- Uso LLM: generación de parámetros de planeta (Tropas C6).

ALTER TABLE llm_usage DROP CONSTRAINT IF EXISTS llm_usage_kind_check;

ALTER TABLE llm_usage
  ADD CONSTRAINT llm_usage_kind_check CHECK (kind IN (
    'task_tutor',
    'mission_tutor',
    'transcribe',
    'challenge_generate',
    'challenge_grade',
    'parent_tutor',
    'planet_generate'
  ));
