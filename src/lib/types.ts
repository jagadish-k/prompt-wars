export interface GeoPoint { lat: number; lng: number; city?: string }

export interface WeatherAlert { event: string; severity: 'minor' | 'moderate' | 'severe' | 'extreme'; description: string; starts?: string; expires?: string }
export interface WeatherData { location: string; alerts: WeatherAlert[]; rainfallMm: number; forecast: string }

export type DwellingType = 'ground_floor' | 'high_rise' | 'independent_house'
export interface UserProfile { id: string; email: string; preferredLanguage: string; householdSize: number; dwellingType: DwellingType | null }
export interface MonitoredLocation { id: string; locationName: string; lat: number; lng: number; isPrimary: boolean }
export interface Vulnerability { id: string; type: string }

export interface PlanChecklistItem { id: string; label: string; done: boolean }
export interface LocationPlan { locationName: string; summary: string; immediate: PlanChecklistItem[]; supplies: PlanChecklistItem[]; evacuation: string }
export interface PreparednessPlan { overview: string; locations: LocationPlan[]; updatedAt: string }
