import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { post, get } from '../utils/api';
import { toast } from '../components/Toast';

function validate(email: string, password: string) {
  const errors: Record<string,string> = {};
  if (!email) errors.email = 'Email is required';
  else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email';
  if (!password) errors.password = 'Password is required';
  else if (password.length < 6) errors.password = 'Min 6 characters';
  return errors;
}

export default function Login() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string,string>>({});
  const [busy, setBusy] = React.useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(email, password);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    const res = await post('/api/auth/login', { email, password });
    setBusy(false);

    if (res.ok && (res as any).data?.token) {
      const token = (res as any).data.token as string;
      localStorage.setItem('token', token);
      toast('Logged in!', 'success');
      try {
        await get('/api/auth/me', token); 
      } catch {}
      navigate('/home');
    } else {
      toast((res as any).data?.error || 'Login failed', 'error');
    }
  }

  return (
    <div className="card">
      <h1>Log in</h1>
      <p className="muted">Don’t have an account? <Link to="/register" className="link">Register</Link></p>
      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="email">Email</label>
        <input id="email" value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@example.com" />
        {errors.email && <div className="err">{errors.email}</div>}

        <label htmlFor="password">Password</label>
        <input id="password" value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="••••••••" />
        {errors.password && <div className="err">{errors.password}</div>}

        <button disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
    </div>
  );
}
