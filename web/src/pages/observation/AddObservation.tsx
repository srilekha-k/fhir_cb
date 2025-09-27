import React from 'react';
import Navbar from '../../components/Navbar';

export default function AddVitalsSingleObservation() {
  const [patientId, setPatientId] = React.useState('');
  const [effectiveLocal, setEffectiveLocal] = React.useState('');

  const [systolic, setSystolic] = React.useState('');
  const [diastolic, setDiastolic] = React.useState('');
  const [heartRate, setHeartRate] = React.useState('');
  const [tempC, setTempC] = React.useState('');
  const [heightCm, setHeightCm] = React.useState('');
  const [weightKg, setWeightKg] = React.useState('');

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successId, setSuccessId] = React.useState<string | null>(null);
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

  function toIsoFromLocal(local: string): string | undefined {
    if (!local) return undefined;
    const d = new Date(local);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  function num(v: string): number | undefined {
    if (v === '' || v == null) return undefined;
    const n = Number(v);
    return isFinite(n) ? n : undefined;
  }

  function calcBmi(hCm: string, wKg: string): number | undefined {
    const h = num(hCm);
    const w = num(wKg);
    if (!h || !w) return undefined;
    const m = h / 100;
    if (m <= 0) return undefined;
    return +(w / (m * m)).toFixed(1);
  }

  function validate(): string | null {
    if (!patientId.trim()) return 'Patient ID is required.';
    const any =
      systolic || diastolic || heartRate || tempC || heightCm || weightKg;
    if (!any) return 'Enter at least one vital.';
    if ((systolic && !diastolic) || (!systolic && diastolic)) {
      return 'Enter both Systolic and Diastolic for Blood Pressure.';
    }
    return null;
  }

  function buildSingleVitalPanel() {
    const effectiveZ = toIsoFromLocal(effectiveLocal);
    const components: any[] = [];

    const sys = num(systolic);
    const dia = num(diastolic);
    const hr = num(heartRate);
    const tC = num(tempC);
    const h = num(heightCm);
    const w = num(weightKg);
    const bmi = calcBmi(heightCm, weightKg);

    
    if (sys != null && dia != null) {
      components.push(
        {
          code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }] },
          valueQuantity: { value: sys, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
        },
        {
          code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }] },
          valueQuantity: { value: dia, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
        }
      );
    }

    if (hr != null) {
      components.push({
        code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
        valueQuantity: { value: hr, unit: 'beats/min', system: 'http://unitsofmeasure.org', code: '/min' },
      });
    }

    if (tC != null) {
      components.push({
        code: { coding: [{ system: 'http://loinc.org', code: '8310-5', display: 'Body temperature' }] },
        valueQuantity: { value: tC, unit: '°C', system: 'http://unitsofmeasure.org', code: 'Cel' },
      });
    }

    if (h != null) {
      components.push({
        code: { coding: [{ system: 'http://loinc.org', code: '8302-2', display: 'Body height' }] },
        valueQuantity: { value: h, unit: 'cm', system: 'http://unitsofmeasure.org', code: 'cm' },
      });
    }

    if (w != null) {
      components.push({
        code: { coding: [{ system: 'http://loinc.org', code: '29463-7', display: 'Body weight' }] },
        valueQuantity: { value: w, unit: 'kg', system: 'http://unitsofmeasure.org', code: 'kg' },
      });
    }

    if (bmi != null) {
      components.push({
        code: { coding: [{ system: 'http://loinc.org', code: '39156-5', display: 'Body mass index (BMI) [ratio]' }] },
        valueQuantity: { value: bmi, unit: 'kg/m²', system: 'http://unitsofmeasure.org', code: 'kg/m2' },
      });
    }

    return {
      resourceType: 'Observation',
      status: 'final',
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
      code: {
        coding: [
          { system: 'http://loinc.org', code: '85353-1', display: 'Observation' },
        ],
        text: 'Vital Signs Panel',
      },
      subject: { reference: `Patient/${patientId.trim()}` },
      effectiveDateTime: effectiveZ,
      component: components,
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessId(null);
    setCopied(false);

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    const resource = buildSingleVitalPanel();

    try {
      setLoading(true);
      const res = await fetch('https://hapi.fhir.org/baseR4/Observation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json',
          Accept: 'application/fhir+json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(resource),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.resourceType === 'OperationOutcome') {
        const diag =
          data?.issue?.map((i: any) => i?.diagnostics || `${i?.severity} ${i?.code}`).join(' | ') ||
          `HTTP ${res.status}`;
        throw new Error(diag);
      }

      setSuccessId(data?.id || '(id not returned)');
    } catch (err: any) {
      setError(err?.message || 'Failed to create vital signs observation.');
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
    } catch {}
  }

  const bmiPreview = calcBmi(heightCm, weightKg);

  return (
    <>
      <Navbar />
      <main className="container">
        <h1>Add Observation</h1>

        <div className="card" style={{ marginBottom: 16 }}>
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label>
              Patient ID
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #ccc', fontSize: '1rem' }}
              />
            </label>

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
                  <strong>Calculated BMI:</strong> {bmiPreview ?? '—'}
                </div>
              </div>
            </fieldset>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" style={btnStyle} disabled={loading}>
                {loading ? 'Submitting…' : 'Submit'}
              </button>
              <button
                type="button"
                style={{ ...btnStyle, background: '#888' }}
                onClick={() => {
                  setSystolic(''); setDiastolic(''); setHeartRate(''); setTempC(''); setHeightCm(''); setWeightKg('');
                  setError(null); setSuccessId(null); setCopied(false);
                }}
              >
                Clear Values
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
            <strong>Vital Signs panel created!</strong>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>Observation ID:</span>
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
