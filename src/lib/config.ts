export const CONFIG = {
  TRUCK_WIDTH_M: parseFloat(process.env.TRUCK_WIDTH_M || '2.0'),
  TRUCK_HEIGHT_M: parseFloat(process.env.TRUCK_HEIGHT_M || '2.6'),
  DIRECT_LDM: parseFloat(process.env.DIRECT_LDM || '3.0'),
  FTL_LDM: parseFloat(process.env.FTL_LDM || '13.6'),
  DIRECT_VOL_M3: parseFloat(process.env.DIRECT_VOL_M3 || '15.6'),
  FTL_VOL_M3: parseFloat(process.env.FTL_VOL_M3 || '70.72'),
  CUTOFF_TIME_LOCAL: process.env.CUTOFF_TIME_LOCAL || '11:30',
  TIMEZONE: process.env.TIMEZONE || 'Europe/Amsterdam',
  GROUPAGE_LDM_MAX: parseFloat(process.env.GROUPAGE_LDM_MAX || '3.0'),
  HUB_CODE: process.env.HUB_CODE || 'HUB',
};
