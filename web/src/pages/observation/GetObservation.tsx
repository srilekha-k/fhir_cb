import React from 'react';
import Navbar from '../../components/Navbar';

type Meta = { versionId?: string; lastUpdated?: string; source?: string };

type Coding = { system?: string; code?: string; display?: string };
type CodeableConcept = { coding?: Coding[]; text?: string };
type Quantity = { value?: number; unit?: string; system?: string; code?: string };
type Reference = { reference?: string; display?: string };

type ObservationComponent = {
  code?: CodeableConcept;
  valueQuantity?: Quantity;
  valueCodeableConcept?: CodeableConcept;
  valueString?: string;
  valueInteger?: number;
  valueBoolean?: boolean;
};

type FhirObservation = {
  resourceType: 'Observation';
  id?: string;
  meta?: Meta;
  status?: string;
  category?: CodeableConcept[];
  code?: CodeableConcept;
  subject?: Reference;
  effectiveDateTime?: string;
  effectivePeriod?: { start?: string; end?: string };
  valueQuantity?: Quantity;              // for single-valued observations
  component?: ObservationComponent[];    // for panels (e.g., 85353-1, 85354-9)
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

// LOINC dictionary for vital components we want to show explicitly
const LOINC = {
  VITALS_PANEL: '85353-1',
  BP_PANEL: '85354-9',
  SYSTOLIC: '8480-6',
  DIASTOLIC: '8462-4',
  HEART_RATE: '8867-4',
  TEMP_C: '8310-5',
  HEIGHT_CM: '8302-2',
  WEIGHT_KG: '29463-7',
  BMI: '39156-5',
} as const;

function firstCodingText(cc?: CodeableConcept): string {
  if (!cc) return '—';
  if (cc.text) return cc.text;
  const c = cc.coding?.[0];
  return c?.display || c?.code || '—';
}
function displayCategory(categories?: CodeableConcept[]): string {
  if (!categories?.length) return '—';
  return categories.map(c => firstCodingText(c)).join(', ');
}
function displayEffective(obs: FhirObservation): string {
  if (obs.effectiveDateTime) return obs.effectiveDateTime;
  const p = obs.effectivePeriod;
  if (p?.start || p?.end) return [p?.start, p?.end].filter(Boolean).join(' → ');
  return '—';
}
function fmtQty(q?: Quantity): string {
  if (!q || q.value == null) return '—';
  const u = q.unit || q.code || '';
  return [q.value, u].filter(Boolean).join(' ');
}
function qtyFromComponent(components: ObservationComponent[] | undefined, loincCode: string): Quantity | undefined {
  return components
    ?.find(c => c.code?.coding?.some(cd => (cd.system?.includes('loinc') || cd.system === 'http://loinc.org') && cd.code === loincCode))
    ?.valueQuantity;
}
function getPanelVitals(components?: ObservationComponent[]) {
  return {
    systolic: qtyFromComponent(components, LOINC.SYSTOLIC),
    diastolic: qtyFromComponent(components, LOINC.DIASTOLIC),
    heartRate: qtyFromComponent(components, LOINC.HEART_RATE),
    temperature: qtyFromComponent(components, LOINC.TEMP_C),
    height: qtyFromComponent(components, LOINC.HEIGHT_CM),
    weight: qtyFromComponent(components, LOINC.WEIGHT_KG),
    bmi: qtyFromComponent(components, LOINC.BMI),
  };
}

export default function GetObservation() {
  const [observationId, setObservationId] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [obs, setObs] = React.useState<FhirObservation | null>(null);
  const [rawOpen, setRawOpen] = React.useState(false);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setObs(null);
    setRawOpen(false);

    const id = observationId.trim();
    if (!id) {
      setError('Please enter an Observation ID.');
      return;
    }

    try {
      setLoading(true);
      const url = `https://hapi.fhir.org/baseR4/Observation/${encodeURIComponent(id)}`;
      const res = await fetch(url, { headers: { Accept: 'application/fhir+json, application/json;q=0.9' } });
      const data = await res.json();

      if (!res.ok || data?.resourceType !== 'Observation') {
        const diag =
          data?.issue?.map((i: any) => i?.diagnostics || `${i?.severity} ${i?.code}`).join(' | ') ||
          `HTTP ${res.status}`;
        throw new Error(diag);
      }

      setObs(data as FhirObservation);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch observation.');
    } finally {
      setLoading(false);
    }
  }

  function onClear() {
    setObservationId('');
    setObs(null);
    setError(null);
    setRawOpen(false);
  }

  // Derivations
  const isPanel =
    obs?.code?.coding?.some(c => c?.code === LOINC.VITALS_PANEL || c?.code === LOINC.BP_PANEL) ?? false;

  const vitals = isPanel ? getPanelVitals(obs?.component) : undefined;

  return (
    <>
      <Navbar />
      <main className="container">
        <h1>Get Observation</h1>

        <div className="card" style={{ marginBottom: 16 }}>
          <form onSubmit={onSearch} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label htmlFor="observationId" style={{ marginBottom: 4 }}>Observation ID</label>
            <input
              id="observationId"
              type="text"
              placeholder="e.g. 49326405"
              value={observationId}
              onChange={(e) => setObservationId(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }}
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
            style={{ borderColor: '#f5c2c7', background: '#fff5f6', color: '#842029', marginBottom: 16 }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {obs && (
          <div className="card" style={{ display: 'grid', gap: 12 }}>
            <h2 style={{ marginTop: 0 }}>Observation Summary</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', rowGap: 8 }}>
              <div><strong>Observation.id</strong></div>
              <div>{obs.id || '—'}</div>

              <div><strong>Status</strong></div>
              <div>{obs.status || '—'}</div>

              <div><strong>Category</strong></div>
              <div>{displayCategory(obs.category)}</div>

              <div><strong>Code</strong></div>
              <div>{firstCodingText(obs.code)}</div>

              <div><strong>Subject</strong></div>
              <div>{obs.subject?.display || obs.subject?.reference || '—'}</div>

              <div><strong>Effective</strong></div>
              <div>{displayEffective(obs)}</div>

              <div><strong>Last Updated</strong></div>
              <div>{obs.meta?.lastUpdated || '—'}</div>
            </div>

            {/* Vitals Panel (85353-1) or BP Panel (85354-9) */}
            {isPanel && (
              <div style={{ marginTop: 8 }}>
                <h3 style={{ margin: '8px 0' }}>Vitals</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', rowGap: 8 }}>
                  {/* Blood Pressure */}
                  <div><strong>Systolic (BP)</strong></div>
                  <div>{fmtQty(vitals?.systolic)}</div>

                  <div><strong>Diastolic (BP)</strong></div>
                  <div>{fmtQty(vitals?.diastolic)}</div>

                  {/* Other common vitals */}
                  <div><strong>Heart Rate</strong></div>
                  <div>{fmtQty(vitals?.heartRate)}</div>

                  <div><strong>Temperature</strong></div>
                  <div>{fmtQty(vitals?.temperature)}</div>

                  <div><strong>Height</strong></div>
                  <div>{fmtQty(vitals?.height)}</div>

                  <div><strong>Weight</strong></div>
                  <div>{fmtQty(vitals?.weight)}</div>

                  <div><strong>BMI</strong></div>
                  <div>{fmtQty(vitals?.bmi)}</div>
                </div>
              </div>
            )}

            {/* Single valued observation fallback */}
            {!isPanel && obs.valueQuantity && (
              <div style={{ marginTop: 8 }}>
                <h3 style={{ margin: '8px 0' }}>Value</h3>
                <div>{fmtQty(obs.valueQuantity)}</div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
