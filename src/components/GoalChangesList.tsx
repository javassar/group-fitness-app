import { useState } from 'react';
import type { GoalChange } from '../data/types';
import { describeGoalShort } from '../lib/goals';

interface GoalChangesListProps {
  changes: GoalChange[];
}

export function GoalChangesList({ changes }: GoalChangesListProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (changes.length === 0) {
    return null;
  }

  const formatChangeDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <section className="goal-changes-section" aria-label="Goal changes history">
      <div className="goal-changes-header">
        <h2 className="goal-changes-title">Goal changes</h2>
        <button
          type="button"
          className="btn-text-link goal-changes-toggle"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
        >
          {isOpen ? 'Hide' : 'Show'}
        </button>
      </div>

      {isOpen && (
        <ul className="goal-changes-list">
          {changes.map((c, index) => (
            <li
              key={`${c.memberId}-${c.changedAt}-${index}`}
              className="goal-change-item"
            >
              <span className="goal-change-name">{c.memberName}</span> changed their
              goal from{' '}
              <span className="goal-change-val">{describeGoalShort(c.oldGoal)}</span>{' '}
              to{' '}
              <span className="goal-change-val">{describeGoalShort(c.newGoal)}</span>{' '}
              on {formatChangeDate(c.changedAt)}.
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
