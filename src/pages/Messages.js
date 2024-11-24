import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  addDoc,
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import NewThreadModal from '../components/NewThreadModal';
import { Container, Button } from 'react-bootstrap';

const Messages = () => {
  const navigate = useNavigate();
  const { currentUser } = useSelector(state => state.user);
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [unsubscribe, setUnsubscribe] = useState(null);
  const [threads, setThreads] = useState([]);
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);

  useEffect(() => {
    fetchFriends();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [unsubscribe]);

  const fetchFriends = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const friendIds = userDoc.data().friends || [];
      
      const friendsData = await Promise.all(
        friendIds.map(async (friendId) => {
          const friendDoc = await getDoc(doc(db, 'users', friendId));
          return { id: friendId, ...friendDoc.data() };
        })
      );
      setFriends(friendsData);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const selectFriend = async (friend) => {
    if (unsubscribe) unsubscribe();
    
    setSelectedFriend(friend);
    
    // Create a chat room ID (smaller ID first to ensure consistency)
    const roomId = [currentUser.uid, friend.id].sort().join('_');
    
    // Subscribe to messages
    const messagesQuery = query(
      collection(db, 'messages'),
      where('roomId', '==', roomId),
      orderBy('createdAt')
    );

    const unsub = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesList);
    });

    setUnsubscribe(() => unsub);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedFriend) return;

    const roomId = [currentUser.uid, selectedFriend.id].sort().join('_');
    
    try {
      await addDoc(collection(db, 'messages'), {
        roomId,
        senderId: currentUser.uid,
        receiverId: selectedFriend.id,
        content: newMessage,
        createdAt: new Date().toISOString()
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const createNewThread = async (selectedUser) => {
    try {
      // Check if thread already exists
      const existingThread = threads.find(thread => 
        thread.participants.includes(selectedUser.uid)
      );

      if (existingThread) {
        navigate(`/messages/${existingThread.id}`);
        return;
      }

      // Create new thread
      const threadRef = await addDoc(collection(db, 'chats'), {
        participants: [currentUser.uid, selectedUser.uid],
        createdAt: new Date().toISOString(),
        lastMessage: null,
        lastMessageTime: null
      });

      navigate(`/messages/${threadRef.id}`);
    } catch (error) {
      console.error('Error creating thread:', error);
    }
  };

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Messages</h1>
        <Button 
          variant="primary"
          onClick={() => setShowNewThreadModal(true)}
        >
          New Message
        </Button>
      </div>

      {/* Thread list */}
      
      <NewThreadModal
        show={showNewThreadModal}
        onClose={() => setShowNewThreadModal(false)}
        onSelectUser={createNewThread}
      />
    </Container>
  );
};

export default Messages; 