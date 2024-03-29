
ALTER TABLE agents ADD COLUMN agent_running INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agents ADD COLUMN agent_active INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agents ADD COLUMN agent_info TEXT NOT NULL DEFAULT '';
ALTER TABLE agents ADD COLUMN agent_memory INT NOT NULL DEFAULT 1073741824;

INSERT INTO permissions(perm_name) VALUES("api.servers");
INSERT INTO permissions(perm_name) VALUES("api.serveractions");

UPDATE config SET config_value = 'v1.1.31' WHERE config_key='version';