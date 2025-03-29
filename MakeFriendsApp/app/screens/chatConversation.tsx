import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from './(protected)/config.json';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

const BACKEND_URL = config.url;

// Define a custom type for chat messages.
type ChatMessage = IMessage & { seen?: boolean };

const ChatConversation = () => {
  const { chat_id, chatName } = useLocalSearchParams();
  const router = useRouter();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [loadingUser, setLoadingUser] = useState(true);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [inputText, setInputText] = useState<string>("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Fetch user info.
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

  // Fetch chat history.
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert("Error", "Not logged in");
        router.push('/screens/login');
        return;
      }
      const response = await fetch(`${BACKEND_URL}/api/chats/${chat_id}/messages/`, {
        method: 'GET',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const loadedMessages: ChatMessage[] = data.map((msg: any) => ({
          _id: msg.id.toString(),
          text: msg.message,
          createdAt: new Date(msg.created_at),
          user: {
            _id: msg.sender.toString(),
            name: msg.sender_username || msg.sender.toString(),
          },
          seen: msg.seen,
        }));
        setMessages(loadedMessages);
      } else {
        Alert.alert("Error", "Failed to fetch chat history");
      }
    })();
  }, [chat_id]);

  // Establish WebSocket connection.
  useEffect(() => {
    (async () => {
      if (!chat_id) return;
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert("Error", "Not logged in");
        router.push('/screens/login');
        return;
      }
      const wsProtocol = BACKEND_URL.startsWith('https') ? 'wss' : 'ws';
      const baseUrl = BACKEND_URL.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}://${baseUrl}/ws/chats/${chat_id}/?token=${token}`;
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        console.log('Connected to chat WebSocket');
      };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          const incomingMessageId = data.messageId;
          setMessages(prevMessages => {
            if (prevMessages.some(msg => msg._id === incomingMessageId)) {
              return prevMessages;
            }
            const newMessage: ChatMessage = {
              _id: incomingMessageId || uuidv4(),
              text: data.message,
              createdAt: new Date(),
              user: {
                _id: data.sender,
                name: data.sender_username || data.sender,
              },
              seen: false,
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
      socketRef.current = ws;
      return () => {
        socketRef.current?.close();
      };
    })();
  }, [chat_id]);

  // onSend: update message if editing, otherwise send new message.
  const onSend = useCallback((newMessages: IMessage[] = []) => {
    if (editingMessage) {
      const newText = newMessages[0].text;
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg._id === editingMessage._id ? { ...msg, text: newText } : msg
        )
      );
      setEditingMessage(null);
      setInputText("");
    } else {
      const outputMessage: ChatMessage = { ...newMessages[0], seen: false };
      setMessages(prevMessages => GiftedChat.append(prevMessages, [outputMessage]));
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        const messageId = uuidv4();
        outputMessage._id = messageId;
        socketRef.current.send(JSON.stringify({
          message: outputMessage.text,
          messageId: messageId
        }));
      } else {
        Alert.alert('Error', 'WebSocket connection is not open');
      }
      setInputText("");
    }
  }, [editingMessage]);

  // Handle long press to show context menu.
  const handleLongPress = (message: IMessage) => {
    setSelectedMessage(message as ChatMessage);
    setContextMenuVisible(true);
  };

  const handleModify = () => {
    if (selectedMessage && selectedMessage.user._id === currentUserId && !selectedMessage.seen) {
      setEditingMessage(selectedMessage);
      setInputText(selectedMessage.text);
    } else {
      Alert.alert("Not allowed", "You can only modify your own message that hasn't been seen.");
    }
    setContextMenuVisible(false);
  };

  const handleDelete = () => {
    if (selectedMessage && selectedMessage.user._id === currentUserId) {
      setMessages(prevMessages => prevMessages.filter(msg => msg._id !== selectedMessage._id));
    } else {
      Alert.alert("Not allowed", "You can only delete your own message.");
    }
    setContextMenuVisible(false);
  };

  const handleCopy = async () => {
    if (selectedMessage) {
      await Clipboard.setStringAsync(selectedMessage.text);
      Alert.alert("Copied", "Message copied to clipboard");
    }
    setContextMenuVisible(false);
  };

  if (loadingUser || !currentUserId || !currentUserName) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{chatName || "Chat"}</Text>
      </View>
      {/* Chat */}
      <GiftedChat
        messages={messages}
        onSend={(newMessages) => onSend(newMessages)}
        onLongPress={(context, message) => handleLongPress(message)}
        user={{
          _id: currentUserId,
          name: currentUserName,
        }}
        {...(editingMessage ? { text: inputText, onInputTextChanged: setInputText } : {})}
        placeholder={editingMessage ? "Editing message" : "Type your message here..."}
      />
      {/* Custom context menu modal */}
      <Modal
        visible={contextMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setContextMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setContextMenuVisible(false)}>
          <View style={styles.contextMenuContainer} onStartShouldSetResponder={() => true}>
            {selectedMessage && selectedMessage.user._id === currentUserId && !selectedMessage.seen && (
              <>
                <Pressable style={styles.contextMenuOption} onPress={handleModify}>
                  <Text style={styles.contextMenuText}>Modify</Text>
                </Pressable>
                <View style={styles.divider} />
              </>
            )}
            {selectedMessage && selectedMessage.user._id === currentUserId && (
              <>
                <Pressable style={styles.contextMenuOption} onPress={handleDelete}>
                  <Text style={styles.contextMenuText}>Delete</Text>
                </Pressable>
                <View style={styles.divider} />
              </>
            )}
            <Pressable style={styles.contextMenuOption} onPress={handleCopy}>
              <Text style={styles.contextMenuText}>Copy</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextMenuContainer: {
    width: 250,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  contextMenuOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  contextMenuText: {
    fontSize: 16,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#ccc',
  },
});
