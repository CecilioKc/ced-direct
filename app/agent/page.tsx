'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Image from 'next/image';

interface ReportData {
  total: number;
  race: { race: string; count: number }[];
  age: { age_group: string; count: number }[];
  sex: { sex: string; count: number }[];
  county: { county: string; count: number }[];
  trend: { month: string; count: number }[];
  contact: { contact_method: string; count: number }[];
}

interface ContactEmail {
  id: number;
  email: string;
  created_at: string;
}

type AgentTab = 'overview' | 'emails';

interface AgentProfile {
  name: string;
  code: string;
  id: number;
  role: 'agent' | 'manager' | 'both';
  counties: string[];
}

const MONTHS = Array.from({ length: 5 }, (_, i) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - i);
  return {
    value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
  };
});

const PURPLE = '#4F2D7F';
const GOLD = '#FFB81C';

export default function AgentPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [contactEmails, setContactEmails] = useState<ContactEmail[]>([]);
  const [activeTab, setActiveTab] = useState<AgentTab>('overview');
  const [emailSearch, setEmailSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCountyPicker, setShowCountyPicker] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrCounty, setQrCounty] = useState('');
  const [qrSurveyUrl, setQrSurveyUrl] = useState('');

  const fetchReport = useCallback(async (month: string, county: string) => {
    const params = new URLSearchParams();
    params.set('scope', 'self');
    if (month) params.set('month', month);
    if (county) params.set('county', county);
    const url = (process.env.NEXT_PUBLIC_BASE_PATH ?? "") + `/api/reports?${params}`;
    const res = await fetch(url);
    if (res.status === 401) { router.push('/'); return; }
    const data = await res.json();
    setReport(data);
  }, [router]);

  useEffect(() => {
    Promise.all([
      fetch((process.env.NEXT_PUBLIC_BASE_PATH ?? "") + '/api/reports?scope=self').then(r => r.status === 401 ? null : r.json()),
      fetch((process.env.NEXT_PUBLIC_BASE_PATH ?? "") + '/api/auth/me').then(r => r.ok ? r.json() : null),
      fetch((process.env.NEXT_PUBLIC_BASE_PATH ?? "") + '/api/contact-emails').then(r => r.ok ? r.json() : null),
    ]).then(([reportData, agentData, contactData]) => {
      if (!reportData) { router.push('/'); return; }
      setReport(reportData);
      if (agentData) setAgent(agentData);
      if (contactData) setContactEmails(contactData.emails ?? []);
      setLoading(false);
    });
  }, [router]);

  const generateQRForCounty = async (county: string) => {
    if (!agent) return;
    setQrLoading(true);
    try {
      const QRCode = (await import('qrcode')).default;
      const surveyUrl = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin) + `/survey/${agent.id}?county=${encodeURIComponent(county)}`;
      const url = await QRCode.toDataURL(surveyUrl, {
        width: 400,
        margin: 2,
        color: { dark: '#4F2D7F', light: '#FFFFFF' },
      });
      setQrUrl(url);
      setQrCounty(county);
      setQrSurveyUrl(surveyUrl);
      setShowCountyPicker(false);
      setShowQR(true);
    } catch (e) {
      console.error('QR error:', e);
      alert('Failed to generate QR code.');
    } finally {
      setQrLoading(false);
    }
  };

  const generateQR = () => {
    if (!agent) return;
    if (!agent.counties?.length) {
      alert('No county is assigned to this account. Ask a manager to add one in the Admin Panel.');
      return;
    }
    if (agent.counties.length === 1) {
      void generateQRForCounty(agent.counties[0]);
      return;
    }
    setShowCountyPicker(true);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/` });
  };

  const Bar = ({ count, total, color }: { count: number; total: number; color: string }) => (
    <div className="w-full bg-gray-100 rounded-full h-3">
      <div className="h-3 rounded-full transition-all" style={{ width: `${Math.round((count / (total || 1)) * 100)}%`, backgroundColor: color }} />
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: GOLD }}>
            <svg className="w-8 h-8" style={{ color: PURPLE }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <p className="font-semibold" style={{ color: PURPLE }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const countyOptions = agent?.counties ?? [];
  const filteredContactEmails = contactEmails.filter(item =>
    item.email.toLowerCase().includes(emailSearch.trim().toLowerCase())
  );
  const chartSections = [
    { title: 'Race / Ethnicity', data: (report?.race ?? []).filter(r => r.race).map(r => ({ label: r.race, count: r.count })), color: PURPLE },
    { title: 'Age Groups', data: (report?.age ?? []).filter(a => a.age_group).map(a => ({ label: a.age_group, count: a.count })), color: '#6b42a8' },
    { title: 'Sex', data: (report?.sex ?? []).filter(s => s.sex).map(s => ({ label: s.sex, count: s.count })), color: GOLD },
    { title: 'County', data: (report?.county ?? []).filter(c => c.county).map(c => ({ label: c.county, count: c.count })), color: '#2f7d4f' },
    { title: 'Preferred Contact Method', data: (report?.contact ?? []).filter(c => c.contact_method).map(c => ({ label: c.contact_method, count: c.count })), color: '#e6a100' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav style={{ backgroundColor: PURPLE }} className="text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: GOLD }}>
            <svg className="w-6 h-6" style={{ color: PURPLE }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Direct Contacts</h1>
            <p className="text-xs leading-tight" style={{ color: '#ffd166' }}>Agent Dashboard — {agent?.name ?? '...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {agent?.role === 'both' && (
            <button onClick={() => router.push('/manager')}
              className="px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-white/30 hover:bg-white/10 transition">
              Manager View
            </button>
          )}
          {agent && (
            <button onClick={generateQR} disabled={qrLoading}
              style={{ backgroundColor: GOLD, color: PURPLE }}
              className="px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition disabled:opacity-50">
              {qrLoading ? 'Generating...' : '📱 My QR Code'}
            </button>
          )}
          <button onClick={handleLogout}
            className="px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-white/30 hover:bg-white/10 transition">
            Logout
          </button>
        </div>
      </nav>

      {/* Gold accent bar */}
      <div className="h-1" style={{ backgroundColor: GOLD }} />

      <div className="bg-white border-b border-gray-200 print:hidden">
        <div className="max-w-5xl mx-auto px-6 flex gap-7" role="tablist" aria-label="Agent dashboard sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            className={`py-4 border-b-4 text-sm font-bold transition ${activeTab === 'overview' ? 'border-amber-400' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            style={activeTab === 'overview' ? { color: PURPLE } : undefined}
          >
            Overview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'emails'}
            onClick={() => setActiveTab('emails')}
            className={`py-4 border-b-4 text-sm font-bold transition flex items-center gap-2 ${activeTab === 'emails' ? 'border-amber-400' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            style={activeTab === 'emails' ? { color: PURPLE } : undefined}
          >
            Email Follow-ups
            <span className="min-w-6 rounded-full bg-purple-50 px-2 py-0.5 text-xs text-center" style={{ color: PURPLE }}>
              {contactEmails.length}
            </span>
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {activeTab === 'overview' ? (
          <>
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:hidden">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: PURPLE }}>Survey Overview</h2>
                <p className="text-sm text-gray-500 mt-1">Review response totals and demographic trends.</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Assigned counties</p>
                <div className="flex flex-wrap gap-2 mt-2 sm:justify-end">
                  {(agent?.counties ?? []).map(county => (
                    <span key={county} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{county}</span>
                  ))}
                  {!agent?.counties?.length && <span className="text-xs font-semibold text-red-500">Ask a manager to assign a county</span>}
                </div>
              </div>
            </header>

            <div className="bg-white rounded-xl shadow-sm p-5 flex flex-wrap items-end gap-4">
              <div>
                <label htmlFor="month-filter" className="block text-xs font-bold mb-2" style={{ color: PURPLE }}>Month</label>
                <select id="month-filter" value={selectedMonth} onChange={event => {
                  const month = event.target.value;
                  setSelectedMonth(month);
                  void fetchReport(month, selectedCounty);
                }} className="border-2 border-gray-300 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none">
                  <option value="">Last 5 months</option>
                  {MONTHS.map(month => <option key={month.value} value={month.value}>{month.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="county-filter" className="block text-xs font-bold mb-2" style={{ color: PURPLE }}>County</label>
                <select id="county-filter" value={selectedCounty} onChange={event => {
                  const county = event.target.value;
                  setSelectedCounty(county);
                  void fetchReport(selectedMonth, county);
                }} className="border-2 border-gray-300 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none">
                  <option value="">All assigned counties</option>
                  {countyOptions.map(county => <option key={county} value={county}>{county}</option>)}
                </select>
              </div>
              <button onClick={() => window.print()} style={{ backgroundColor: PURPLE }} className="ml-auto text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition">
                Export / Print Report
              </button>
            </div>

            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <div className="bg-white rounded-xl shadow-sm p-6 border-t-4" style={{ borderColor: PURPLE }}>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Total Contacts</p>
                <p className="text-5xl font-bold mt-2" style={{ color: PURPLE }}>{report?.total ?? 0}</p>
              </div>
              {report?.trend.slice(-3).map(trend => (
                <div key={trend.month} className="bg-white rounded-xl shadow-sm p-6 border-t-4" style={{ borderColor: GOLD }}>
                  <p className="text-xs font-bold text-gray-500">{trend.month}</p>
                  <p className="text-3xl font-bold mt-2 text-gray-800">{trend.count}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {chartSections.map(({ title, data, color }) => (
                <div key={title} className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-bold mb-4 text-base flex items-center gap-2" style={{ color: PURPLE }}>
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
                    {title}
                  </h3>
                  <div className="space-y-3">
                    {data.map(row => (
                      <div key={row.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{row.label}</span>
                          <span className="font-bold text-gray-800">{row.count} ({Math.round((row.count / (report?.total || 1)) * 100)}%)</span>
                        </div>
                        <Bar count={row.count} total={report?.total ?? 1} color={color} />
                      </div>
                    ))}
                    {!data.length && <p className="text-gray-400 text-sm">No data yet</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <section className="space-y-5" role="tabpanel">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: PURPLE }}>Email Follow-ups</h2>
                <p className="text-sm text-gray-500 mt-1">Email addresses requested for follow-up, stored separately from demographic responses.</p>
              </div>
              <div className="rounded-xl bg-purple-50 px-4 py-2 text-sm font-bold self-start sm:self-auto" style={{ color: PURPLE }}>
                {contactEmails.length} {contactEmails.length === 1 ? 'address' : 'addresses'}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <label htmlFor="email-search" className="block text-xs font-bold text-gray-600 mb-2">Search email addresses</label>
                <input id="email-search" type="search" value={emailSearch} onChange={event => setEmailSearch(event.target.value)} placeholder="Search by email address" className="w-full sm:max-w-md border-2 border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-purple-400" />
              </div>
              {filteredContactEmails.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr><th className="px-5 py-3 font-bold">Email address</th><th className="px-5 py-3 font-bold">Received</th><th className="px-5 py-3 font-bold text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredContactEmails.map(item => (
                        <tr key={item.id} className="hover:bg-purple-50/40">
                          <td className="px-5 py-4 font-medium text-gray-800">{item.email}</td>
                          <td className="px-5 py-4 text-sm text-gray-500"><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time></td>
                          <td className="px-5 py-4 text-right"><a href={`mailto:${item.email}`} className="inline-flex rounded-lg border-2 border-purple-100 px-3 py-1.5 text-sm font-bold hover:bg-purple-50" style={{ color: PURPLE }}>Send email</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-14 text-center">
                  <div className="w-12 h-12 rounded-full bg-purple-50 mx-auto flex items-center justify-center text-xl" aria-hidden="true">✉</div>
                  <h3 className="font-bold text-gray-800 mt-4">{contactEmails.length ? 'No matching email addresses' : 'No email follow-up requests yet'}</h3>
                  <p className="text-sm text-gray-500 mt-1">{contactEmails.length ? 'Try a different search.' : 'New email requests will appear here after a survey is submitted.'}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">Protect these contact details and use them only for the follow-up requested by the respondent.</p>
          </section>
        )}
      </main>

      {/* County selection for agents serving more than one county */}
      {showCountyPicker && agent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-7 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold" style={{ color: PURPLE }}>Choose the current county</h2>
            <p className="text-sm text-gray-500 mt-2">
              This county will be included in the QR link. Respondents will not be asked to select it.
            </p>
            <div className="space-y-3 mt-6">
              {agent.counties.map(county => (
                <button
                  key={county}
                  type="button"
                  onClick={() => void generateQRForCounty(county)}
                  disabled={qrLoading}
                  className="w-full flex items-center justify-between rounded-xl border-2 border-gray-200 px-4 py-4 text-left font-bold text-gray-800 hover:border-purple-300 hover:bg-purple-50 disabled:opacity-50"
                >
                  <span>{county}</span>
                  <span aria-hidden="true" style={{ color: PURPLE }}>→</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setShowCountyPicker(false)} className="w-full mt-5 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: GOLD }}>
              <svg className="w-6 h-6" style={{ color: PURPLE }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: PURPLE }}>Your Survey QR Code</h2>
            <p className="text-gray-500 text-sm mb-2">Agent: <span className="font-bold" style={{ color: PURPLE }}>{agent?.name}</span></p>
            <p className="text-sm font-bold mb-2" style={{ color: PURPLE }}>County: {qrCounty}</p>
            <p className="text-gray-400 text-xs mb-5">Participants scan this after your interaction</p>
            {qrUrl && (
              <div className="p-3 rounded-2xl inline-block" style={{ border: `4px solid ${GOLD}` }}>
                <Image src={qrUrl} alt="QR Code" width={400} height={400} unoptimized className="rounded-xl" />
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3 break-all">{qrSurveyUrl}</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowQR(false)}
                className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50">
                Close
              </button>
              <a href={qrUrl} download={`qr-${agent?.code}-${qrCounty.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`}
                style={{ backgroundColor: PURPLE }}
                className="flex-1 text-white py-3 rounded-xl font-bold hover:opacity-90 text-center">
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
