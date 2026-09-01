-- Run once before deploying the manager-assigned county feature.
-- Safe to run repeatedly. Existing submissions are not changed.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'agent_counties')
BEGIN
    CREATE TABLE agent_counties (
        agent_id      INT NOT NULL,
        county        NVARCHAR(100) NOT NULL,
        created_at    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_agent_counties PRIMARY KEY (agent_id, county),
        CONSTRAINT FK_agent_counties_agent
            FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_agent_counties_county'
      AND object_id = OBJECT_ID('agent_counties')
)
BEGIN
    CREATE INDEX IX_agent_counties_county ON agent_counties (county, agent_id);
END;

-- Assign counties after deployment through Manager Dashboard > Admin Panel.
-- Example only:
-- INSERT INTO agent_counties (agent_id, county)
-- SELECT id, 'Brazos' FROM agents WHERE email = 'agent@example.edu';
