from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Looking for the chat ID of the chat group
    re_path(r'ws/chats/(?P<chat_id>[0-9a-f-]+)/$', consumers.ChatConsumer.as_asgi()),
]