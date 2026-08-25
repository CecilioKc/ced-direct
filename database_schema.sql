-- CED-Direct Azure SQL Database schema
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
        role          NVARCHAR(20)  NOT NULL DEFAULT 'agent',-- 'agent' or 'manager'
        created_at    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_agents_email UNIQUE (email),
        CONSTRAINT UQ_agents_code  UNIQUE (code),
        CONSTRAINT CK_agents_role  CHECK (role IN ('agent', 'manager'))
    );
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'submissions')
BEGIN
    CREATE TABLE submissions (
        id                INT IDENTITY(1,1) PRIMARY KEY,
        agent_id          INT NOT NULL,
        submission_date   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        city_county       NVARCHAR(100) NULL,
        phone             NVARCHAR(30)  NULL,
        email             NVARCHAR(320) NULL,
        race              NVARCHAR(400) NULL,
        age_group         NVARCHAR(50)  NULL,
        sex               NVARCHAR(30)  NULL,
        contact_method    NVARCHAR(30)  NULL,
        wants_info        NVARCHAR(10)  NULL,
        allow_followup    NVARCHAR(10)  NULL,
        CONSTRAINT FK_submissions_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
END;

IF COL_LENGTH('submissions', 'email') IS NULL
BEGIN
    ALTER TABLE submissions ADD email NVARCHAR(320) NULL;
END;

-- Seed an initial manager so the first sign-in via Azure AD has somewhere to land.
-- Replace the email below with the real Entra ID account before running, then manage
-- everyone else from the Admin Panel once you can sign in.
IF NOT EXISTS (SELECT * FROM agents WHERE email = 'bebakytbekuly@pvamu.edu')
BEGIN
    INSERT INTO agents (name, email, code, role) VALUES ('Beknar', 'bebakytbekuly@pvamu.edu', 'MANAGER', 'manager');
END;
