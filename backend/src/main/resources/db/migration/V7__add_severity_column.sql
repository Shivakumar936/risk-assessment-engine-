ALTER TABLE risk_records
    ADD COLUMN IF NOT EXISTS severity VARCHAR(50);

UPDATE risk_records
SET risk_score = 85, severity = 'HIGH'
WHERE id = 1 AND (risk_score IS NULL OR severity IS NULL);

UPDATE risk_records
SET risk_score = 75, severity = 'HIGH'
WHERE id = 2 AND (risk_score IS NULL OR severity IS NULL);

UPDATE risk_records
SET risk_score = 45, severity = 'MEDIUM'
WHERE id = 3 AND (risk_score IS NULL OR severity IS NULL);

UPDATE risk_records
SET severity = CASE
    WHEN risk_score >= 70 THEN 'HIGH'
    WHEN risk_score >= 40 THEN 'MEDIUM'
    ELSE 'LOW'
END
WHERE severity IS NULL;

UPDATE risk_records
SET risk_score = CASE
    WHEN severity = 'HIGH' THEN 80
    WHEN severity = 'MEDIUM' THEN 50
    ELSE 20
END
WHERE risk_score IS NULL;
