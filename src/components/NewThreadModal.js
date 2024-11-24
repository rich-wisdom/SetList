import { useState } from 'react';
import { Modal, Form, Button, ListGroup } from 'react-bootstrap';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

const NewThreadModal = ({ show, onClose, onSelectUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      // Search by username or stage name
      const queries = [
        query(usersRef, where('usernameLower', '>=', searchTerm.toLowerCase())),
        query(usersRef, where('usernameLower', '<=', searchTerm.toLowerCase() + '\uf8ff')),
        query(usersRef, where('stageName', '>=', searchTerm)),
        query(usersRef, where('stageName', '<=', searchTerm + '\uf8ff'))
      ];

      const results = await Promise.all(queries.map(q => getDocs(q)));
      const users = new Map(); // Use Map to deduplicate users

      results.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          users.set(doc.id, { id: doc.id, ...doc.data() });
        });
      });

      setSearchResults(Array.from(users.values()));
      console.log('Search results:', Array.from(users.values())); // Debug log
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered className="dark-mode">
      <Modal.Header closeButton>
        <Modal.Title>New Message</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSearch} className="mb-3">
          <Form.Group className="d-flex gap-2">
            <Form.Control
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by username or name..."
              className="flex-grow-1"
            />
            <Button 
              type="submit" 
              className="search-button"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </Form.Group>
        </Form>

        <div className="search-results">
          {searchResults.map(user => (
            <div 
              key={user.id} 
              className="user-search-result d-flex align-items-center gap-2 p-2 border-bottom cursor-pointer"
              onClick={() => onSelectUser(user)}
              style={{ cursor: 'pointer' }}
            >
              <img
                src={user.profileImage || '/default-avatar.png'}
                alt={user.username}
                className="rounded-circle"
                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
              />
              <div>
                <div className="fw-bold">{user.stageName}</div>
                <div className="text-muted">@{user.username}</div>
              </div>
            </div>
          ))}
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default NewThreadModal; 