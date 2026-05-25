export type RequestType =
  | 'permit'
  | 'code_violation'
  | 'park_issue'
  | 'general'
  | 'pothole'
  | 'inspection'
  | 'complaint';

export type RequestStatus = 'new' | 'in_progress' | 'resolved' | 'closed';

export type DataSource = 'all' | 'demo' | 'real';

export type GisFilters = {
  types: RequestType[];
  statuses: RequestStatus[];
  neighborhood: string | null;
  from?: string;
  to?: string;
  source?: DataSource;
};

export type RequestProperties = {
  id: string;
  case_code: string;
  title: string;
  request_type: RequestType;
  status: RequestStatus;
  priority: string;
  neighborhood_slug: string | null;
  address_line: string | null;
  created_at: string;
  resident_name: string | null;
};

export type RequestFeature = {
  type: 'Feature';
  id: string;
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: RequestProperties;
};

export type RequestFeatureCollection = {
  type: 'FeatureCollection';
  features: RequestFeature[];
};

export type CitizenPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  neighborhood_slug: string | null;
};

export type NeighborhoodStatRow = {
  slug: string;
  name: string;
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
};

export type NeighborhoodStats = {
  neighborhoods: NeighborhoodStatRow[];
  overall: { total: number; pending: number; in_progress: number; completed: number };
  other: { total: number; pending: number; in_progress: number; completed: number };
};

export const REQUEST_TYPES: RequestType[] = [
  'permit',
  'code_violation',
  'park_issue',
  'general',
  'pothole',
  'inspection',
  'complaint'
];

export const REQUEST_STATUSES: RequestStatus[] = ['new', 'in_progress', 'resolved', 'closed'];

export const STATUS_COLOR: Record<RequestStatus, string> = {
  new: '#ef4444',
  in_progress: '#f59e0b',
  resolved: '#22c55e',
  closed: '#22c55e'
};

export const STATUS_LABEL: Record<RequestStatus, string> = {
  new: 'Pending',
  in_progress: 'In progress',
  resolved: 'Completed',
  closed: 'Completed'
};

export const TYPE_LABEL: Record<RequestType, string> = {
  permit: 'Permits',
  code_violation: 'Code violation',
  park_issue: 'Parks',
  general: 'General',
  pothole: 'Pothole',
  inspection: 'Inspection',
  complaint: 'Complaint'
};
