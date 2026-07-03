-- ============================================================
-- Esquema v4: objetivos (KPIs) por campaña
-- Ejecutar completo en el SQL Editor de Supabase (de una sola vez).
-- ============================================================

-- Un KPI con campaign_id = un Objetivo de esa campaña específica.
-- Un KPI con campaign_id vacío = sigue siendo un KPI general de la empresa (como hoy).
alter table kpis add column campaign_id bigint references campaigns(id);

-- No se necesitan políticas de RLS nuevas: "kpis_select"/"kpis_write" ya
-- filtran por company_id, y campaign_id es solo un dato adicional dentro
-- de filas que ya pertenecen a esa empresa.
