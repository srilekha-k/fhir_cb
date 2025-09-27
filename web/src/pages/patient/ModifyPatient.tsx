import React from 'react';
import Navbar from '../../components/Navbar';

type HumanName = { use?: string; family?: string; given?: string[]; text?: string };
type Identifier = { use?: string; system?: string; value?: string };
type Telecom = { system?: string; value?: string; use?: string };
type Address = { line?: string[]; city?: string; state?: string; postalCode?: string; country?: string };

type FhirPatient = {
  resourceType: 'Patient';
  id?: string;
  identifier?: Identifier[];
  active?: boolean;
  name?: HumanName[];
  gender?: string;
  birthDate?: string;
  address?: Address[];
  telecom?: Telecom[];
};

const btnStyle: React.CSSProperties = {
  padding: '10px 18px',
  fontWeight: 600,
  borderRadius: 6,
  border: 'none',
  background: '#2c3e50',
  color: '#fff',
  cursor: 'pointer',
};

export default function ModifyPatient() {
  // Step 1: load by ID
  const [patientId, setPatientId] = React.useState('');
  const [loadingLoad, setLoadingLoad] = React.useState(false);

  // Editable fields
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

  // Other UI state
  const [loadedPatient, setLoadedPatient] = React.useState<FhirPatient | null>(null);
  const [loadingSave, setLoadingSave] = React.useState(false);
  const [successId, setSuccessId] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Confirmation modal
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [previewBody, setPreviewBody] = React.useState<FhirPatient | null>(null);

  function resetFormFields() {
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

  function onClearAll() {
    setPatientId('');
    setLoadedPatient(null);
    resetFormFields();
    setError(null);
    // keep successId visible
  }

  // Helpers to extract fields from loaded resource
  function pickName(p: FhirPatient | null) {
    const n = p?.name?.[0];
    if (!n) return;
    setFamily(n.family || '');
    setGiven(n.given?.[0] || '');
  }
  function pickTelecom(p: FhirPatient | null) {
    const t = p?.telecom || [];
    setPhone(t.find(x => x.system === 'phone')?.value || '');
    setEmail(t.find(x => x.system === 'email')?.value || '');
  }
  function pickAddress(p: FhirPatient | null) {
    const a = p?.address?.[0];
    if (!a) return;
    setAddrLine((a.line && a.line[0]) || '');
    setAddrCity(a.city || '');
    setAddrState(a.state || '');
    setAddrPostal(a.postalCode || '');
    setAddrCountry(a.country || '');
  }

  async function onLoad(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessId(null);
    setCopied(false);
    setLoadedPatient(null);
    resetFormFields();

    const id = patientId.trim();
    if (!id) {
      setError('Please enter a Patient ID.');
      return;
    }

    try {
      setLoadingLoad(true);
      const res = await fetch(`https://hapi.fhir.org/baseR4/Patient/${encodeURIComponent(id)}`, {
        headers: { Accept: 'application/fhir+json, application/json;q=0.9' },
      });
      const data = await res.json();

      if (!res.ok || data?.resourceType !== 'Patient') {
        const diag =
          data?.issue?.map((i: any) => i?.diagnostics || `${i?.severity} ${i?.code}`).join(' | ') ||
          `HTTP ${res.status}`;
        throw new Error(diag);
      }

      const p = data as FhirPatient;
      setLoadedPatient(p);

      // Prefill form from loaded patient
      pickName(p);
      setGender((p.gender as any) || '');
      setBirthDate(p.birthDate || '');
      pickAddress(p);
      pickTelecom(p);
    } catch (err: any) {
      setError(err?.message || 'Failed to load patient.');
    } finally {
      setLoadingLoad(false);
    }
  }

  // Ensure at least one identifier (random 6-digit) and active true; rebuild narrative from name
  function buildUpdatedResource(): FhirPatient {
    // Use existing identifiers if any; otherwise inject a random 6-digit identifier
    const existingIds =
      loadedPatient?.identifier && loadedPatient.identifier.length > 0
        ? loadedPatient.identifier
        : [
            {
              use: 'usual',
              system: 'http://hospital.smarthealthit.org',
              value: Math.floor(100000 + Math.random() * 900000).toString(),
            },
          ];

    const fullName = [given, family].filter(Boolean).join(' ').trim();
    const text = fullName ? { status: 'generated', div: `<div>${fullName}</div>` } : undefined;

    return {
      resourceType: 'Patient',
      id: patientId.trim(),
      identifier: existingIds,
      active: true, // default to true on update
      name:
        given || family
          ? [{ use: 'official', family: family || undefined, given: given ? [given] : undefined }]
          : undefined,
      gender: gender || undefined,
      birthDate: birthDate || undefined,
      address:
        addrLine || addrCity || addrState || addrPostal || addrCountry
          ? [
              {
                use: 'home',
                line: addrLine ? [addrLine] : undefined,
                city: addrCity || undefined,
                state: addrState || undefined,
                postalCode: addrPostal || undefined,
                country: addrCountry || undefined,
              },
            ]
          : undefined,
      telecom: [
        ...(phone ? [{ system: 'phone', value: phone, use: 'mobile' as const }] : []),
        ...(email ? [{ system: 'email', value: email, use: 'home' as const }] : []),
      ],
      // @ts-ignore – add text without declaring in type to keep type simple
      text,
    } as any;
  }

  function inferIdFromLocationHeader(location: string | null): string | null {
    if (!location) return null;
    const match = location.match(/\/Patient\/([^\/]+)\//i);
    return match?.[1] || null;
  }

  // Step 1 for update: ask for confirmation and show preview
  function onAskConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessId(null);
    setCopied(false);

    const id = patientId.trim();
    if (!id) {
      setError('Please enter a Patient ID.');
      return;
    }
    if (!loadedPatient) {
      setError('Load the patient first, then update.');
      return;
    }

    const body = buildUpdatedResource();
    setPreviewBody(body);
    setShowConfirm(true);
  }

  // Step 2 for update: actually perform the PUT
  async function doUpdate() {
    if (!previewBody) return;
    const id = patientId.trim();

    try {
      setLoadingSave(true);
      const res = await fetch(`https://hapi.fhir.org/baseR4/Patient/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/fhir+json',
          Accept: 'application/fhir+json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(previewBody),
      });

      const locationHeader = res.headers.get('Location');
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // 200/201 with empty body is possible
      }

      if (!res.ok || data?.resourceType === 'OperationOutcome') {
        const diag =
          data?.issue?.map((i: any) => i?.diagnostics || `${i?.severity} ${i?.code}`).join(' | ') ||
          `HTTP ${res.status}`;
        throw new Error(diag);
      }

      // Success
      const returnedId = data?.id || inferIdFromLocationHeader(locationHeader) || id;
      setSuccessId(returnedId);

      // Refresh loaded patient baseline to what we just sent (or response)
      setLoadedPatient(data?.resourceType === 'Patient' ? (data as FhirPatient) : previewBody);
    } catch (err: any) {
      setError(err?.message || 'Failed to update patient.');
    } finally {
      setLoadingSave(false);
      setShowConfirm(false);
      setPreviewBody(null);
    }
  }

  async function copyId() {
    if (!successId) return;
    try {
      await navigator.clipboard.writeText(successId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  return (
    <>
      <Navbar />
      <main className="container">
        <h1>Modify Patient</h1>

        {/* Step 1: Enter ID and Load */}
        <div className="card" style={{ marginBottom: 16 }}>
          <form onSubmit={onLoad} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label htmlFor="patientId" style={{ marginBottom: 4 }}>
              Patient ID
            </label>
            <input
              id="patientId"
              type="text"
              placeholder="e.g. 49200045"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 6,
                border: '1px solid #ccc',
                fontSize: '1rem',
              }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" style={btnStyle} disabled={loadingLoad}>
                {loadingLoad ? 'Loading…' : 'Load'}
              </button>
              <button type="button" style={{ ...btnStyle, background: '#888' }} onClick={onClearAll}>
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Step 2: Edit form (only visible after load) */}
        {loadedPatient && (
          <div className="card" style={{ marginBottom: 16 }}>
            <form onSubmit={onAskConfirm} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label>
                Given Name
                <input
                  type="text"
                  value={given}
                  onChange={(e) => setGiven(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 6,
                    border: '1px solid #ccc',
                    fontSize: '1rem',
                  }}
                />
              </label>

              <label>
                Family Name
                <input
                  type="text"
                  value={family}
                  onChange={(e) => setFamily(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 6,
                    border: '1px solid #ccc',
                    fontSize: '1rem',
                  }}
                />
              </label>

              <label>
                Gender
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 6,
                    border: '1px solid #ccc',
                    fontSize: '1rem',
                  }}
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
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 6,
                    border: '1px solid #ccc',
                    fontSize: '1rem',
                  }}
                />
              </label>

              <label>
                Address Line
                <input
                  type="text"
                  value={addrLine}
                  onChange={(e) => setAddrLine(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 6,
                    border: '1px solid #ccc',
                    fontSize: '1rem',
                  }}
                />
              </label>

              <label>
                City
                <input
                  type="text"
                  value={addrCity}
                  onChange={(e) => setAddrCity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 6,
                    border: '1px solid #ccc',
                    fontSize: '1rem',
                  }}
                />
              </label>

              <label>
                State
                <input
                  type="text"
                  value={addrState}
                  onChange={(e) => setAddrState(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 6,
                    border: '1px solid #ccc',
                    fontSize: '1rem',
                  }}
                />
              </label>

              <label>
                Postal Code
                <input
                  type="text"
                  value={addrPostal}
                  onChange={(e) => setAddrPostal(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 6,
                    border: '1px solid #ccc',
                    fontSize: '1rem',
                  }}
                />
              </label>

              <label>
                Country
                <input
                  type="text"
                  value={addrCountry}
                  onChange={(e) => setAddrCountry(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 6,
                    border: '1px solid #ccc',
                    fontSize: '1rem',
                  }}
                />
              </label>

              <label>
                Phone
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 6,
                    border: '1px solid #ccc',
                    fontSize: '1rem',
                  }}
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 6,
                    border: '1px solid #ccc',
                    fontSize: '1rem',
                  }}
                />
              </label>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" style={btnStyle} disabled={loadingSave}>
                  {loadingSave ? 'Updating…' : 'Update'}
                </button>
                <button type="button" style={{ ...btnStyle, background: '#888' }} onClick={resetFormFields}>
                  Reset Fields
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Error card */}
        {error && (
          <div
            className="card"
            style={{
              borderColor: '#f5c2c7',
              background: '#fff5f6',
              color: '#842029',
              marginBottom: 16,
              whiteSpace: 'pre-wrap',
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Success card */}
        {successId && (
          <div
            className="card"
            style={{ borderColor: '#badbcc', background: '#f6fffa', color: '#0f5132', marginBottom: 16 }}
          >
            <strong>Patient updated!</strong>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>ID:</span>
              <code style={{ padding: '6px 10px', borderRadius: 6, background: '#eef6ff' }}>{successId}</code>
              <button type="button" onClick={copyId} style={btnStyle}>
                {copied ? 'Copied!' : 'Copy ID'}
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirm && previewBody && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              zIndex: 1000,
            }}
            onClick={() => setShowConfirm(false)}
          >
            <div
              className="card"
              style={{ maxWidth: 640, width: '100%', background: '#fff', padding: 20, borderRadius: 8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="confirm-title" style={{ marginTop: 0 }}>
                Confirm Update
              </h2>
              <p>Are you sure you want to update this patient?</p>

              {/* Quick summary */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <strong>ID:</strong> {previewBody.id}
                </div>
                <div>
                  <strong>Name:</strong>{' '}
                  {[previewBody.name?.[0]?.given?.[0], previewBody.name?.[0]?.family]
                    .filter(Boolean)
                    .join(' ') || '—'}
                </div>
                <div>
                  <strong>Gender:</strong> {previewBody.gender || '—'}
                </div>
                <div>
                  <strong>Birth Date:</strong> {previewBody.birthDate || '—'}
                </div>
                <div>
                  <strong>Phone:</strong> {previewBody.telecom?.find((t) => t.system === 'phone')?.value || '—'}
                </div>
                <div>
                  <strong>Email:</strong> {previewBody.telecom?.find((t) => t.system === 'email')?.value || '—'}
                </div>
                <div>
                  <strong>Address:</strong>{' '}
                  {previewBody.address?.[0]
                    ? [
                        previewBody.address[0].line?.[0],
                        previewBody.address[0].city,
                        previewBody.address[0].state,
                        previewBody.address[0].postalCode,
                        previewBody.address[0].country,
                      ]
                        .filter(Boolean)
                        .join(', ')
                    : '—'}
                </div>
                <div>
                  <strong>Active:</strong> {previewBody.active ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong>Identifier:</strong> {previewBody.identifier?.[0]?.value || '—'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirm(false);
                    setPreviewBody(null);
                  }}
                  style={{ ...btnStyle, background: '#888' }}
                >
                  Cancel
                </button>
                <button type="button" onClick={doUpdate} style={btnStyle} disabled={loadingSave}>
                  {loadingSave ? 'Updating…' : 'Confirm Update'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
