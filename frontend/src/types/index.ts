export interface Project {
  id: string
  name: string
  slug: string
  description?: string
  location?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  lat?: number
  lng?: number
  rera_number?: string
  amenities: string[]
  images: string[]
  brochure_url?: string
  video_url?: string
  is_active: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
}

export interface Tower {
  id: string
  project_id: string
  name: string
  description?: string
  total_floors: number
  total_units: number
  svg_floor_plan?: string
  images: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Unit {
  id: string
  tower_id: string
  unit_number: string
  floor_number: number
  unit_type?: string
  bedrooms?: number
  bathrooms?: number
  balconies: number
  area_sqft?: string
  carpet_area?: string
  plot_area?: string
  base_price?: string
  price_per_sqft?: string
  down_payment?: string
  emi_estimate?: string
  facing?: string
  floor_plan_img?: string
  status: string
  amenities: string[]
  images: string[]
  is_trending: boolean
  is_featured: boolean
  view_count: number
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  is_verified: boolean
  is_active: boolean
  preferences: Record<string, any>
  created_at: string
  updated_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  customer: Customer
}

export interface PaginatedResponse<T> {
  total: number
  page: number
  page_size: number
  total_pages: number
  items: T[]
}

export interface SearchResponse {
  query?: string
  interpreted_as?: Record<string, any>
  total: number
  page: number
  page_size: number
  total_pages: number
  items: Unit[]
  suggestions?: string[]
  message?: string
}

export interface Lead {
  name: string
  phone: string
  email?: string
  source?: string
  interest?: string
  budget_min?: string
  budget_max?: string
  message?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

export interface SiteVisit {
  name: string
  phone: string
  email?: string
  project_id?: string
  visit_date: string
  visit_time?: string
  notes?: string
}
