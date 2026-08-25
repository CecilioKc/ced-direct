'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Agent { id: number; name: string; code: string; }

export default function SurveyPage() {
  const params = useParams();
  const urlAgentId = params.agentId as string;
  const isGeneral = urlAgentId === '0';

  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentInfo, setAgentInfo] = useState<Agent | null>(null);
  const [step, setStep] = useState(isGeneral ? 0 : 1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agentSearch, setAgentSearch] = useState('');

  const [form, setForm] = useState({
    selectedAgentId: isGeneral ? null as number | null : parseInt(urlAgentId),
    selectedAgentName: '',
    county: '',
    phone: '',
    email: '',
    race: [] as string[],
    age_group: '',
    sex: '',
    contact_method: '',
    wants_info: '',
    allow_followup: '',
  });

  useEffect(() => {
    if (isGeneral) {
      fetch((process.env.NEXT_PUBLIC_BASE_PATH ?? "") + '/api/agents/public')
        .then(r => r.json())
        .then(data => { setAgents(data.agents || []); setAgentsLoading(false); });
    } else {
      fetch((process.env.NEXT_PUBLIC_BASE_PATH ?? "") + '/api/agents/public')
        .then(r => r.json())
        .then(data => {
          const agents = data.agents || [];
          const found = agents.find((a: Agent) => a.id === parseInt(urlAgentId));
          if (found) {
            setAgentInfo(found);
            setForm(p => ({ ...p, selectedAgentId: found.id, selectedAgentName: found.name, county: '' }));
          }
          setAgentsLoading(false);
        });
    }
  }, [urlAgentId, isGeneral]);

  const normalizeCountyName = (value: string) => value.trim().split(/\s+/).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ');

  const getCountiesForAgent = (agent?: Agent | null) => {
    if (!agent?.code) return [];
    const counties = agent.code
      .split(/\s+/)
      .map(part => part.trim())
      .filter(Boolean)
      .map(normalizeCountyName);
    return Array.from(new Set(counties));
  };

  const selectedAgent = isGeneral ? agents.find(a => a.id === form.selectedAgentId) ?? null : agentInfo;
  const agentCounties = getCountiesForAgent(selectedAgent);
  const showCountyQuestion = agentCounties.length > 1;

  const toggleRace = (race: string) => {
    setForm(prev => {
      if (race === "Prefer not to respond") {
        return { ...prev, race: ["Prefer not to respond"] };
      }
      const filtered = prev.race.filter(r => r !== "Prefer not to respond");
      return {
        ...prev,
        race: filtered.includes(race)
          ? filtered.filter(r => r !== race)
          : [...filtered, race],
      };
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const countyValue = agentCounties.length === 1 ? agentCounties[0] : form.county;
      if (showCountyQuestion && !countyValue) {
        setError('Please select your county.');
        return;
      }

      const res = await fetch((process.env.NEXT_PUBLIC_BASE_PATH ?? "") + '/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: form.selectedAgentId,
          city_county: countyValue,
          phone: form.phone,
          email: form.email,
          race: form.race,
          age_group: form.age_group,
          sex: form.sex,
          contact_method: form.contact_method,
          wants_info: form.wants_info,
          allow_followup: form.allow_followup,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message || 'Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter(a =>
    a.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
    a.code.toLowerCase().includes(agentSearch.toLowerCase())
  );

  const OptionButton = ({ name, value, current, onChange }: {
    name: string; value: string; current: string; onChange: () => void;
  }) => (
    <button onClick={onChange}
      className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 text-left transition-all ${current === value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
      <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${current === value ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}`}>
        {current === value && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
      </div>
      <span className={`text-base ${current === value ? 'text-indigo-700 font-semibold' : 'text-gray-700'}`}>{value}</span>
    </button>
  );

  const CheckButton = ({ value, checked, onChange }: {
    value: string; checked: boolean; onChange: () => void;
  }) => (
    <button onClick={onChange}
      className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 text-left transition-all ${checked ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
      <div className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center ${checked ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}`}>
        {checked && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
      </div>
      <span className={`text-base ${checked ? 'text-indigo-700 font-semibold' : 'text-gray-700'}`}>{value}</span>
    </button>
  );

  const agentName = isGeneral ? form.selectedAgentName : (agentInfo?.name || '...');

  if (submitted) {
    return (
      <div style={{ backgroundColor: '#4F2D7F' }} className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-500 mb-1">Response recorded.</p>
          <p className="text-gray-400 text-sm">Your participation helps PVAMU Extension serve our community better.</p>
        </div>
      </div>
    );
  }

  // Agent badge intentionally hidden from participants — agent mapping is still
  // tracked internally via form.selectedAgentId / agentInfo for data attribution.
  const agentBadge = false && !isGeneral && agentInfo && (
    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 flex items-center gap-3 mb-6">
      <div className="w-10 h-10 bg-indigo-200 rounded-xl flex items-center justify-center flex-shrink-0">
        <span className="text-indigo-700 font-bold text-lg">{agentInfo?.name.charAt(0)}</span>
      </div>
      <div>
        <p className="text-xs text-indigo-500">You are signing in with</p>
        <p className="font-bold text-indigo-700">{agentInfo?.name}</p>
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#4F2D7F' }} className="min-h-screen flex flex-col">
      <div style={{ backgroundColor: '#4F2D7F' }} className="px-5 pt-12 pb-5 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-1">
          {step > (isGeneral ? 0 : 1) && (
            <button onClick={() => setStep(step - 1)} className="text-white/80 p-1 -ml-1">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg">CED-Direct Sign-in</h1>
            <p className="text-indigo-200 text-xs">PVAMU Extension Program</p>
          </div>
        </div>

        {/* Step indicators container has constant height to stop visual layout shifting */}
        <div className="h-4 mt-3 flex items-center">
          {step > 0 && (
            <div className="flex gap-1.5 w-full">
              {[1,2,3].map(s => (
                <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${step >= s ? 'bg-white' : 'bg-white/30'}`} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content area uses flex-1 so it fills remaining viewport without extra empty scroll space */}
      <div className="bg-white rounded-t-3xl flex-1 px-5 pt-7 pb-10">

        {/* Step 0 - Agent Selection (general QR only) */}
        {step === 0 && isGeneral && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Who did you meet with?</h2>
            <p className="text-gray-500 mb-5">Select the CED agent you interacted with today</p>
            <div className="relative mb-4">
              <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={agentSearch} onChange={e => setAgentSearch(e.target.value)}
                placeholder="Search by agent name..."
                style={{ color: '#111827' }}
                className="w-full border-2 border-gray-200 rounded-2xl pl-11 pr-4 py-4 text-base focus:outline-none focus:border-indigo-400 bg-gray-50" />
            </div>
            {agentsLoading ? (
              <div className="text-center py-12 text-gray-400">Loading agents...</div>
            ) : (
              <div className="space-y-2">
                {filteredAgents.map(a => (
                  <button key={a.id}
                    onClick={() => { setForm(p => ({ ...p, selectedAgentId: a.id, selectedAgentName: a.name, county: '' })); setError(''); setStep(1); }}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-2xl text-left bg-white active:bg-indigo-50 active:border-indigo-400 transition-all">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-700 font-bold text-xl">{a.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-base">{a.name}</p>
                      <p className="text-gray-400 text-sm">{a.code}</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
                {!filteredAgents.length && <div className="text-center py-12 text-gray-400">No agents found</div>}
              </div>
            )}
            <p className="text-center text-xs text-gray-400 mt-6">This form does not collect your name or email automatically</p>
          </div>
        )}

        {/* Step 1 - Contact Info */}
        {step === 1 && (
          <div>
            {agentBadge}
            <div className="space-y-5">
              {showCountyQuestion && (
                <div>
                  <label className="block text-base font-bold text-gray-800 mb-2">County</label>
                  <select value={form.county} onChange={e => { setError(''); setForm(p => ({ ...p, county: e.target.value })); }}
                    style={{ color: '#111827' }}
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-indigo-400 bg-white">
                    <option value="">Select your county</option>
                    {agentCounties.map(county => (
                      <option key={county} value={county}>{county}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-base font-bold text-gray-800 mb-2">Phone Number <span className="text-gray-400 font-normal text-sm">(optional)</span></label>
                <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="(555) 000-0000"
                  style={{ color: '#111827' }}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-indigo-400 bg-white" />
              </div>
              <div>
                <label className="block text-base font-bold text-gray-800 mb-2">Email <span className="text-gray-400 font-normal text-sm">(optional)</span></label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="you@example.com"
                  style={{ color: '#111827' }}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-indigo-400 bg-white" />
              </div>
              {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm" aria-live="polite">{error}</div>}
              <button onClick={() => {
                setError('');
                if (showCountyQuestion && !form.county) {
                  setError('Please select your county.');
                  return;
                }
                setStep(2);
              }}
                style={{ backgroundColor: '#4F2D7F' }}
                className="w-full text-white py-4 rounded-2xl text-lg font-bold mt-2 active:bg-indigo-800">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 - Demographics */}
        {step === 2 && (
          <div>
            {agentBadge}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-6">
              <p className="text-amber-700 font-bold text-sm">Optional — Demographics</p>
              <p className="text-amber-600 text-xs mt-0.5">This information helps us better serve our community.</p>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-base font-bold text-gray-800 mb-3">Race / Ethnicity <span className="text-gray-400 font-normal text-sm">(select all that apply)</span></label>
                <div className="space-y-2">
                  {["American Indian or Alaska Native","Asian","Black or African American","Hispanic or Latino","Middle Eastern or North African","Native Hawaiian or Pacific Islander","White","Prefer not to respond"].map(race => (
                    <CheckButton key={race} value={race} checked={form.race.includes(race)} onChange={() => toggleRace(race)} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-base font-bold text-gray-800 mb-3">Age Group</label>
                <div className="space-y-2">
                  {["Less than 5 Years","5-17 Years","18-29 Years","30-59 Years","60-75 Years","76 Years or older","Prefer not to respond"].map(age => (
                    <OptionButton key={age} name="age" value={age} current={form.age_group} onChange={() => setForm(p => ({ ...p, age_group: age }))} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-base font-bold text-gray-800 mb-3">Sex</label>
                <div className="space-y-2">
                  {["Male","Female","Prefer not to respond"].map(s => (
                    <OptionButton key={s} name="sex" value={s} current={form.sex} onChange={() => setForm(p => ({ ...p, sex: s }))} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="flex-1 border-2 border-gray-200 text-gray-700 py-4 rounded-2xl text-base font-bold">← Back</button>
                <button style={{ backgroundColor: '#4F2D7F' }} onClick={() => setStep(3)} className="flex-[2] text-white py-4 rounded-2xl text-base font-bold">Continue →</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 - Follow up */}
        {step === 3 && (
          <div>
            {agentBadge}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-6">
              <p className="text-blue-700 font-bold text-sm">Follow-Up Preferences</p>
              <p className="text-blue-600 text-xs mt-0.5">Help us stay connected with you.</p>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-base font-bold text-gray-800 mb-3">How would you like to receive additional information?</label>
                <div className="space-y-2">
                  {["Phone call","Email","Text"].map(m => (
                    <OptionButton key={m} name="contact_method" value={m} current={form.contact_method} onChange={() => setForm(p => ({ ...p, contact_method: m }))} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-base font-bold text-gray-800 mb-3">Would you like info about future Extension programs?</label>
                <div className="space-y-2">
                  {["Yes","No"].map(opt => (
                    <OptionButton key={opt} name="wants_info" value={opt} current={form.wants_info} onChange={() => setForm(p => ({ ...p, wants_info: opt }))} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-base font-bold text-gray-800 mb-3">May we contact you for follow-up or evaluation?</label>
                <div className="space-y-2">
                  {["Yes","No"].map(opt => (
                    <OptionButton key={opt} name="allow_followup" value={opt} current={form.allow_followup} onChange={() => setForm(p => ({ ...p, allow_followup: opt }))} />
                  ))}
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm" aria-live="polite">{error}</div>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(2)} className="flex-1 border-2 border-gray-200 text-gray-700 py-4 rounded-2xl text-base font-bold">← Back</button>
                <button onClick={handleSubmit} disabled={loading}
                  style={{ backgroundColor: '#4F2D7F' }}
                  className="flex-[2] text-white py-4 rounded-2xl text-base font-bold disabled:opacity-50">
                  {loading ? 'Submitting...' : 'Submit ✓'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
