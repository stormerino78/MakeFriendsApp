import React, { useState, useEffect, useCallback } from 'react';
import { Alert, ActivityIndicator, View } from 'react-native';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from './(protected)/config.json';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';

const BACKEND_URL = config.url;

const ChatConversation = () => {
  // Get chat_id from route parameters (make sure your routing passes this parameter)
  const { chat_id } = useLocalSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState<IMessage[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Store the authenticated user's info.
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [loadingUser, setLoadingUser] = useState(true);

  // Retrieve authenticated user info from AsyncStorage.
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (!token) {
          Alert.alert("Error", "Not logged in");
          router.push('/screens/login');
          return;
        }
        const response = await fetch(`${BACKEND_URL}/api/users/me/`, {
          method: 'GET',
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          // Assuming your response includes user_id and name
          setCurrentUserId(data.user_id ? data.user_id.toString() : '');
          setCurrentUserName(data.name || 'Unknown');
        } else {
          Alert.alert("Error", "Failed to fetch profile");
        }
      } catch (error: any) {
        Alert.alert("Error", error.toString());
      } finally {
        setLoadingUser(false);
      }
    })();
  }, []);

  // Websocket connection for chat once chat_id is available
  useEffect(() => {
    if (!chat_id) return;
    // Build the WebSocket URL while using the right protocol (use wss if BACKEND_URL is https)
    const wsProtocol = BACKEND_URL.startsWith('https') ? 'wss' : 'ws';
    const baseUrl = BACKEND_URL.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}://${baseUrl}/ws/chats/${chat_id}/`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Connected to chat WebSocket');
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const newMessage: IMessage = {
          _id: uuidv4(),
          text: data.message,
          createdAt: new Date(),
          user: {
            _id: data.sender, // Sender's ID from backend
          },
        };
        setMessages((prevMessages) => GiftedChat.append(prevMessages, [newMessage]));
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (e: Event) => {
      const errorEvent = e as ErrorEvent;
      console.error('WebSocket error:', errorEvent.message);
    };

    ws.onclose = (e) => {
      console.log('WebSocket closed:', e.code, e.reason);
    };

    setSocket(ws);

    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, [chat_id]);

  const onSend = useCallback((newMessages: IMessage[] = []) => {
    setMessages((prevMessages) => GiftedChat.append(prevMessages, newMessages));
    if (socket && socket.readyState === WebSocket.OPEN) {
      // We send only the first message for simplicity.
      const messageText = newMessages[0].text;
      // The backend uses the authenticated user from the connection, so we don't need to pass sender info.
      socket.send(JSON.stringify({ message: messageText }));
    } else {
      Alert.alert('Error', 'WebSocket connection is not open');
    }
  }, [socket]);

  // Show a loading indicator until user info is fetched
  if (!currentUserId || !currentUserName) {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        </View>
    );
  }

  return (
    <GiftedChat
      messages={messages}
      onSend={(newMessages) => onSend(newMessages)}
      user={{
        _id: currentUserId,
        name: currentUserName,
      }}
      placeholder="Type your message here..."
    />
  );
};

export default ChatConversation;
