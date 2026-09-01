-- Run once against an existing Direct Contacts SQL Server database before deploying
-- the matching application code. The migration is safe to re-run.

IF EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = 'CK_agents_role' AND parent_object_id = OBJECT_ID('agents')
)
BEGIN
    ALTER TABLE agents DROP CONSTRAINT CK_agents_role;
END;

ALTER TABLE agents ADD CONSTRAINT CK_agents_role
    CHECK (role IN ('agent', 'manager', 'both'));

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'agent_contact_emails')
BEGIN
    CREATE TABLE agent_contact_emails (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        agent_id      INT NOT NULL,
        email         NVARCHAR(320) NOT NULL,
        created_at    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_agent_contact_emails_agent
            FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_agent_contact_emails_agent_created'
      AND object_id = OBJECT_ID('agent_contact_emails')
)
BEGIN
    CREATE INDEX IX_agent_contact_emails_agent_created
        ON agent_contact_emails (agent_id, created_at DESC);
END;

-- After running this migration, assign dual access using the real account:
-- UPDATE agents SET role = 'both' WHERE email = 'dr.nate@example.edu';
