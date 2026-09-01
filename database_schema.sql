-- Direct Contacts Azure SQL Database schema
-- Run against your Azure SQL Database (e.g. via sqlcmd, Azure Data Studio, or the Query Editor in the Azure portal).
-- Replaces the previous SQLite schema. Authentication is now handled by Microsoft Entra ID (Azure AD) SSO,
-- so agents are identified by their organizational email instead of a code + password.

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'agents')
BEGIN
    CREATE TABLE agents (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        name          NVARCHAR(200) NOT NULL,
        email         NVARCHAR(320) NOT NULL,               -- must match the email/UPN returned by Azure AD
        code          NVARCHAR(50)  NOT NULL,                -- short display code, kept for QR links / reports
        role          NVARCHAR(20)  NOT NULL DEFAULT 'agent',-- 'agent', 'manager', or 'both'
        created_at    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_agents_email UNIQUE (email),
        CONSTRAINT UQ_agents_code  UNIQUE (code),
        CONSTRAINT CK_agents_role  CHECK (role IN ('agent', 'manager', 'both'))
    );
END;

-- Existing installations originally allowed only agent/manager. Recreate the
-- named constraint so a person can safely hold both capabilities.
IF EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = 'CK_agents_role' AND parent_object_id = OBJECT_ID('agents')
)
BEGIN
    ALTER TABLE agents DROP CONSTRAINT CK_agents_role;
END;

ALTER TABLE agents ADD CONSTRAINT CK_agents_role CHECK (role IN ('agent', 'manager', 'both'));

-- Counties are assigned by a manager. One agent may serve several counties;
-- each survey link carries exactly one of these assignments for attribution.
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'agent_counties')
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

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'submissions')
BEGIN
    CREATE TABLE submissions (
        id                INT IDENTITY(1,1) PRIMARY KEY,
        agent_id          INT NOT NULL,
        submission_date   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        city_county       NVARCHAR(100) NULL,
        phone             NVARCHAR(30)  NULL,
        race              NVARCHAR(400) NULL,
        age_group         NVARCHAR(50)  NULL,
        sex               NVARCHAR(30)  NULL,
        contact_method    NVARCHAR(30)  NULL,
        wants_info        NVARCHAR(10)  NULL,
        allow_followup    NVARCHAR(10)  NULL,
        CONSTRAINT FK_submissions_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
END;

-- Follow-up email addresses are deliberately separated from demographic
-- submissions. They are associated only with the responsible agent account.
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

-- Seed an initial manager so the first sign-in via Azure AD has somewhere to land.
-- Replace the email below with the real Entra ID account before running, then manage
-- everyone else from the Admin Panel once you can sign in.
IF NOT EXISTS (SELECT * FROM agents WHERE email = 'bebakytbekuly@pvamu.edu')
BEGIN
    INSERT INTO agents (name, email, code, role) VALUES ('Beknar', 'bebakytbekuly@pvamu.edu', 'MANAGER', 'manager');
END;
