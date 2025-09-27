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
  component?: ObservationComponent[];
  valueQuantity?: Quantity; // for non-panel observations
};

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

const btnStyle: React.CSSProperties = {
  padding: '10px 18px',
  fontWeight: 600,
  borderRadius: 6,
  border: 'none',
  background: '#2c3e50',
  color: '#fff',
  cursor: 'pointer',
};

function findComponent(components: ObservationComponent[] | undefined, code: string): ObservationComponent | undefined {
  return components?.find(c => c.code?.coding?.some(cd => (cd.system?.includes('loinc') || cd.system === 'http://loinc.org') && cd.code === code));
}

function getNumberFromQty(c?: ObservationComponent): string {
  const v = c?.valueQuantity?.value;
  return (v === 0 || v) ? String(v) : '';
}

function toLocalFromIso(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toIsoFromLocal(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}
function num(s: string): number | undefined {
  if (s === '' || s == null) return undefined;
  const n = Number(s);
  return isFinite(n) ? n : undefined;
}
function calcBmi(heightCm: string, weightKg: string): number | undefined {
  const h = num(heightCm);
  const w = num(weightKg);
  if (!h || !w) return undefined;
  const m = h / 100;
  if (m <= 0) return undefined;
  return +(w / (m * m)).toFixed(1);
}

export default function ModifyObservation() {
  // Step 1: Load Observation by ID
  const [observationId, setObservationId] = React.useState('');
  const [loadingLoad, setLoadingLoad] = React.useState(false);
  const [loadedObs, setLoadedObs] = React.useState<FhirObservation | null>(null);

  // Editable fields (panel components)
  const [effectiveLocal, setEffectiveLocal] = React.useState('');
  const [systolic, setSystolic] = React.useState('');
  const [diastolic, setDiastolic] = React.useState('');
  const [heartRate, setHeartRate] = React.useState('');
  const [tempC, setTempC] = React.useState('');
  const [heightCm, setHeightCm] = React.useState('');
  const [weightKg, setWeightKg] = React.useState('');

  // UI state
  const [loadingSave, setLoadingSave] = React.useState(false);
  const [successId, setSuccessId] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Confirm modal
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [previewBody, setPreviewBody] = React.useState<FhirObservation | null>(null);

  function resetFields() {
    setEffectiveLocal('');
    setSystolic(''); setDiastolic('');
    setHeartRate(''); setTempC('');
    setHeightCm(''); setWeightKg('');
  }

  function onClearAll() {
    setObservationId('');
    setLoadedObs(null);
    resetFields();
    setError(null);
    setSuccessId(null);
  }

  async function onLoad(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessId(null);
    setCopied(false);
    setLoadedObs(null);
    resetFields();

    const id = observationId.trim();
    if (!id) {
      setError('Please enter an Observation ID.');
      return;
    }

    try {
      setLoadingLoad(true);
      const res = await fetch(`https://hapi.fhir.org/baseR4/Observation/${encodeURIComponent(id)}`, {
        headers: { Accept: 'application/fhir+json, application/json;q=0.9' },
      });
      const data = await res.json();

      if (!res.ok || data?.resourceType !== 'Observation') {
        const diag =
          data?.issue?.map((i: any) => i?.diagnostics || `${i?.severity} ${i?.code}`).join(' | ') ||
          `HTTP ${res.status}`;
        throw new Error(diag);
      }

      const obs = data as FhirObservation;
      setLoadedObs(obs);

      // Prefill form (expecting a panel 85353-1 or 85354-9)
      setEffectiveLocal(toLocalFromIso(obs.effectiveDateTime));

      const sysC = findComponent(obs.component, LOINC.SYSTOLIC);
      const diaC = findComponent(obs.component, LOINC.DIASTOLIC);
      const hrC  = findComponent(obs.component, LOINC.HEART_RATE);
      const tC   = findComponent(obs.component, LOINC.TEMP_C);
      const hC   = findComponent(obs.component, LOINC.HEIGHT_CM);
      const wC   = findComponent(obs.component, LOINC.WEIGHT_KG);

      setSystolic(getNumberFromQty(sysC));
      setDiastolic(getNumberFromQty(diaC));
      setHeartRate(getNumberFromQty(hrC));
      setTempC(getNumberFromQty(tC));
      setHeightCm(getNumberFromQty(hC));
      setWeightKg(getNumberFromQty(wC));
    } catch (err: any) {
      setError(err?.message || 'Failed to load observation.');
    } finally {
      setLoadingLoad(false);
    }
  }

  // Build updated Observation (PUT replaces the resource)
  function buildUpdatedResource(): FhirObservation {
    const isPanel = loadedObs?.code?.coding?.some(c => c?.code === LOINC.VITALS_PANEL || c?.code === LOINC.BP_PANEL);

    // keep same subject; default to vital-signs category
    const subjectRef = loadedObs?.subject || undefined;
    const status = loadedObs?.status || 'final';

    // Components: include only fields with values
    const comps: ObservationComponent[] = [];

    const sys = num(systolic);
    const dia = num(diastolic);
    const hr  = num(heartRate);
    const t   = num(tempC);
    const h   = num(heightCm);
    const w   = num(weightKg);
    const bmi = calcBmi(heightCm, weightKg);

    if (sys != null && dia != null) {
      comps.push(
        {
          code: { coding: [{ system: 'http://loinc.org', code: LOINC.SYSTOLIC, display: 'Systolic blood pressure' }] },
          valueQuantity: { value: sys, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
        },
        {
          code: { coding: [{ system: 'http://loinc.org', code: LOINC.DIASTOLIC, display: 'Diastolic blood pressure' }] },
          valueQuantity: { value: dia, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
        }
      );
    }

    if (hr != null) {
      comps.push({
        code: { coding: [{ system: 'http://loinc.org', code: LOINC.HEART_RATE, display: 'Heart rate' }] },
        valueQuantity: { value: hr, unit: 'beats/min', system: 'http://unitsofmeasure.org', code: '/min' },
      });
    }

    if (t != null) {
      comps.push({
        code: { coding: [{ system: 'http://loinc.org', code: LOINC.TEMP_C, display: 'Body temperature' }] },
        valueQuantity: { value: t, unit: '°C', system: 'http://unitsofmeasure.org', code: 'Cel' },
      });
    }

    if (h != null) {
      comps.push({
        code: { coding: [{ system: 'http://loinc.org', code: LOINC.HEIGHT_CM, display: 'Body height' }] },
        valueQuantity: { value: h, unit: 'cm', system: 'http://unitsofmeasure.org', code: 'cm' },
      });
    }

    if (w != null) {
      comps.push({
        code: { coding: [{ system: 'http://loinc.org', code: LOINC.WEIGHT_KG, display: 'Body weight' }] },
        valueQuantity: { value: w, unit: 'kg', system: 'http://unitsofmeasure.org', code: 'kg' },
      });
    }

    if (bmi != null) {
      comps.push({
        code: { coding: [{ system: 'http://loinc.org', code: LOINC.BMI, display: 'Body mass index (BMI) [ratio]' }] },
        valueQuantity: { value: bmi, unit: 'kg/m²', system: 'http://unitsofmeasure.org', code: 'kg/m2' },
      });
    }

    const effectiveZ = toIsoFromLocal(effectiveLocal);

    // Use vitals panel code if original is a panel; else preserve original code
    const code: CodeableConcept | undefined =
      isPanel
        ? {
            coding: [
              { system: 'http://loinc.org', code: LOINC.VITALS_PANEL, display: 'Vital signs, weight, height, head circumference, oxygen saturation and BMI panel' },
            ],
            text: 'Vital Signs Panel',
          }
        : loadedObs?.code;

    return {
      resourceType: 'Observation',
      id: observationId.trim(),
      status,
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'vital-signs',
              display: 'Vital Signs',
            },
          ],
        },
      ],
      code,
      subject: subjectRef,
      effectiveDateTime: effectiveZ,
      ...(comps.length ? { component: comps } : {}), // if empty -> no components
    };
  }

  // Step 1 for update: preview
  function onAskConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessId(null);
    setCopied(false);

    const id = observationId.trim();
    if (!id) {
      setError('Please enter an Observation ID.');
      return;
    }
    if (!loadedObs) {
      setError('Load the observation first, then update.');
      return;
    }

    const body = buildUpdatedResource();
    setPreviewBody(body);
    setShowConfirm(true);
  }

  // Step 2: PUT update
  async function doUpdate() {
    if (!previewBody) return;
    const id = observationId.trim();

    try {
      setLoadingSave(true);
      const res = await fetch(`https://hapi.fhir.org/baseR4/Observation/${encodeURIComponent(id)}`, {
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
        // ignore empty body
      }

      if (!res.ok || data?.resourceType === 'OperationOutcome') {
        const diag =
          data?.issue?.map((i: any) => i?.diagnostics || `${i?.severity} ${i?.code}`).join(' | ') ||
          `HTTP ${res.status}`;
        throw new Error(diag);
      }

      const returnedId =
        data?.id ||
        (locationHeader?.match(/\/Observation\/([^\/]+)/i)?.[1]) ||
        id;

      setSuccessId(returnedId);
      // refresh baseline (use response if present; otherwise our preview)
      setLoadedObs(data?.resourceType === 'Observation' ? (data as FhirObservation) : previewBody);
    } catch (err: any) {
      setError(err?.message || 'Failed to update observation.');
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
    } catch {}
  }

  const bmiPreview = calcBmi(heightCm, weightKg);

  return (
    <>
      <Navbar />
      <main className="container">
        <h1>Modify Observation (Vitals Panel)</h1>

        {/* Step 1: Load by Observation ID */}
        <div className="card" style={{ marginBottom: 16 }}>
          <form onSubmit={onLoad} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label htmlFor="observationId">Observation ID</label>
            <input
              id="observationId"
              type="text"
              placeholder="e.g. 49326405"
              value={observationId}
              onChange={(e) => setObservationId(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }}
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

        {/* Step 2: Edit (visible after load) */}
        {loadedObs && (
          <div className="card" style={{ marginBottom: 16 }}>
            <form onSubmit={onAskConfirm} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label>
                Effective Date/Time
                <input
                  type="datetime-local"
                  value={effectiveLocal}
                  onChange={(e) => setEffectiveLocal(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }}
                />
              </label>

              <fieldset style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                <legend style={{ padding: '0 6px' }}>Blood Pressure</legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label>
                    Systolic
                    <input
                      type="number"
                      inputMode="decimal"
                      value={systolic}
                      onChange={(e) => setSystolic(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc' }}
                    />
                  </label>
                  <label>
                    Diastolic
                    <input
                      type="number"
                      inputMode="decimal"
                      value={diastolic}
                      onChange={(e) => setDiastolic(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc' }}
                    />
                  </label>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                  Leave both empty to remove BP from the panel. Entering one requires the other.
                </div>
              </fieldset>

              <fieldset style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                <legend style={{ padding: '0 6px' }}>Other Vitals</legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label>
                    Heart Rate
                    <input
                      type="number"
                      inputMode="decimal"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc' }}
                    />
                  </label>
                  <label>
                    Temperature (°C)
                    <input
                      type="number"
                      inputMode="decimal"
                      value={tempC}
                      onChange={(e) => setTempC(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc' }}
                    />
                  </label>
                  <label>
                    Height (cm)
                    <input
                      type="number"
                      inputMode="decimal"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc' }}
                    />
                  </label>
                  <label>
                    Weight (kg)
                    <input
                      type="number"
                      inputMode="decimal"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc' }}
                    />
                  </label>
                  <div style={{ gridColumn: '1 / span 2', marginTop: 4 }}>
                    <strong>Calculated BMI:</strong> {calcBmi(heightCm, weightKg) ?? '—'}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                  BMI is auto-calculated from Height & Weight if both are provided.
                </div>
              </fieldset>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" style={btnStyle} disabled={loadingSave}>
                  {loadingSave ? 'Updating…' : 'Update Observation'}
                </button>
                <button type="button" style={{ ...btnStyle, background: '#888' }} onClick={resetFields}>
                  Reset Fields
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="card" style={{ borderColor: '#f5c2c7', background: '#fff5f6', color: '#842029', marginBottom: 16, whiteSpace: 'pre-wrap' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Success */}
        {successId && (
          <div className="card" style={{ borderColor: '#badbcc', background: '#f6fffa', color: '#0f5132', marginBottom: 16 }}>
            <strong>Observation updated!</strong>
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
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}
            onClick={() => setShowConfirm(false)}
          >
            <div className="card" style={{ maxWidth: 700, width: '100%', background: '#fff', padding: 20, borderRadius: 8 }} onClick={(e) => e.stopPropagation()}>
              <h2 id="confirm-title" style={{ marginTop: 0 }}>Confirm Update</h2>
              <p>You are about to replace this Observation with the values below.</p>

              <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 6, padding: 12, marginBottom: 16 }}>
                <div><strong>ID:</strong> {previewBody.id}</div>
                <div><strong>Code:</strong> {previewBody.code?.coding?.[0]?.display || previewBody.code?.coding?.[0]?.code || '—'}</div>
                <div><strong>Effective:</strong> {previewBody.effectiveDateTime || '—'}</div>
                <div style={{ marginTop: 8 }}><strong>Components to send:</strong></div>
                <ul style={{ marginTop: 6 }}>
                  {(previewBody.component || []).map((c, i) => (
                    <li key={i}>
                      {(c.code?.coding?.[0]?.display || c.code?.coding?.[0]?.code) ?? '—'}: {c.valueQuantity?.value} {c.valueQuantity?.unit}
                    </li>
                  ))}
                  {!previewBody.component?.length && <li>— none —</li>}
                </ul>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowConfirm(false); setPreviewBody(null); }} style={{ ...btnStyle, background: '#888' }}>
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
