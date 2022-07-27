
ALTER TABLE agents ADD COLUMN agent_running INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agents ADD COLUMN agent_active INTEGER NOT NULL DEFAULT 0;


UPDATE config SET config_value = 'v1.1.31' WHERE config_key='version';