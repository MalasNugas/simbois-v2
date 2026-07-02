DROP TABLE IF EXISTS public.sheet_integration_settings CASCADE;

-- Purge semua data non-admin
DELETE FROM public.monthly_reports;
DELETE FROM public.reporting_permissions;
DELETE FROM public.location_tracking;
DELETE FROM public.notifications;
DELETE FROM public.clients;
DELETE FROM public.user_roles WHERE role <> 'admin';
DELETE FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role='admin');