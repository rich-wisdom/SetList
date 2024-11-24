import { useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, orderBy, startAt, endAt, getDocs, limit } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Form, Button } from 'react-bootstrap';

const Search = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('username', '>=', searchTerm.toLowerCase()),
        where('username', '<=', searchTerm.toLowerCase() + '\uf8ff'),
        orderBy('username'),
        // Limit results to 20
        limit(20)
      );

      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setResults(users);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Form onSubmit={handleSearch} className="mb-4 d-flex gap-2">
        <Form.Control
          type="text"
          placeholder="Search for musicians or venues..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow-1"
        />
        <Button 
          type="submit"
          className="search-button"
        >
          Search
        </Button>
      </Form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map(user => (
          <Link
            key={user.id}
            to={`/profile/${user.id}`}
            className="block p-4 border rounded hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-4">
              <img
                src={user.profileImage || '/default-avatar.png'}
                alt={user.username}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div>
                <h3 className="font-bold">{user.username}</h3>
                <p className="text-gray-600">{user.accountType}</p>
                <p className="text-sm text-gray-500">
                  {user.accountType === 'musician' 
                    ? `Instruments: ${user.instruments.join(', ')}`
                    : `Capacity: ${user.venueCapacity}`}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Search; 