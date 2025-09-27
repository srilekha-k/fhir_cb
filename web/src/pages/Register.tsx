import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { post } from '../utils/api';
import { toast } from '../components/Toast';

export default function Register() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await post('/api/auth/register', { email, password });
    setBusy(false);
    if ((res as any).ok) {
      toast('Registered! Please log in.', 'success');
      navigate('/');
    } else {
      toast((res as any).data?.error || 'Registration failed', 'error');
    }
  }

  return (
    <div className="card">
      <h1>Register</h1>
      <p className="muted">Already have an account? <Link to="/" className="link">Log in</Link></p>
      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="reg-email">Email</label>
        <input id="reg-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />

        <label htmlFor="reg-password">Password</label>
        <input id="reg-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" />

        <button disabled={busy}>{busy ? 'Creating…' : 'Register'}</button>
      </form>
    </div>
  );
}
