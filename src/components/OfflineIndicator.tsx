import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import './OfflineIndicator.css';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="offline-indicator">
      <div className="offline-content">
        <span className="offline-icon">📡</span>
        <span className="offline-text">Sin conexión a internet</span>
      </div>
    </div>
  );
};

export default OfflineIndicator;
