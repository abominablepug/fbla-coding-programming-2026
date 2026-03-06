import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Body from '../components/body';
import Navbar from '../components/navbar';
import Links from '../components/links';
import Card from '../components/card';

const ResetPassword = () => {
  const AUTH_BASE_URL = (import.meta.env.VITE_AUTH_BASE_URL || import.meta.env.PUBLIC_AUTH_BASE_URL || 'http://localhost:5173').trim();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = (searchParams.get('token') || '').trim();
  const queryUsername = (searchParams.get('username') || '').trim();

  const [resolvedUsername, setResolvedUsername] = useState(queryUsername);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenError, setTokenError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPasswordValid = useMemo(() => {
    if (newPassword.length < 8) return false;
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    return hasLetter && hasNumber;
  }, [newPassword]);

  useEffect(() => {
    if (!token) {
      setTokenError('Missing reset token. Request a new password reset email.');
      setIsValidating(false);
      return;
    }

    let cancelled = false;
    const validateToken = async () => {
      try {
        const response = await fetch(`${AUTH_BASE_URL}/auth/reset_password/${encodeURIComponent(token)}`, {
          credentials: 'include',
        });
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setTokenError(data?.message || 'Invalid or expired reset link.');
          return;
        }
        if (typeof data?.username === 'string' && data.username.trim()) {
          setResolvedUsername(data.username.trim());
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to validate reset token:', error);
        setTokenError('Unable to validate reset link right now.');
      } finally {
        if (!cancelled) {
          setIsValidating(false);
        }
      }
    };

    void validateToken();
    return () => {
      cancelled = true;
    };
  }, [AUTH_BASE_URL, token]);

  return (
    <Body className="flex flex-col items-center justify-center">
      <Navbar page="Reset Password">
        <Links link="/login">Back To Login →</Links>
      </Navbar>

      <Card className="max-w-2xl w-full mt-15 z-10" cardClassName="w-full" title="Reset Password" titleClassName="text-cyan-500">
        {isValidating ? (
          <p className="text-gray-300">Validating reset link...</p>
        ) : tokenError ? (
          <div className="space-y-4">
            <p className="text-red-400 text-sm">{tokenError}</p>
            <button
              onClick={() => navigate('/login')}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
            >
              Return To Login
            </button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitError('');
              setSubmitSuccess('');

              if (!isPasswordValid) {
                setSubmitError('Password must be at least 8 characters and include letters and numbers.');
                return;
              }
              if (newPassword !== confirmPassword) {
                setSubmitError('Passwords do not match.');
                return;
              }

              try {
                setIsSubmitting(true);
                const response = await fetch(`${AUTH_BASE_URL}/auth/reset_password/${encodeURIComponent(token)}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ new_password: newPassword }),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                  setSubmitError(data?.message || 'Failed to reset password.');
                  return;
                }
                setSubmitSuccess('Password reset successfully. Redirecting to login...');
                window.setTimeout(() => navigate('/login'), 1200);
              } catch (error) {
                console.error('Failed to reset password:', error);
                setSubmitError('Failed to reset password.');
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <p className="text-sm text-gray-300">
              {resolvedUsername ? `Reset password for ${resolvedUsername}.` : 'Reset your account password.'}
            </p>
            <div>
              <label className="block text-sm font-medium text-white">New Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              {newPassword && (
                <p className={`mt-1 text-xs ${isPasswordValid ? 'text-green-300' : 'text-red-400'}`}>
                  {isPasswordValid
                    ? 'Strong password'
                    : 'Password must be at least 8 characters and include letters and numbers.'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Confirm New Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3 text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {submitError && <p className="text-sm text-red-400">{submitError}</p>}
            {submitSuccess && <p className="text-sm text-green-300">{submitSuccess}</p>}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-60"
              >
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </Card>
    </Body>
  );
};

export default ResetPassword;
