import { getDb, saveDatabase } from './db';
import { AdsterraConfig, AdsterraSmartlink } from '../src/types';

export const DEFAULT_SMARTLINKS: AdsterraSmartlink[] = [
  {
    zoneName: 'smart-link-3407564',
    placementName: 'Smartlink_1',
    placementId: '30540142',
    url: 'https://www.profitableratecpmnetwork.com/j7wgqh59f?key=69444c91d5d13033ecdff540cfe3d66f',
    active: true,
    clicks: 42,
    assignedPlacement: 'dashboardTop'
  },
  {
    zoneName: 'smart-link-3407564',
    placementName: 'Smartlink_2',
    placementId: '30540365',
    url: 'https://www.profitableratecpmnetwork.com/cbqpesmwq?key=a69fa71068bccbf3e31f6fe09fe45462',
    active: true,
    clicks: 29,
    assignedPlacement: 'dashboardSidebar'
  },
  {
    zoneName: 'smart-link-3407564',
    placementName: 'Smartlink_3',
    placementId: '30657127',
    url: 'https://www.profitableratecpmnetwork.com/bypi27ikj?key=ec6a4a8f69cba510c8d38b835c8b0378',
    active: true,
    clicks: 24,
    assignedPlacement: 'socialBar'
  },
  {
    zoneName: 'smart-link-3407564',
    placementName: 'Smartlink_4',
    placementId: '31301807',
    url: 'https://www.profitableratecpmnetwork.com/ax4a4j35x?key=dec77029f348fef5b611a8b6c042eeeb',
    active: true,
    clicks: 17,
    assignedPlacement: 'reportsTop'
  }
];

export const DEFAULT_ADSTERRA_CONFIG: AdsterraConfig = {
  enabled: true,
  publisherId: 'ADST-849102',
  zoneName: 'smart-link-3407564',
  admobAppId: 'ca-app-pub-1036802722878553~9890117209',
  admobPublisherId: 'pub-1036802722878553',
  admobAdUnitId: 'ca-app-pub-1036802722878553/8632875853',
  banner728x90ZoneKey: 'adst_728x90_khyber_leaderboard',
  banner300x250ZoneKey: 'adst_300x250_khyber_rectangle',
  banner468x60ZoneKey: 'adst_468x60_khyber_mobile',
  socialBarScriptUrl: '//pl25091823.topcreativeformat.com/5a/92/bc/5a92bc12984a9e88b2010928c0.js',
  popunderScriptUrl: '',
  directLinkUrl: 'https://www.profitableratecpmnetwork.com/j7wgqh59f?key=69444c91d5d13033ecdff540cfe3d66f',
  smartlinks: DEFAULT_SMARTLINKS,
  smartlinkRotation: 'placement-mapped',
  hideForPaidTiers: true,
  testMode: true,
  placements: {
    dashboardTop: true,
    dashboardSidebar: true,
    reportsTop: true,
    fleetMapBanner: false,
    socialBar: true
  },
  stats: {
    impressions: 1845,
    clicks: 112,
    estimatedRevenueSar: 318.75,
    lastUpdated: new Date().toISOString()
  }
};

export function getAdsterraConfig(): AdsterraConfig {
  const db = getDb();
  if (!db.adsterraConfig) {
    db.adsterraConfig = { ...DEFAULT_ADSTERRA_CONFIG };
    saveDatabase();
  } else {
    // Ensure smartlinks and zoneName are populated if missing or outdated
    let modified = false;
    if (!db.adsterraConfig.zoneName) {
      db.adsterraConfig.zoneName = 'smart-link-3407564';
      modified = true;
    }
    if (!db.adsterraConfig.smartlinks || !Array.isArray(db.adsterraConfig.smartlinks) || db.adsterraConfig.smartlinks.length === 0) {
      db.adsterraConfig.smartlinks = [...DEFAULT_SMARTLINKS];
      modified = true;
    }
    if (!db.adsterraConfig.smartlinkRotation) {
      db.adsterraConfig.smartlinkRotation = 'placement-mapped';
      modified = true;
    }
    if (db.adsterraConfig.directLinkUrl?.includes('highperformancegate.com')) {
      db.adsterraConfig.directLinkUrl = 'https://www.profitableratecpmnetwork.com/j7wgqh59f?key=69444c91d5d13033ecdff540cfe3d66f';
      modified = true;
    }
    if (!db.adsterraConfig.admobAppId) {
      db.adsterraConfig.admobAppId = 'ca-app-pub-1036802722878553~9890117209';
      modified = true;
    }
    if (!db.adsterraConfig.admobPublisherId) {
      db.adsterraConfig.admobPublisherId = 'pub-1036802722878553';
      modified = true;
    }
    if (!db.adsterraConfig.admobAdUnitId) {
      db.adsterraConfig.admobAdUnitId = 'ca-app-pub-1036802722878553/8632875853';
      modified = true;
    }
    if (modified) {
      saveDatabase();
    }
  }
  return db.adsterraConfig;
}

export function updateAdsterraConfig(partial: Partial<AdsterraConfig>): AdsterraConfig {
  const db = getDb();
  const current = getAdsterraConfig();

  const updated: AdsterraConfig = {
    ...current,
    ...partial,
    smartlinks: partial.smartlinks !== undefined ? partial.smartlinks : current.smartlinks,
    placements: {
      ...current.placements,
      ...(partial.placements || {})
    },
    stats: {
      ...current.stats,
      ...(partial.stats || {}),
      lastUpdated: new Date().toISOString()
    }
  };

  db.adsterraConfig = updated;
  saveDatabase();
  return updated;
}

export function recordAdsterraEvent(
  type: 'impression' | 'click',
  zoneKey?: string,
  placementId?: string
): AdsterraConfig['stats'] {
  const db = getDb();
  const current = getAdsterraConfig();

  if (type === 'impression') {
    current.stats.impressions += 1;
    // Estimated CPM ~ 0.50 SAR to 1.20 SAR per 1000 impressions
    current.stats.estimatedRevenueSar = Number((current.stats.estimatedRevenueSar + 0.0012).toFixed(4));
  } else if (type === 'click') {
    current.stats.clicks += 1;
    // Estimated CPC ~ 0.25 SAR to 0.35 SAR per click
    current.stats.estimatedRevenueSar = Number((current.stats.estimatedRevenueSar + 0.28).toFixed(4));

    // Update specific smartlink click counter if placementId provided
    if (placementId && Array.isArray(current.smartlinks)) {
      const target = current.smartlinks.find(s => s.placementId === placementId);
      if (target) {
        target.clicks = (target.clicks || 0) + 1;
      }
    }
  }

  current.stats.lastUpdated = new Date().toISOString();
  db.adsterraConfig = current;
  saveDatabase();
  return current.stats;
}

export function resetAdsterraDemoConfig(): AdsterraConfig {
  const db = getDb();
  db.adsterraConfig = {
    ...DEFAULT_ADSTERRA_CONFIG,
    smartlinks: DEFAULT_SMARTLINKS.map(s => ({ ...s, clicks: 0 })),
    stats: {
      impressions: 0,
      clicks: 0,
      estimatedRevenueSar: 0,
      lastUpdated: new Date().toISOString()
    }
  };
  saveDatabase();
  return db.adsterraConfig;
}
