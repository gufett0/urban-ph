import { useState, useEffect } from 'react';
import { getDocs, collection, updateDoc, doc, getDoc, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';

function UsersDatabase() {
  const [data, setData] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [expandedCells, setExpandedCells] = useState({});

  const fetchUsers = async () => {
    try {
      setSyncing(true);
      const snapshot = await getDocs(collection(db, 'users'));
      const users = [];

      for (const userDoc of snapshot.docs) {
        const userData = userDoc.data();
        const events = userData.eventsBooked || [];

        const eventsDetails = [];
        let phoneNumber = ''; 
        
        // Get phone from bookings
        try {
          const bookingsQuery = query(
            collection(db, 'bookings'),
            where('userId', '==', userDoc.id)
          );
          const bookingsSnapshot = await getDocs(bookingsQuery);
          
          if (!bookingsSnapshot.empty) {
            const firstBooking = bookingsSnapshot.docs[0].data();
            phoneNumber = firstBooking.contactInfo?.phone || '';
          }
        } catch (error) {
          console.error('Error fetching bookings:', error);
        }

        // Get event details
        for (const eventId of events) {
          try {
            const eventRef = doc(db, 'events', eventId);
            const eventSnap = await getDoc(eventRef);
            if (eventSnap.exists()) {
              const eventData = eventSnap.data();
              eventsDetails.push(`${eventData.title} (${eventData.date})`);
            }
          } catch (error) {
            console.error('Error fetching event:', error);
          }
        }

        // Safely get full name
        const fullName = userData.name && userData.surname 
          ? `${userData.name} ${userData.surname}`
          : userData.displayName || ''; 

        // Safely format birth date
        let birthDateString = '';
        try {
          const birthDate = userData.birthDate;
          if (birthDate) {
            if (birthDate instanceof Date) {
              birthDateString = birthDate.toLocaleDateString('it-IT');
            } else if (typeof birthDate === 'string') {
              birthDateString = birthDate;
            } else if (birthDate.toDate) {
              birthDateString = birthDate.toDate().toLocaleDateString('it-IT');
            }
          }
        } catch (error) {
          console.error('Error formatting birth date', error);
        }

        // Format created at date safely
        let createdAtString = '';
        try {
          if (userData.createdAt) {
            if (userData.createdAt.toDate) {
              createdAtString = userData.createdAt.toDate().toLocaleString();
            } else if (userData.createdAt instanceof Date) {
              createdAtString = userData.createdAt.toLocaleString();
            } else if (typeof userData.createdAt === 'string') {
              createdAtString = userData.createdAt;
            }
          }
        } catch (error) {
          console.error('Error formatting created at date', error);
        }

        // Format membership years
        const membershipYears = userData.membershipYears || [];
        const membershipYearsDisplay = membershipYears.length > 0 
          ? membershipYears.sort((a, b) => b - a) // Sort descending (newest first)
          : ['none'];

        // Current year member status - explicitly handle boolean
        const currentYearMember = userData.currentYearMember === true;
        const currentYear = new Date().getFullYear();

        users.push({
          id: userDoc.id,
          email: userData.email || '',
          taxId: userData.taxId || '',
          fullName,
          name: userData.name || '',
          surname: userData.surname || '',
          birthDate: birthDateString,
          phone: phoneNumber, 
          address: userData.address || '',
          instagram: userData.instagram || '',
          role: userData.role || '',
          createdAt: createdAtString,
          eventsBooked: eventsDetails.length > 0 ? eventsDetails : ['No events booked'],
          membershipYears: membershipYearsDisplay,
          currentYearMember: currentYearMember,
          // Store additional data for reference
          lastBookingYear: userData.lastBookingYear || null,
          personalDetailsLastConfirmed: userData.personalDetailsLastConfirmed || null
        });
      }

      setData(users);
      console.log('Fetched users:', users.length);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSync = () => {
    fetchUsers();
  };

  const toggleCellExpand = (rowId, columnId) => {
    const cellKey = `${rowId}-${columnId}`;
    setExpandedCells(prev => ({
      ...prev,
      [cellKey]: !prev[cellKey]
    }));
  };

  const isCellExpanded = (rowId, columnId) => {
    const cellKey = `${rowId}-${columnId}`;
    return !!expandedCells[cellKey];
  };

  const handleEdit = (rowId, columnId, value) => {
    if (columnId === 'id' || columnId === 'role' || 
        columnId === 'eventsBooked' || columnId === 'createdAt' ||
        columnId === 'phone' || columnId === 'membershipYears' || 
        columnId === 'currentYearMember') {
      return; // Prevent editing these columns
    }
    setEditingCell({ rowId, columnId, value });
  };

  const handleSave = async (rowId, columnId, value) => {
    try {
      const userRef = doc(db, 'users', rowId);
      const userSnapshot = await getDoc(userRef);
      
      if (!userSnapshot.exists()) {
        throw new Error('User not found');
      }
      
      // Special handling for nested properties
      let updateData = {
        updatedAt: serverTimestamp() // Always add updatedAt
      };
      
      switch (columnId) {
        case 'fullName': {
          // Split fullName into name and surname
          const nameParts = value.trim().split(' ');
          updateData.name = nameParts[0] || '';
          updateData.surname = nameParts.slice(1).join(' ') || '';
          break;
        }
        case 'birthDate':
          // Handle birth date special case
          updateData[columnId] = value;
          break;
        default:
          updateData[columnId] = value;
      }
  
      await updateDoc(userRef, updateData);
      console.log('Updated user field', { rowId, columnId, value });
  
      // Update local state
      setData(prevData =>
        prevData.map(row => {
          if (row.id === rowId) {
            const updatedRow = { ...row, [columnId]: value };
            if (columnId === 'fullName') {
              const nameParts = value.trim().split(' ');
              updatedRow.name = nameParts[0] || '';
              updatedRow.surname = nameParts.slice(1).join(' ') || '';
            }
            return updatedRow;
          }
          return row;
        })
      );
  
      setEditingCell(null);
    } catch (error) {
      console.error('Error updating user field:', error);
      alert('Failed to update user: ' + error.message);
    }
  };

  const handleDeleteUser = async (userId, e) => {
    e.stopPropagation();

    if (!confirm(`Are you sure you want to permanently delete this user and all their data? This action cannot be undone.`)) {
      return;
    }

    setDeleting(userId);
    try {
      // 1. Delete all bookings associated with this user
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', userId)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      const bookingDeletionPromises = [];
      bookingsSnapshot.forEach(bookingDoc => {
        bookingDeletionPromises.push(deleteDoc(bookingDoc.ref));
      });
      
      await Promise.all(bookingDeletionPromises);
      console.log(`Deleted ${bookingDeletionPromises.length} bookings for user ${userId}`);

      // 2. Get user data to find their booked events
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const bookedEvents = userData.eventsBooked || [];

        // 3. Update events to remove this user from attendees and adjust spots
        const eventUpdatePromises = [];
        for (const eventId of bookedEvents) {
          try {
            const eventRef = doc(db, 'events', eventId);
            const eventDoc = await getDoc(eventRef);
            
            if (eventDoc.exists()) {
              const eventData = eventDoc.data();
              const updatedAttendees = (eventData.attendees || []).filter(id => id !== userId);
              const spotsLeft = Math.max(0, (eventData.spots || 0) - updatedAttendees.length);
              
              eventUpdatePromises.push(
                updateDoc(eventRef, {
                  attendees: updatedAttendees,
                  spotsLeft: spotsLeft
                })
              );
            }
          } catch (err) {
            console.error(`Error updating event ${eventId}:`, err);
          }
        }
        
        await Promise.all(eventUpdatePromises);
        console.log(`Updated ${eventUpdatePromises.length} events for user ${userId}`);
      }

      // 4. Delete the user document
      await deleteDoc(doc(db, 'users', userId));
      console.log('Successfully deleted user', userId);

      // 5. Refresh the data
      setData(prevData => prevData.filter(user => user.id !== userId));
      
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const downloadCSV = () => {
    try {
      const header = ['id', 'email', 'taxId', 'fullName', 'birthDate', 'phone', 'address', 'instagram', 'role', 'createdAt', 'eventsBooked', 'membershipYears', 'currentYearMember', 'lastBookingYear'];
      const csv = [
        header.join(','),
        ...data.map(row => header.map(field => {
          const value = row[field];
          // Handle array values and escape special characters
          if (Array.isArray(value)) {
            return JSON.stringify(value.join('; '));
          }
          // Handle boolean values
          if (typeof value === 'boolean') {
            return value.toString();
          }
          return JSON.stringify(value || '');
        }).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'users_database.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating CSV:', error);
      alert('Failed to download CSV: ' + error.message);
    }
  };

  // Render cell content with proper truncation for long text
  const renderCellContent = (rowId, columnId, content) => {
    console.log(`Rendering ${columnId}:`, content, typeof content); // Debug log
    
    if (content === null || content === undefined) {
      if (columnId === 'currentYearMember') {
        // Explicitly handle null/undefined for currentYearMember
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            No
          </span>
        );
      }
      return '';
    }

    // Handle array content (like eventsBooked or membershipYears) - keep existing behavior
    if (Array.isArray(content)) {
      const expanded = isCellExpanded(rowId, columnId);
      
      // If nothing or just default message, don't need expand/collapse
      if (content.length <= 1 && (content[0] === 'No events booked' || content[0] === 'none')) {
        return (
          <span className="text-gray-500 italic">
            {content[0]}
          </span>
        );
      }
      
      if (!expanded && content.length > 1) {
        // Show first item and a count
        return (
          <div>
            <div>{content[0]}</div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleCellExpand(rowId, columnId);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 mt-1 underline"
            >
              + {content.length - 1} more
            </button>
          </div>
        );
      } else {
        // Show all items with collapse button
        return (
          <div>
            {content.map((item, index) => (
              <div key={index} className="mb-1">{item}</div>
            ))}
            {content.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCellExpand(rowId, columnId);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 mt-1 underline"
              >
                Collapse
              </button>
            )}
          </div>
        );
      }
    } 
    
    // Handle boolean content specifically for currentYearMember column
    if (columnId === 'currentYearMember') {
      const boolValue = content === true;
      console.log(`CurrentYearMember - content: ${content}, boolValue: ${boolValue}`); // Debug log
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          boolValue 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {boolValue ? 'Yes' : 'No'}
        </span>
      );
    }
    
    // Handle other boolean content
    if (typeof content === 'boolean') {
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          content 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {content ? 'Yes' : 'No'}
        </span>
      );
    }
    
    // Handle string content - use ellipsis for very long text
    if (typeof content === 'string') {
      // For address and other long fields, show with ellipsis but allow full text on hover
      return (
        <div 
          className="truncate" 
          title={content}
          style={{ maxWidth: '100%' }}
        >
          {content}
        </div>
      );
    }
    
    return content;
  };

  if (loading && data.length === 0) {
    return (
      <div className="bg-white p-4 rounded shadow">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Users Database</h2>
        <div className="flex gap-2">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className={`flex items-center px-4 py-2 rounded ${
              syncing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-yellow-600 hover:bg-yellow-700'
            } text-white`}
          >
            <svg 
              className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {syncing ? 'Syncing...' : 'Sync Data'}
          </button>
          <button 
            onClick={downloadCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Download CSV
          </button>
        </div>
      </div>

      {data.length === 0 && !loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No users found. Try clicking 'Sync Data' to refresh.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left bg-gray-50 text-gray-600 font-medium w-24">ID</th>
                <th className="px-4 py-2 text-left bg-gray-50 text-gray-600 font-medium" style={{ minWidth: '200px' }}>Email</th>
                <th className="px-4 py-2 text-left bg-gray-50 text-gray-600 font-medium" style={{ minWidth: '130px' }}>Codice Fiscale</th>
                <th className="px-4 py-2 text-left bg-gray-50 text-gray-600 font-medium" style={{ minWidth: '120px' }}>Full Name</th>
                <th className="px-4 py-2 text-left bg-gray-50 text-gray-600 font-medium" style={{ minWidth: '120px' }}>Data di nascita</th>
                <th className="px-4 py-2 text-left bg-gray-50 text-gray-600 font-medium" style={{ minWidth: '130px' }}>Phone</th>
                <th className="px-4 py-2 text-left bg-gray-50 text-gray-600 font-medium" style={{ minWidth: '250px' }}>Residenza</th>
                <th className="px-4 py-2 text-left bg-gray-50 text-gray-600 font-medium w-28">Instagram</th>
                <th className="px-4 py-2 text-left bg-gray-50 text-gray-600 font-medium w-20">Role</th>
                <th className="px-4 py-2 text-left bg-gray-50 text-gray-600 font-medium w-36">Created At</th>
                <th className="px-4 py-2 text-left bg-gray-50 text-gray-600 font-medium" style={{ minWidth: '150px' }}>Memberships</th>
                <th className="px-4 py-2 text-left bg-gray-50 text-gray-600 font-medium w-20">Member {new Date().getFullYear()}</th>
                <th className="px-4 py-2 text-left bg-gray-50 text-gray-600 font-medium" style={{ minWidth: '320px' }}>Events Booked</th>
                <th className="px-4 py-2 text-left bg-gray-50 text-gray-600 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-2 w-24">
                    <div className="truncate" title={row.id}>
                      {row.id}
                    </div>
                  </td>
                  <td className="px-4 py-2" style={{ minWidth: '320px' }}>
                    {editingCell && editingCell.rowId === row.id && editingCell.columnId === 'email' ? (
                      <input
                        type="text"
                        className="border rounded p-1 w-full"
                        defaultValue={editingCell.value}
                        onBlur={(e) => handleSave(row.id, 'email', e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => handleEdit(row.id, 'email', row.email)}
                        className="p-1 rounded cursor-pointer hover:bg-gray-100 truncate"
                        title={row.email}
                      >
                        {row.email}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 w-32">
                    {editingCell && editingCell.rowId === row.id && editingCell.columnId === 'taxId' ? (
                      <input
                        type="text"
                        className="border rounded p-1 w-full"
                        defaultValue={editingCell.value}
                        onBlur={(e) => handleSave(row.id, 'taxId', e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => handleEdit(row.id, 'taxId', row.taxId)}
                        className="p-1 rounded cursor-pointer hover:bg-gray-100 truncate"
                        title={row.taxId}
                      >
                        {row.taxId}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 w-40">
                    {editingCell && editingCell.rowId === row.id && editingCell.columnId === 'fullName' ? (
                      <input
                        type="text"
                        className="border rounded p-1 w-full"
                        defaultValue={editingCell.value}
                        onBlur={(e) => handleSave(row.id, 'fullName', e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => handleEdit(row.id, 'fullName', row.fullName)}
                        className="p-1 rounded cursor-pointer hover:bg-gray-100 truncate"
                        title={row.fullName}
                      >
                        {renderCellContent(row.id, 'fullName', row.fullName)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 w-28">
                    {editingCell && editingCell.rowId === row.id && editingCell.columnId === 'birthDate' ? (
                      <input
                        type="text"
                        className="border rounded p-1 w-full"
                        defaultValue={editingCell.value}
                        onBlur={(e) => handleSave(row.id, 'birthDate', e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => handleEdit(row.id, 'birthDate', row.birthDate)}
                        className="p-1 rounded cursor-pointer hover:bg-gray-100 truncate"
                        title={row.birthDate}
                      >
                        {row.birthDate}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 w-32">
                    <div className="p-1 rounded truncate" title={row.phone}>
                      {renderCellContent(row.id, 'phone', row.phone)}
                    </div>
                  </td>
                  <td className="px-4 py-2 w-64">
                    {editingCell && editingCell.rowId === row.id && editingCell.columnId === 'address' ? (
                      <input
                        type="text"
                        className="border rounded p-1 w-full"
                        defaultValue={editingCell.value}
                        onBlur={(e) => handleSave(row.id, 'address', e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => handleEdit(row.id, 'address', row.address)}
                        className="p-1 rounded cursor-pointer hover:bg-gray-100 truncate"
                        title={row.address}
                      >
                        {renderCellContent(row.id, 'address', row.address)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 w-28">
                    {editingCell && editingCell.rowId === row.id && editingCell.columnId === 'instagram' ? (
                      <input
                        type="text"
                        className="border rounded p-1 w-full"
                        defaultValue={editingCell.value}
                        onBlur={(e) => handleSave(row.id, 'instagram', e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => handleEdit(row.id, 'instagram', row.instagram)}
                        className="p-1 rounded cursor-pointer hover:bg-gray-100 truncate"
                        title={row.instagram}
                      >
                        {row.instagram}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 w-20">
                    <div className="p-1 rounded">
                      {row.role === 'admin' ? (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                          {row.role}
                        </span>
                      ) : (
                        <span className="truncate" title={row.role}>{row.role}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 w-36">
                    <div className="p-1 rounded truncate" title={row.createdAt}>
                      {renderCellContent(row.id, 'createdAt', row.createdAt)}
                    </div>
                  </td>
                  <td className="px-4 py-2" style={{ minWidth: '150px' }}>
                    <div className="p-1 rounded">
                      {renderCellContent(row.id, 'membershipYears', row.membershipYears)}
                    </div>
                  </td>
                  <td className="px-4 py-2 w-20 text-center">
                    <div className="p-1 rounded">
                      {renderCellContent(row.id, 'currentYearMember', row.currentYearMember)}
                    </div>
                  </td>
                  <td className="px-4 py-2 w-48">
                    <div className="p-1 rounded">
                      {renderCellContent(row.id, 'eventsBooked', row.eventsBooked)}
                    </div>
                  </td>
                  <td className="px-4 py-2 w-24">
                    <button
                      onClick={(e) => handleDeleteUser(row.id, e)}
                      disabled={deleting === row.id}
                      className={`px-3 py-1 rounded ${
                        deleting === row.id 
                          ? 'bg-red-400 cursor-not-allowed' 
                          : 'bg-red-600 hover:bg-red-700'
                      } text-white text-sm flex items-center gap-1`}
                      title="Delete user and all associated data"
                    >
                      {deleting === row.id ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default UsersDatabase;