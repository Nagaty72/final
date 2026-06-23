CREATE OR REPLACE FUNCTION public.get_hospitals_with_gis(
  p_city text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_district_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 1000,
  p_offset integer DEFAULT 0
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
    d.name as district_name
  FROM hospitals h
  LEFT JOIN districts d ON h.district_id = d.id
  WHERE (p_city IS NULL OR h.city ILIKE '%' || p_city || '%' OR d.city ILIKE '%' || p_city || '%')
    AND (p_type IS NULL OR h.type = p_type)
    AND (p_district_id IS NULL OR h.district_id = p_district_id)
  ORDER BY h.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
