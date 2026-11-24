import type {
  ActionPlanResponse,
  AirQualityReport,
  ChatResponse,
  ChatTurn,
  CityLocation,
  HouseholdProfile,
  ImpactSimulationResult,
} from '../../shared/types.js';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.message ?? `Request failed (${response.status})`);
  }

  return payload as T;
}

export interface HealthStatus {
  status: string;
  aiMode: 'gemini-genai' | 'local-intelligence';
}

export function fetchHealth(): Promise<HealthStatus> {
  return requestJson<HealthStatus>('/api/health');
}

export function searchCitiesApi(query: string, signal?: AbortSignal): Promise<{ cities: CityLocation[] }> {
  const params = new URLSearchParams({ q: query });
  return requestJson<{ cities: CityLocation[] }>(`/api/cities/search?${params.toString()}`, {
    signal,
  });
}

export function fetchAirQualityApi(location: CityLocation): Promise<AirQualityReport> {
  const params = new URLSearchParams({
    lat: String(location.latitude),
    lon: String(location.longitude),
    name: location.name,
    country: location.country,
  });
  return requestJson<AirQualityReport>(`/api/air-quality?${params.toString()}`);
}

export function generateActionPlanApi(params: {
  location: CityLocation;
  profile: HouseholdProfile;
  focusNote?: string;
}): Promise<ActionPlanResponse> {
  return requestJson<ActionPlanResponse>('/api/advisor/plan', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function sendAdvisorChatApi(params: {
  location: CityLocation;
  profile: HouseholdProfile;
  message: string;
  history: ChatTurn[];
}): Promise<ChatResponse> {
  return requestJson<ChatResponse>('/api/advisor/chat', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function simulateImpactApi(params: {
  selectedActionIds: string[];
  baselinePm25: number;
  householdSize: number;
  communityHouseholds: number;
}): Promise<ImpactSimulationResult> {
  return requestJson<ImpactSimulationResult>('/api/impact/simulate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
