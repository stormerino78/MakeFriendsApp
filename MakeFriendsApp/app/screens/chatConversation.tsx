import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  StyleSheet 
} from 'react-native';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from './(protected)/config.json';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = config.url;

const ChatConversation = () => {
  // Get chat_id from route parameters (make sure your routing passes this parameter)
  const { chat_id, chatName } = useLocalSearchParams();
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

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert("Error", "Not logged in");
        router.push('/screens/login');
        return;
      }
      // Fetch existing messages for this chat
      const response = await fetch(`${BACKEND_URL}/api/chats/${chat_id}/messages/`, {
        method: 'GET',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Convert the data into GiftedChat IMessage format
        const loadedMessages = data.map((msg: any) => ({
          _id: msg.id.toString(),
          text: msg.message,
          createdAt: new Date(msg.created_at),
          user: {
            _id: msg.sender.toString(),
            name: msg.sender_username || msg.sender.toString(),
          },
        }));
        setMessages(loadedMessages);
      } else {
        Alert.alert("Error", "Failed to fetch chat history");
      }
    })();
  }, [chat_id]);
  
  // Websocket connection for chat once chat_id is available
  useEffect(() => {
    (async () => {
      if (!chat_id) return;
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert("Error", "Not logged in");
        router.push('/screens/login');
        return;
      }
      // Build the WebSocket URL while using the right protocol (wss for https)
      const wsProtocol = BACKEND_URL.startsWith('https') ? 'wss' : 'ws';
      const baseUrl = BACKEND_URL.replace(/^https?:\/\//, '');
      // Append the token as a query parameter so the middleware can extract it
      const wsUrl = `${wsProtocol}://${baseUrl}/ws/chats/${chat_id}/?token=${token}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Connected to chat WebSocket');
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          const incomingMessageId = data.messageId;
          // Use functional update to check for duplicate message ID:
          setMessages(prevMessages => {
            if (prevMessages.some(msg => msg._id === incomingMessageId)) {
              return prevMessages; // Duplicate echo, ignore it.
            }
            const newMessage: IMessage = {
              _id: incomingMessageId || uuidv4(),
              text: data.message,
              createdAt: new Date(),
              user: {
                _id: data.sender,
                name: data.sender_username || data.sender, // include sender's name if available.
              },
            };
            return GiftedChat.append(prevMessages, [newMessage]);
          });
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
    })();
  }, [chat_id]);

  const onSend = useCallback((newMessages: IMessage[] = []) => {
    setMessages((prevMessages) => GiftedChat.append(prevMessages, newMessages));
    if (socket && socket.readyState === WebSocket.OPEN) {
      // We send only the first message for simplicity.
      const outputMessage = newMessages[0];
      // Generate a unique message ID
      const messageId = uuidv4();
      outputMessage._id = messageId;
      // Send both the message text and messageId to the backend
      socket.send(JSON.stringify({ 
        message: outputMessage.text, 
        messageId: messageId 
      }));
    } else {
      Alert.alert('Error', 'WebSocket connection is not open');
    }
  }, [socket]);

  // Show a loading indicator until user info is fetched
  if (loadingUser || !currentUserId || !currentUserName) {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Header with back arrow and conversation partner's name */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{chatName  || "Chat"}</Text>
      </View>
      <GiftedChat
        messages={messages}
        onSend={(newMessages) => onSend(newMessages)}
        user={{
          _id: currentUserId,
          name: currentUserName,
        }}
        placeholder="Type your message here..."
      />
    </View>
  );
};

export default ChatConversation;

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#1f1f1f',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 12,
  },
});