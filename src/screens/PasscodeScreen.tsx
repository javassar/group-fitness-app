import { useState } from 'react';
import type { DataClient } from '../data/types';
import { setStoredPasscode } from '../lib/storage';

interface PasscodeScreenProps {
  client: DataClient;
  onPasscodeSuccess: (passcode: string) => void;
}

export function PasscodeScreen({ client, onPasscodeSuccess }: PasscodeScreenProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passcode.trim();
    if (!trimmed) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const isValid = await client.checkPasscode(trimmed);
      if (isValid) {
        setStoredPasscode(trimmed);
        onPasscodeSuccess(trimmed);
      } else {
        setError('That passcode is incorrect.');
      }
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="screen-center">
      <div className="screen-card">
        <h1 className="screen-title">Group Fitness</h1>
        <form onSubmit={handleSubmit} className="passcode-form">
          <label htmlFor="group-passcode" className="form-label">
            Group passcode
          </label>
          <input
            id="group-passcode"
            type="password"
            autoComplete="current-password"
            className="text-input"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            disabled={isSubmitting}
            autoFocus
            required
          />

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting || !passcode.trim()}
          >
            {isSubmitting ? 'Checking...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
