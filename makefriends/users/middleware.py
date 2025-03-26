# your_app/middleware.py
import json
from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from rest_framework_simplejwt.authentication import JWTAuthentication

class JWTAuthMiddleware:
    """
    Custom middleware that extracts a JWT token from the query string,
    validates it using SimpleJWT, and populates scope["user"].
    """
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        # Parse the query string to extract token
        query_string = scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)
        token_list = query_params.get("token")
        if token_list:
            token = token_list[0]
            try:
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(token)
                user = await database_sync_to_async(jwt_auth.get_user)(validated_token)
                scope["user"] = user
            except Exception:
                scope["user"] = AnonymousUser()
        else:
            scope["user"] = AnonymousUser()

        # Call the next middleware/application with all three arguments.
        return await self.inner(scope, receive, send)

def JWTAuthMiddlewareStack(inner):
    """
    Wraps the inner application with JWTAuthMiddleware on top of the default AuthMiddlewareStack.
    """
    from channels.auth import AuthMiddlewareStack
    return JWTAuthMiddleware(AuthMiddlewareStack(inner))
