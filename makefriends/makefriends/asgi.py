import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'makefriends.settings')
import django
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from channels.security.websocket import AllowedHostsOriginValidator
from users.routing import websocket_urlpatterns
from users.middleware import JWTAuthMiddlewareStack

application = ProtocolTypeRouter({
    # HTTP protocol uses Django's WSGI-compatible interface.
    "http": get_asgi_application(),
    # Only allow connections from allowed hosts
    "websocket": AllowedHostsOriginValidator(
        JWTAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})

