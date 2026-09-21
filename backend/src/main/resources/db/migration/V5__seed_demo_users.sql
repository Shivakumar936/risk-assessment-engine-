INSERT INTO users (username, email, password)
VALUES
    ('admin', 'admin@risk.com', '$2a$10$JVeePojwvuPf4YQhSAvJLukDeQ8eliuqKKz9BxopHDawcYYc1DG4q')
ON CONFLICT (email) DO UPDATE
SET username = EXCLUDED.username,
    password = EXCLUDED.password;

INSERT INTO users (username, email, password)
VALUES
    ('manager', 'manager@risk.com', '$2a$10$n/zbMXkaLC0O2Ntn.pyMnOy9jlWMIiy301yHIf4N7K./YNqIL3DaC')
ON CONFLICT (email) DO UPDATE
SET username = EXCLUDED.username,
    password = EXCLUDED.password;

INSERT INTO users (username, email, password)
VALUES
    ('viewer', 'viewer@risk.com', '$2a$10$c9U8nGslvFLSMC.GlLtisur/gMteH/EYNRdYVIvU3qnVWF45VXBE.')
ON CONFLICT (email) DO UPDATE
SET username = EXCLUDED.username,
    password = EXCLUDED.password;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'ADMIN'
WHERE u.username = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'MANAGER'
WHERE u.username = 'manager'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'VIEWER'
WHERE u.username = 'viewer'
ON CONFLICT DO NOTHING;
