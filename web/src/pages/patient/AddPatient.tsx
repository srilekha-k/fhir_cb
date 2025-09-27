import React from 'react';
import Navbar from '../../components/Navbar';

export default function AddPatient() {
  const [given, setGiven] = React.useState('');
  const [family, setFamily] = React.useState('');
  const [gender, setGender] = React.useState<'male' | 'female' | 'other' | 'unknown' | ''>('');
  const [birthDate, setBirthDate] = React.useState('');
  const [addrLine, setAddrLine] = React.useState('');
  const [addrCity, setAddrCity] = React.useState('');
  const [addrState, setAddrState] = React.useState('');
  const [addrPostal, setAddrPostal] = React.useState('');
  const [addrCountry, setAddrCountry] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');

  const [loading, setLoading] = React.useState(false);
  const [successId, setSuccessId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const btnStyle: React.CSSProperties = {
    padding: '10px 18px',
    fontWeight: 600,
    borderRadius: 6,
    border: 'none',
    background: '#2c3e50',
    color: '#fff',
    cursor: 'pointer',
  };

  function clearFormFields() {
    setGiven('');
    setFamily('');
    setGender('');
    setBirthDate('');
    setAddrLine('');
    setAddrCity('');
    setAddrState('');
    setAddrPostal('');
    setAddrCountry('');
    setPhone('');
    setEmail('');
  }

  function onClear() {
    clearFormFields();
    setError(null);
  }

  function inferIdFromLocationHeader(location: string | null): string | null {
    if (!location) return null;
    const match = location.match(/\/Patient\/([^\/]+)\//i);
    return match?.[1] || null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessId(null);
    setCopied(false);

    const fullName = [given, family].filter(Boolean).join(' ').trim();
    const text = fullName ? { status: 'generated' as const, div: `<div>${fullName}</div>` } : undefined;

    const randomId = Math.floor(100000 + Math.random() * 900000).toString();
    const identifier = [
      {
        use: 'usual' as const,
        system: 'http://hospital.smarthealthit.org',
        value: randomId,
      },
    ];

    const body = {
      resourceType: 'Patient',
      text,
      identifier,
      active: true, 
      name:
        given || family
          ? [{ use: 'official' as const, family: family || undefined, given: given ? [given] : undefined }]
          : undefined,
      gender: gender || undefined,
      birthDate: birthDate || undefined,
      address:
        addrLine || addrCity || addrState || addrPostal || addrCountry
          ? [
              {
                use: 'home' as const,
                line: addrLine ? [addrLine] : undefined,
                city: addrCity || undefined,
                state: addrState || undefined,
                postalCode: addrPostal || undefined,
                country: addrCountry || undefined,
              },
            ]
          : undefined,
      telecom: [
        ...(phone ? [{ system: 'phone' as const, value: phone, use: 'mobile' as const }] : []),
        ...(email ? [{ system: 'email' as const, value: email, use: 'home' as const }] : []),
      ],
    };

    try {
      setLoading(true);
      const res = await fetch('https://hapi.fhir.org/baseR4/Patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json',
          'Accept': 'application/fhir+json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(body),
      });

      const locationHeader = res.headers.get('Location');
      let data: any = null;
      try {
        data = await res.json();
      } catch {
      }

      if (!res.ok || data?.resourceType === 'OperationOutcome') {
        const diag =
          data?.issue?.map((i: any) => i?.diagnostics || `${i?.severity} ${i?.code}`).join(' | ') ||
          `HTTP ${res.status}`;
        throw new Error(diag);
      }

      const newId = data?.id || inferIdFromLocationHeader(locationHeader) || '';
      setSuccessId(newId || '(id not returned by server)');
      clearFormFields();
    } catch (err: any) {
      setError(err?.message || 'Failed to create patient.');
    } finally {
      setLoading(false);
    }
  }

  async function copyId() {
    if (!successId) return;
    try {
      await navigator.clipboard.writeText(successId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
    }
  }

  return (
    <>
      <Navbar />
      <main className="container">
        <h1>Add Patient</h1>

        <div className="card" style={{ marginBottom: 16 }}>
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label>
              Given Name
              <input
                type="text"
                value={given}
                onChange={(e) => setGiven(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }}
              />
            </label>

            <label>
              Family Name
              <input
                type="text"
                value={family}
                onChange={(e) => setFamily(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }}
              />
            </label>

            <label>
              Gender
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="unknown">Unknown</option>
              </select>
            </label>

            <label>
              Birth Date
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }}
              />
            </label>

            <label>
              Address Line
              <input
                type="text"
                value={addrLine}
                onChange={(e) => setAddrLine(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }}
              />
            </label>

            <label>
              City
              <input
                type="text"
                value={addrCity}
                onChange={(e) => setAddrCity(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }}
              />
            </label>

            <label>
              State
              <input
                type="text"
                value={addrState}
                onChange={(e) => setAddrState(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }}
              />
            </label>

            <label>
              Postal Code
              <input
                type="text"
                value={addrPostal}
                onChange={(e) => setAddrPostal(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }}
              />
            </label>

            <label>
              Country
              <input
                type="text"
                value={addrCountry}
                onChange={(e) => setAddrCountry(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }}
              />
            </label>

            <label>
              Phone
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }}
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }}
              />
            </label>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" style={btnStyle} disabled={loading}>
                {loading ? 'Submitting…' : 'Submit'}
              </button>
              <button type="button" style={{ ...btnStyle, background: '#888' }} onClick={onClear}>
                Clear
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="card" style={{ borderColor: '#f5c2c7', background: '#fff5f6', color: '#842029', marginBottom: 16 }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {successId && (
          <div className="card" style={{ borderColor: '#badbcc', background: '#f6fffa', color: '#0f5132', marginBottom: 16 }}>
            <strong>Patient created!</strong>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>New ID:</span>
              <code style={{ padding: '6px 10px', borderRadius: 6, background: '#eef6ff' }}>{successId}</code>
              <button type="button" onClick={copyId} style={btnStyle}>
                {copied ? 'Copied!' : 'Copy ID'}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
