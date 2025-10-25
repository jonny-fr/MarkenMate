'use client';

import React from 'react';
import './ProfileCard.css';

interface ProfileCardProps {
  children: React.ReactNode;
  className?: string;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`profile-card ${className}`}>
      {children}
    </div>
  );
};

export default ProfileCard;

