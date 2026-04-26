
from supabase import create_client, Client
from config import get_settings

settings = get_settings()


def get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def get_supabase_admin() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


class _LazyAdminProxy:
    """Defers Supabase admin client creation until first attribute access."""
    __slots__ = ("_client",)

    def __init__(self):
        object.__setattr__(self, "_client", None)

    def _resolve(self) -> Client:
        if object.__getattribute__(self, "_client") is None:
            object.__setattr__(self, "_client", get_supabase_admin())
        return object.__getattribute__(self, "_client")

    def __getattr__(self, name):
        return getattr(self._resolve(), name)


supabase_admin: Client = _LazyAdminProxy()  # type: ignore[assignment]