import { useState, useEffect, useRef } from 'react';
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

const Messages = () => {
  const { currentUser } = useSelector(state => state.user);
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [unsubscribe, setUnsubscribe] = useState(null);

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

  return (
    <div className="flex h-[calc(100vh-100px)]">
      {/* Friends list */}
      <div className="w-1/4 border-r overflow-y-auto">
        <h2 className="p-4 font-bold border-b">Friends</h2>
        {friends.map(friend => (
          <div
            key={friend.id}
            onClick={() => selectFriend(friend)}
            className={`p-4 cursor-pointer hover:bg-gray-100 ${
              selectedFriend?.id === friend.id ? 'bg-gray-100' : ''
            }`}
          >
            <div className="flex items-center">
              <img
                src={friend.photoURL || '/default-avatar.png'}
                alt={friend.displayName}
                className="w-10 h-10 rounded-full mr-3"
              />
              <span>{friend.displayName}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedFriend ? (
          <>
            <div className="p-4 border-b">
              <h3 className="font-bold">{selectedFriend.displayName}</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`mb-4 ${
                    message.senderId === currentUser.uid
                      ? 'text-right'
                      : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block p-2 rounded-lg ${
                      message.senderId === currentUser.uid
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200'
                    }`}
                  >
                    {message.content}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 p-2 border rounded"
                  placeholder="Type a message..."
                />
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a friend to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages; 