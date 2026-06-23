CREATE OR REPLACE FUNCTION public.hospitals_within_radius(
  lat double precision,
  lng double precision,
  radius double precision,
  p_city text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_limit integer DEFAULT 1000
)
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  city text,
  district_id uuid,
  location geometry,
  capacity integer,
  created_at timestamp without time zone,
  type text,
  phone text,
  emergency_available boolean,
  latitude double precision,
  longitude double precision,
  distance double precision,
  district_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.name,
    h.address,
    h.city,
    h.district_id,
    h.location,
    h.capacity,
    h.created_at,
    h.type,
    h.phone,
    h.emergency_available,
    ST_Y(h.location::geometry) as latitude,
    ST_X(h.location::geometry) as longitude,
    ST_DistanceSphere(h.location::geometry, ST_SetSRID(ST_MakePoint(lng, lat), 4326)) as distance,
    d.name as district_name
  FROM hospitals h
  LEFT JOIN districts d ON h.district_id = d.id
  WHERE ST_DWithin(h.location::geography, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radius)
    AND (p_city IS NULL OR h.city ILIKE '%' || p_city || '%' OR d.city ILIKE '%' || p_city || '%')
    AND (p_type IS NULL OR h.type = p_type)
  ORDER BY distance ASC
  LIMIT p_limit;
END;
$$;
