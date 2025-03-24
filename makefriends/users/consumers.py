import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from users.models import Chat

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Extract chat_id from the URL
        self.chat_id = self.scope['url_route']['kwargs']['chat_id']
        self.chat_group_name = f'chat_{self.chat_id}'

        if not self.scope["user"].is_authenticated:
            await self.close()
            return

        # Verify that the user is allowed to join the chat.
        is_allowed = await self.user_is_allowed()
        if not is_allowed:
            logger.warning(f"User {self.scope['user']} not allowed in chat {self.chat_id}")
            await self.close()
            return

        # Join the chat group
        await self.channel_layer.group_add(
            self.chat_group_name,
            self.channel_name
        )
        await self.accept()
        logger.info(f"User {self.scope['user']} connected to chat {self.chat_id}")

    async def disconnect(self, close_code):
        # Leave chat group
        await self.channel_layer.group_discard(
            self.chat_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            logger.error("Invalid JSON received")
            return
        message = data.get('message')
        # Use the authenticated user from the connection as sender
        sender = str(self.scope["user"])
        if not message:
            logger.warning("Empty message received; ignoring.")
            return
        
        # Broadcast message to the chat group
        await self.channel_layer.group_send(
            self.chat_group_name,
            {
                'type': 'chat_message', # Calls chat message handler
                'message': message,
                'sender': sender,
            }
        )

    async def chat_message(self, event):
        # Send message to WebSocket.
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'sender': event['sender'],
        }))

    @database_sync_to_async
    def user_is_allowed(self):
        """
        Check if the authenticated user is allowed to join this chat.
        Verify that the user is in the chat's participants
        """
        try:
            chat = Chat.objects.get(pk=int(self.chat_id))
        except Chat.DoesNotExist:
            logger.error(f"Chat with id {self.chat_id} does not exist.")
            return False

        # Check membership in the chat participants.
        return self.scope["user"] in chat.participants.all()