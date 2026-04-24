
from supabase import create_client, Client
from config import get_settings

settings = get_settings()

# Standard client — uses anon key (respects RLS)
def get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_anon_key)

# Admin client — uses service role key (bypasses RLS)
# Use only in backend cron jobs and webhooks
def get_supabase_admin() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)

# Singleton admin client
supabase_admin: Client = get_supabase_admin()