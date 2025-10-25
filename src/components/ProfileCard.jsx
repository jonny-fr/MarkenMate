import React from 'react';
import './ProfileCard.css';

const ProfileCard = ({ children, className = '' }) => {
  return (
    <div className={`profile-card ${className}`}>
      {children}
    </div>
  );
};

export default ProfileCard;

