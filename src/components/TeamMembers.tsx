import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserCircleIcon } from '@heroicons/react/24/solid';

export const TeamMembers = () => {
  // TODO: チームメンバー情報をFirestoreから取得
  const members = [
    { id: '1', name: 'メンバー1' },
    { id: '2', name: 'メンバー2' },
  ];

  return (
    <div className="flex flex-wrap gap-4">
      {members.map(member => (
        <div
          key={member.id}
          className="flex flex-col items-center space-y-2"
        >
          <UserCircleIcon className="h-12 w-12 text-gray-400" />
          <span className="text-sm">{member.name}</span>
        </div>
      ))}
    </div>
  );
}; 