import type { Member } from '../data/types';
import { setStoredMemberId } from '../lib/storage';

interface NamePickerScreenProps {
  members: Member[];
  onSelectMember: (memberId: string) => void;
}

export function NamePickerScreen({ members, onSelectMember }: NamePickerScreenProps) {
  const handlePick = (memberId: string) => {
    setStoredMemberId(memberId);
    onSelectMember(memberId);
  };

  return (
    <div className="screen-center">
      <div className="screen-card">
        <h1 className="screen-title">Who are you?</h1>
        <div className="name-picker-list" role="list">
          {members.map((member) => (
            <button
              key={member.id}
              type="button"
              className="btn-name-choice"
              onClick={() => handlePick(member.id)}
            >
              {member.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
