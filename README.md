This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

The Direct Contacts agent/manager dashboards sign in via Microsoft Entra ID (Azure AD) and store data in Azure SQL Database. Copy `.env.example` to `.env.local` and fill in the Azure AD + Azure SQL values before running locally — see `DEPLOYMENT.md` for full setup instructions, including IIS production deployment.

Agents can have the role `agent`, `manager`, or `both`. Dual-role users can switch between self-scoped Agent View and organization-wide Manager View. Survey email follow-up addresses are stored in `agent_contact_emails`, linked to the selected agent and separate from demographic submissions.

Managers assign one or more counties to every Agent account from the official 254-county Texas list, preventing spelling variations in reports. A one-county Agent receives a county-specific survey QR immediately; an Agent serving several counties chooses the current county before generating the QR. The respondent is not asked a county question. The API validates the QR county against both the official list and `agent_counties` before storing it with the submission.

## Test-server login without Microsoft

The app has a fail-closed local login for test environments. It uses the same Auth.js session and authorization checks as Microsoft SSO, but looks up an allow-listed agent code in the test database.

Set these server-side values in the test server's `.env.local` or process environment:

```dotenv
AUTH_MODE=local
DEPLOYMENT_ENV=test
LOCAL_AUTH_PASSWORD=<random value with at least 16 characters>
LOCAL_AUTH_ALLOWED_CODES=TEST-AGENT,TEST-MANAGER
LOCAL_AUTH_ALLOWED_HOSTS=localhost:3000,test.example.edu
```

The listed codes must already exist in that environment's `agents` table. Use the exact browser host, including its port if present. Local login is refused when `DEPLOYMENT_ENV` is not exactly `test`, when the request host is not allow-listed, or when any required setting is missing. Production stays on `AUTH_MODE=azure`; none of the local-auth values are public browser variables.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Run the authentication safety checks with:

```bash
npm test
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
