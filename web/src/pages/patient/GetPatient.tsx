import React from 'react';
import Navbar from '../../components/Navbar';

type HumanName = { use?: string; family?: string; given?: string[]; text?: string };
type Identifier = { use?: string; system?: string; value?: string };
type Telecom = { system?: string; value?: string; use?: string };
type Address = { line?: string[]; city?: string; state?: string; postalCode?: string; country?: string };
type Meta = { versionId?: string; lastUpdated?: string; source?: string };

type FhirPatient = {
  resourceType: 'Patient';
  id?: string;
  meta?: Meta;
  identifier?: Identifier[];
  active?: boolean;
  name?: HumanName[];
  telecom?: Telecom[];
  gender?: string;
  birthDate?: string;
  address?: Address[];
};

function formatName(names?: HumanName[]) {
  if (!names?.length) return '—';
  const n = names[0];
  if (n.text) return n.text;
  const parts = [...(n.given || []), n.family || ''].filter(Boolean);
  return parts.join(' ');
}
function findTelecom(telecom: Telecom[] | undefined, system: 'phone' | 'email') {
  return telecom?.find(t => t.system === system)?.value || '—';
}
function formatIdentifiers(ids?: Identifier[]) {
  if (!ids?.length) return '—';
  return ids.map(i => i?.value).filter(Boolean).join(', ');
}
function formatAddress(addr?: Address[]) {
  if (!addr?.length) return '—';
  const a = addr[0];
  const line = (a.line || []).join(', ');
  const cityStateZip = [a.city, a.state, a.postalCode].filter(Boolean).join(', ');
  const country = a.country || '';
  return [line, cityStateZip, country].filter(Boolean).join(' • ');
}

const btnStyle: React.CSSProperties = {
  padding: '10px 18px',
  fontWeight: 600,
  borderRadius: 6,
  border: 'none',
  background: '#2c3e50',
  color: '#fff',
  cursor: 'pointer',
};

export default function GetPatient() {
  const [patientId, setPatientId] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [patient, setPatient] = React.useState<FhirPatient | null>(null);
  const [rawOpen, setRawOpen] = React.useState(false);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPatient(null);
    setRawOpen(false);

    const id = patientId.trim();
    if (!id) {
      setError('Please enter a Patient ID.');
      return;
    }

    try {
      setLoading(true);
      const url = `https://hapi.fhir.org/baseR4/Patient/${encodeURIComponent(id)}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/fhir+json, application/json;q=0.9' },
      });
      const data = await res.json();

      if (!res.ok || data?.resourceType !== 'Patient') {
        const diag =
          data?.issue?.map((i: any) => i?.diagnostics || `${i?.severity} ${i?.code}`).join(' | ') ||
          `HTTP ${res.status}`;
        throw new Error(diag);
      }

      setPatient(data as FhirPatient);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch patient.');
    } finally {
      setLoading(false);
    }
  }

  function onClear() {
    setPatientId('');
    setPatient(null);
    setError(null);
    setRawOpen(false);
  }

  return (
    <>
      <Navbar />
      <main className="container">
        <h1>Get Patient</h1>

        <div className="card" style={{ marginBottom: 16 }}>
          <form onSubmit={onSearch} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label htmlFor="patientId" style={{ marginBottom: 4 }}>Patient ID</label>

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
              <button type="submit" style={btnStyle} disabled={loading}>
                {loading ? 'Searching…' : 'Search'}
              </button>
              <button type="button" style={{ ...btnStyle, background: '#888' }} onClick={onClear}>
                Clear
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div
            className="card"
            style={{
              borderColor: '#f5c2c7',
              background: '#fff5f6',
              color: '#842029',
              marginBottom: 16,
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}


        {patient && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Patient Summary</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: 8 }}>
              <div><strong>Patient.id</strong></div>
              <div>{patient.id || '—'}</div>

              <div><strong>Name</strong></div>
              <div>{formatName(patient.name)}</div>

              <div><strong>Gender</strong></div>
              <div>{patient.gender || '—'}</div>

              <div><strong>Birth Date</strong></div>
              <div>{patient.birthDate || '—'}</div>

              <div><strong>Identifiers</strong></div>
              <div>{formatIdentifiers(patient.identifier)}</div>

              <div><strong>Phone</strong></div>
              <div>{findTelecom(patient.telecom, 'phone')}</div>

              <div><strong>Email</strong></div>
              <div>{findTelecom(patient.telecom, 'email')}</div>

              <div><strong>Address</strong></div>
              <div>{formatAddress(patient.address)}</div>

              <div><strong>Active</strong></div>
              <div>{patient.active ? 'Yes' : 'No'}</div>

              <div><strong>Last Updated</strong></div>
              <div>{patient.meta?.lastUpdated || '—'}</div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
