import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  updateDoc,
  doc,
  getDoc,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import Button from 'react-bootstrap/Button';

const Notifications = () => {
  const currentUser = useSelector(state => state.user.currentUser);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!currentUser?.uid) return;

    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const notificationsData = await Promise.all(
        snapshot.docs.map(async (document) => {
          const data = document.data();
          const userDoc = await getDoc(doc(db, 'users', data.fromUser));
          return {
            id: document.id,
            ...data,
            fromUserData: userDoc.exists() ? userDoc.data() : null
          };
        })
      );
      
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [currentUser]);

  const markAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleFriendRequestResponse = async (notification, action) => {
    try {
      console.log('Starting friend request response:', { notification, action, currentUser: currentUser.uid });

      // Find the friendship document
      const friendshipsRef = collection(db, 'friendships');
      const q = query(
        friendshipsRef,
        where('senderId', '==', notification.fromUser),
        where('receiverId', '==', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      console.log('Friendship query results:', {
        found: !querySnapshot.empty,
        count: querySnapshot.size
      });
      
      if (!querySnapshot.empty) {
        const friendshipDoc = querySnapshot.docs[0];
        console.log('Found friendship document:', {
          id: friendshipDoc.id,
          status: friendshipDoc.data().status
        });
        
        const friendshipRef = doc(db, 'friendships', friendshipDoc.id);
        
        if (action === 'accept') {
          // Only update the status field as per Firebase rules
          console.log('Attempting to update friendship status to friends');
          await updateDoc(friendshipRef, {
            status: 'friends'
            // Note: updatedAt removed as it's not allowed by rules
          });
          console.log('Successfully updated friendship status');

          // Create acceptance notification
          console.log('Creating acceptance notification');
          await addDoc(collection(db, 'notifications'), {
            userId: notification.fromUser,
            type: 'friendRequestAccepted',
            fromUser: currentUser.uid,
            read: false,
            createdAt: new Date().toISOString()
          });
          console.log('Successfully created acceptance notification');

          // Mark original notification as read
          // Rules only allow updating 'read' field for notifications
          console.log('Marking original notification as read');
          await updateDoc(doc(db, 'notifications', notification.id), {
            read: true
          });
          console.log('Successfully marked notification as read');

        } else {
          // Declining - delete the friendship document
          console.log('Declining friend request - deleting document');
          await deleteDoc(friendshipRef);
          
          // Mark notification as read
          await updateDoc(doc(db, 'notifications', notification.id), {
            read: true
          });
        }

        // Refresh the notifications list
        fetchNotifications();
        console.log('Process completed successfully');
      } else {
        console.error('No friendship document found - this should not happen');
      }
    } catch (error) {
      console.error('Error in handleFriendRequestResponse:', error);
      console.error('Error details:', {
        notification,
        action,
        currentUser: currentUser?.uid,
        errorMessage: error.message,
        errorCode: error.code,
        stack: error.stack
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      <div className="space-y-4">
        {notifications.map((notification) => (
          <div key={notification.id}>
            {notification.type === 'friendRequest' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={notification.fromUserData?.profileImage || '/default-avatar.png'}
                    alt={notification.fromUserData?.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold">
                      {notification.fromUserData?.username || 'Unknown user'} sent you a friend request
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                {!notification.read && (
                  <div className="d-flex gap-2">
                    <Button
                      onClick={() => handleFriendRequestResponse(notification, 'accept')}
                      variant="success"
                      className="px-4"
                    >
                      Accept
                    </Button>
                    <Button
                      onClick={() => handleFriendRequestResponse(notification, 'decline')}
                      variant="danger"
                      className="px-4"
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            )}
            {notification.type === 'friendRequestAccepted' && (
              <div className="flex items-center gap-4">
                <img
                  src={notification.fromUserData?.profileImage || '/default-avatar.png'}
                  alt={notification.fromUserData?.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold">
                    {notification.fromUserData?.username || 'Unknown user'} accepted your friend request
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No notifications yet
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications; 