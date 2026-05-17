import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { User, Lock, Mail, Eye, EyeOff, Shield, Building, ChevronRight } from 'lucide-react';

const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Electronics',
  'Mechanical', 'Civil', 'Mathematics', 'Physics', 'Chemistry',
  'Administration', 'Library'
];

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', department: 'Computer Science' });
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        await register(form);
        toast.success('Welcome to the Campus Portal! 🎉');
      } else {
        await login(form.email, form.password);
        toast.success('Logged in successfully!');
      }
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || (isRegister ? 'Registration failed' : 'Login failed');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'var(--bg-body)',
      gridTemplateColumns: '1fr'
    }}>
      <div className="auth-form-wrapper" style={{ width: '100%', maxWidth: '440px', padding: '1.5rem' }}>
        <div className="auth-form-header" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', background: 'var(--primary-pale)', color: 'var(--primary)', borderRadius: '1rem', marginBottom: '1.25rem', fontSize: '1.75rem' }}>
            🏛️
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>Campus Portal</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sign in to access academic document services</p>
        </div>

        <div className="card" style={{ padding: '2rem 1.75rem', boxShadow: 'var(--shadow-md)', border: 'none' }}>
          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="form-control-icon">
                  <User className="icon" size={16} />
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="form-control-icon">
                <Mail className="icon" size={16} />
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  placeholder="university@edu.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="form-control-icon" style={{ position: 'relative' }}>
                <Lock className="icon" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-control"
                  placeholder={isRegister ? 'Min 6 characters' : 'Your password'}
                  value={form.password}
                  onChange={handleChange}
                  required
                  style={{ paddingRight: '2.8rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <div className="form-control-icon">
                    <Shield className="icon" size={16} />
                    <select name="role" className="form-control" value={form.role} onChange={handleChange}>
                      <option value="student">Student</option>
                      <option value="mentor">Mentor</option>
                      <option value="hod">HOD</option>
                      <option value="administration">Administration</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <div className="form-control-icon">
                    <Building className="icon" size={16} />
                    <select name="department" className="form-control" value={form.department} onChange={handleChange}>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: '1rem', padding: '0.85rem' }}>
              {loading ? (
                <><span className="spinner spinner-sm" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}></span> {isRegister ? 'Creating Account...' : 'Signing In...'}</>
              ) : (
                <>{isRegister ? 'Create Account' : 'Sign In'} <ChevronRight size={18} /></>
              )}
            </button>

            {!isRegister && (
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Quick Demo Login
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {[
                    { email: 'student@college.edu', label: 'Student' },
                    { email: 'mentor@college.edu', label: 'Mentor' },
                    { email: 'hod@college.edu', label: 'HOD' },
                    { email: 'admin@college.edu', label: 'Admin' }
                  ].map(demo => (
                    <button
                      key={demo.label}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={loading}
                      onClick={async () => {
                        setLoading(true);
                        try {
                          await login(demo.email, 'password123');
                          toast.success(`Logged in as ${demo.label}`);
                          navigate('/dashboard');
                        } catch (err) {
                          toast.error(err.response?.data?.message || 'Demo login failed');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                    >
                      {demo.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="auth-switch" style={{ marginTop: '2rem' }}>
          {isRegister ? (
            <>Already have an account? <span onClick={() => setIsRegister(false)} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>Sign in</span></>
          ) : (
            <>Don't have an account? <span onClick={() => setIsRegister(true)} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>Create one</span></>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
