ALTER TABLE risk_records
    ADD COLUMN IF NOT EXISTS owner VARCHAR(150),
    ADD COLUMN IF NOT EXISTS due_date DATE,
    ADD COLUMN IF NOT EXISTS mitigation_plan VARCHAR(2000);

UPDATE risk_records
SET owner = COALESCE(owner, 'Admin'),
    due_date = COALESCE(due_date, CURRENT_DATE + INTERVAL '14 days')
WHERE deleted = FALSE;
