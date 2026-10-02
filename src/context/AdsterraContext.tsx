import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AdsterraConfig, AdsterraPlacements } from '../types';
import { safeFetch, getAuthHeaders } from '../utils/api';
import { useAuth } from './AuthContext';

interface AdsterraContextType {
  config: AdsterraConfig | null;
  isLoading: boolean;
  isAdsterraModalOpen: boolean;
  setIsAdsterraModalOpen: (open: boolean) => void;
  updateConfig: (partial: Partial<AdsterraConfig>) => Promise<boolean>;
  trackEvent: (type: 'impression' | 'click', zoneKey?: string, placementId?: string) => Promise<void>;
  importCsv: (csvText: string) => Promise<boolean>;
  resetDemo: () => Promise<boolean>;
  refreshConfig: () => Promise<void>;
  shouldShowAds: (placement?: keyof AdsterraPlacements) => boolean;
}

const AdsterraContext = createContext<AdsterraContextType | undefined>(undefined);

export const AdsterraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [config, setConfig] = useState<AdsterraConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdsterraModalOpen, setIsAdsterraModalOpen] = useState<boolean>(false);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await safeFetch('/api/adsterra/config');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config) {
          setConfig(data.config);
        }
      }
    } catch (err) {
      console.warn('Could not fetch Adsterra config:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = async (partial: Partial<AdsterraConfig>): Promise<boolean> => {
    try {
      const res = await safeFetch('/api/adsterra/config', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(token),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(partial)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config) {
          setConfig(data.config);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Failed to update Adsterra configuration:', err);
      return false;
    }
  };

  const trackEvent = async (type: 'impression' | 'click', zoneKey?: string, placementId?: string): Promise<void> => {
    try {
      // Optimistic update
      if (config) {
        setConfig(prev => {
          if (!prev) return prev;
          const newImp = type === 'impression' ? prev.stats.impressions + 1 : prev.stats.impressions;
          const newClicks = type === 'click' ? prev.stats.clicks + 1 : prev.stats.clicks;
          const addRev = type === 'impression' ? 0.0012 : 0.28;

          let updatedSmartlinks = prev.smartlinks;
          if (type === 'click' && placementId && Array.isArray(prev.smartlinks)) {
            updatedSmartlinks = prev.smartlinks.map(s =>
              s.placementId === placementId ? { ...s, clicks: (s.clicks || 0) + 1 } : s
            );
          }

          return {
            ...prev,
            smartlinks: updatedSmartlinks,
            stats: {
              ...prev.stats,
              impressions: newImp,
              clicks: newClicks,
              estimatedRevenueSar: Number((prev.stats.estimatedRevenueSar + addRev).toFixed(4)),
              lastUpdated: new Date().toISOString()
            }
          };
        });
      }

      await safeFetch('/api/adsterra/track-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, zoneKey, placementId })
      });
    } catch (err) {
      // Silent fail for telemetry
    }
  };

  const importCsv = async (csvText: string): Promise<boolean> => {
    try {
      const res = await safeFetch('/api/adsterra/import-csv', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(token),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ csvText })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config) {
          setConfig(data.config);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Failed to import CSV:', err);
      return false;
    }
  };

  const resetDemo = async (): Promise<boolean> => {
    try {
      const res = await safeFetch('/api/adsterra/reset-demo', {
        method: 'POST',
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config) {
          setConfig(data.config);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Failed to reset demo:', err);
      return false;
    }
  };

  const shouldShowAds = (placement?: keyof AdsterraPlacements): boolean => {
    if (!config || !config.enabled) return false;
    if (placement && config.placements && config.placements[placement] === false) {
      return false;
    }
    return true;
  };

  return (
    <AdsterraContext.Provider
      value={{
        config,
        isLoading,
        isAdsterraModalOpen,
        setIsAdsterraModalOpen,
        updateConfig,
        trackEvent,
        importCsv,
        resetDemo,
        refreshConfig: fetchConfig,
        shouldShowAds
      }}
    >
      {children}
    </AdsterraContext.Provider>
  );
};

export const useAdsterra = () => {
  const context = useContext(AdsterraContext);
  if (!context) {
    throw new Error('useAdsterra must be used within an AdsterraProvider');
  }
  return context;
};
