
UPDATE permissions SET perm_name='page.user.dashboard' WHERE perm_name='page.dashboard';
UPDATE permissions SET perm_name='page.user.servers' WHERE perm_name='page.servers';
UPDATE permissions SET perm_name='page.user.mods' WHERE perm_name='page.mods';
UPDATE permissions SET perm_name='page.user.logs' WHERE perm_name='page.logs';
UPDATE permissions SET perm_name='page.user.saves' WHERE perm_name='page.saves';
UPDATE permissions SET perm_name='page.user.admin' WHERE perm_name='page.admin';

UPDATE config SET config_value = 'v1.1.17' WHERE config_key='version';