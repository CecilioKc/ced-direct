# Direct Contacts Deployment Guide

## Tech Stack
- Next.js 16 (TypeScript)
- Azure SQL Database (via `mssql`)
- Microsoft Entra ID (Azure AD) SSO via Auth.js / NextAuth
- IIS (Windows Server) as the production host, reverse-proxying to a Node.js process
- Node.js 20 LTS

## 1. Set up Microsoft Entra ID (SSO)
1. In the [Entra admin center](https://entra.microsoft.com), go to **App registrations > New registration**.
2. Name it (e.g. "Direct Contacts"), leave supported account types as your organization's tenant only.
3. Redirect URI: type **Web**, value `https://yourdomain.com/api/auth/callback/azure-ad`
   (use `http://localhost:3000/api/auth/callback/azure-ad` for local dev).
4. After creation, note the **Application (client) ID** and **Directory (tenant) ID** from the Overview page.
5. Go to **Certificates & secrets > New client secret**, create one, and copy its value immediately (it's only shown once).
6. No API permissions beyond the default `openid`/`profile`/`email` are required for this app.

## 2. Set up Azure SQL Database
1. In the Azure portal, create a **SQL Database** (and a new or existing **SQL server** if you don't have one).
2. Under the server's **Networking** settings, allow the IIS server's outbound IP (or enable "Allow Azure services" if hosting elsewhere in Azure).
3. Create a login/user with rights to the database, or use the server admin credentials.
4. Run `database_schema.sql` against the new database (Azure Data Studio, `sqlcmd`, or the Query Editor in the portal) to create the application tables, including `agent_counties`.
5. Add at least one manager row so someone can sign in and use the Admin Panel to add everyone else — see the commented-out `INSERT` at the bottom of `database_schema.sql`.

## 3. Environment Variables
Copy `.env.example` to `.env.local` (dev) or configure the same variables as real environment variables / IIS `web.config` app settings in production:

    AUTH_SECRET=                # npx auth secret
    AUTH_URL=https://yourdomain.com
    AUTH_MODE=azure
    DEPLOYMENT_ENV=production
    AZURE_AD_CLIENT_ID=
    AZURE_AD_CLIENT_SECRET=
    AZURE_AD_TENANT_ID=
    AZURE_SQL_SERVER=yourserver.database.windows.net
    AZURE_SQL_DATABASE=ced-direct
    AZURE_SQL_USER=
    AZURE_SQL_PASSWORD=
    NEXT_PUBLIC_APP_URL=https://yourdomain.com

### Test server without Microsoft SSO

Only on the test server, set the following server-side variables instead of the Azure AD values:

    AUTH_MODE=local
    DEPLOYMENT_ENV=test
    LOCAL_AUTH_PASSWORD=<random value with at least 16 characters>
    LOCAL_AUTH_ALLOWED_CODES=TEST-AGENT,TEST-MANAGER
    LOCAL_AUTH_ALLOWED_HOSTS=test.example.edu

Each allowed code must exist in the test database's `agents` table. `LOCAL_AUTH_ALLOWED_HOSTS` contains exact request hosts and must include the port if the browser uses one. The server refuses to enable this provider without the `test` deployment marker, the complete configuration, and a matching request host.

Do not put these variables in `NEXT_PUBLIC_*`, `ecosystem.config.js`, `web.config`, or any committed file. Keep the test server on a separate hostname from production.

## 4. Build for production

For an existing database, run the application migration before deploying the updated code:

    sqlcmd -S <server> -d <database> -i database_migration_dual_role_contact_emails.sql
    sqlcmd -S <server> -d <database> -i database_migration_agent_counties.sql

Then set a dual-role account through the Admin Panel (`Agent + Manager`) or with:

    UPDATE agents SET role = 'both' WHERE email = 'the.real.account@pvamu.edu';

Role changes are refreshed from the database on authenticated requests. The migrations create `agent_contact_emails` and `agent_counties`; new survey email addresses stay separate from demographic submissions.

After deployment, open **Manager Dashboard > Admin Panel** and assign at least one county to every Agent or Agent + Manager account using the official Texas county dropdown. Existing submissions are intentionally not reassigned because their historical county cannot be inferred safely. Agents must generate new QR codes after their county assignments are saved; older QR links without a county are rejected.

    npm install
    npm run build
    npm run start        # starts the Node server on port 3000 (set PORT env var to change)

Verify it locally with `curl http://127.0.0.1:3000` before wiring up IIS.

## 5. Deploy on IIS (Windows Server)
Direct Contacts runs as its own Node.js process; IIS's job is to terminate TLS on 80/443 and reverse-proxy everything to that process. This is more reliable for a modern Next.js app than running it directly under `iisnode`.

1. Install [Node.js 20 LTS](https://nodejs.org/) on the Windows server.
2. Install the IIS **URL Rewrite** module and **Application Request Routing (ARR)**.
3. In IIS Manager, select the server node > **Application Request Routing Cache > Server Proxy Settings**, and check **Enable proxy**.
4. Copy the project (or `git clone` it) onto the server, run `npm install --omit=dev` and `npm run build` in that folder.
5. Keep the app running as a background service so it survives reboots and IIS resets — either:
   - **NSSM** (`nssm install CedDirect "C:\Program Files\nodejs\node.exe" "C:\path\to\ced-direct\node_modules\next\dist\bin\next" start`), or
   - **PM2** with `pm2-windows-startup`.
   Set the environment variables from step 3 on that service/process (NSSM: `nssm set CedDirect AppEnvironmentExtra ...`; PM2: an ecosystem file).
6. In IIS Manager, create a new Site bound to your domain on port 80 (and 443 with an SSL certificate), with its physical path set to this project folder — `web.config` in the repo root supplies the reverse-proxy rule to `127.0.0.1:3000`.
7. Browse to the site; requests should now flow IIS → ARR → the Node process → Next.js.
8. (Optional) Add an IIS URL Rewrite rule to redirect HTTP to HTTPS.

## 6. Production Checklist
- [ ] Entra ID app registration created, redirect URI matches `AUTH_URL`
- [ ] At least one manager row exists in `agents` (Azure SQL) with the correct sign-in email
- [ ] `database_migration_agent_counties.sql` has been run before deploying the new code
- [ ] Every Agent and Agent + Manager account has at least one assigned county
- [ ] `AUTH_SECRET` is a real random value, not left blank
- [ ] `AUTH_MODE=azure` and `DEPLOYMENT_ENV=production`
- [ ] No `LOCAL_AUTH_*` variables are present on the production service
- [ ] `AZURE_SQL_*` and `AZURE_AD_*` env vars set on the actual Windows service/process (not just `.env.local`, which isn't read by NSSM/PM2 in production)
- [ ] HTTPS certificate bound in IIS; HTTP redirects to HTTPS
- [ ] Node process is running as a service (NSSM/PM2) that auto-restarts on crash/reboot
- [ ] Azure SQL server firewall allows only the IIS server's IP

## Notes
- The participant-facing survey form (`/survey/[agentId]`) is intentionally left unauthenticated — participants are anonymous and never sign in.
- `Dockerfile.dev` / `docker compose` remain useful for local development but are not the production deployment path described above.

## Support
Repository: https://github.com/CecilioKc/ced-direct
