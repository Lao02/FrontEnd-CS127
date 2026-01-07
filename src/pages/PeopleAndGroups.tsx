import { useEffect, useState } from 'react';
import { Person, Group } from '../types';
import CreatePersonModal from '../components/CreatePersonModal';
import CreateGroupModal from '../components/CreateGroupModal';
import './PeopleAndGroups.css';
import { useApp } from '../context/AppContext';

// Add Member Modal
interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  onAdd: (personId: string) => void;
  groupMembers: Person[];
}
function AddMemberModal({ isOpen, onClose, people, onAdd, groupMembers }: AddMemberModalProps) {
  const [selected, setSelected] = useState('');
  const available = people.filter((p: Person) => !groupMembers.some((m: Person) => m.personID === p.personID));
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Member</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">×</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (selected) { onAdd(selected); setSelected(''); }}}>
          <div className="form-group">
            <label>Select Person</label>
            <select value={selected} onChange={e => setSelected(e.target.value)} required>
              <option value="">Select...</option>
              {available.map((p: Person) => (
                <option key={p.personID} value={p.personID}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={!selected}>Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Manage Members Modal (remove members)
interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupMembers: Person[];
  onRemove: (personId: string) => void;
}
function ManageMembersModal({ isOpen, onClose, groupMembers, onRemove }: ManageMembersModalProps) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Members</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">×</button>
        </div>
        <div className="form-group">
          <ul>
            {groupMembers.length === 0 ? <li key="no-members" style={{color:'#888'}}>No members</li> : groupMembers.map(m => (
              <li key={m.personID} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'1em'}}>
                <span>{m.firstName} {m.lastName}</span>
                <button className="btn-danger" onClick={() => onRemove(m.personID.toString())}>Remove</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function PeopleAndGroups() {
  const {people, groups, refreshPeople, refreshGroups, addPerson, updatePerson, deletePerson, addGroup, updateGroup, deleteGroup, addGroupMember, removeGroupMember, getAllEntries } = useApp();
  const [activeTab, setActiveTab] = useState<'people' | 'groups'>('people');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberGroupId, setAddMemberGroupId] = useState<number | null>(null);
    const handleAddMember = (groupId: number) => {
      setAddMemberGroupId(groupId);
      setShowAddMemberModal(true);
    };
      const handleAddMemberToGroup = async (personId: string) => {
  if (addMemberGroupId) {
    try {
      await addGroupMember(addMemberGroupId, parseInt(personId));
      await refreshGroups();
      setShowAddMemberModal(false);
      setAddMemberGroupId(null);
    } catch (err) {
      console.error('Failed to add member:', err);
      alert('Failed to add member to group');
    }
  }
};
  const [showCreatePersonModal, setShowCreatePersonModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const [manageGroupId, setManageGroupId] = useState<number | null>(null);

  useEffect(() => {
    refreshPeople();
    refreshGroups();
  }, []);

  // People CRUD
  const handleAddPerson = () => {
    setEditingPerson(null);
    setShowCreatePersonModal(true);
  };
  const handleEditPerson = (person: Person) => {
    console.log('Editing person:', person);
    console.log('Person ID:', person.personID);
    setEditingPerson(person);
    setShowCreatePersonModal(true);
  };
  const handleDeletePerson = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this person?')) return;
    
    try {
      // Check for unpaid loans where person is borrower
      const entries = await getAllEntries();
      const hasUnpaidLoan = entries.some(entry => {
        return entry.borrowerId?.toString() === id && entry.amountRemaining > 0;
      });
      
      if (hasUnpaidLoan) {
        alert('Cannot delete this person because they have unpaid loans.');
        return;
      }
      
      await deletePerson(parseInt(id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete person';
      alert(errorMessage);
      console.error('Failed to delete person:', err);
    }
  };
  const handleSavePerson = async (data: Omit<Person, 'personID'>, id?: number) => {
    try {
      console.log('handleSavePerson called with:', { id, data });
      if (id !== undefined) {
        console.log('Calling updatePerson with id:', id);
        await updatePerson(id, data);
      } else {
        console.log('Calling addPerson (no id provided)');
        await addPerson(data);
      }
      setShowCreatePersonModal(false);
      await refreshPeople();
    } catch (err) {
      console.error('Failed to save person:', err);
      alert('Failed to save person');
    }
  };

  // Groups CRUD
  const handleAddGroup = () => {
    setEditingGroup(null);
    setShowCreateGroupModal(true);
  };
  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setShowCreateGroupModal(true);
  };
  const handleDeleteGroup = async (id: string) => {
  try {
    // Check for unpaid loans
    const entries = await getAllEntries();
    const hasUnpaidLoan = entries.some(entry => {
      return entry.borrowerGroupId?.toString() === id && entry.amountRemaining > 0;
    });
    if (hasUnpaidLoan) {
      alert('Cannot delete this group because it has unpaid loans.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this group?')) {
      await deleteGroup(parseInt(id));
    }
  } catch (err) {
    console.error('Failed to delete group:', err);
    alert('Failed to delete group');
  }
};


  const handleManageMembers = (groupId: number) => {
    setManageGroupId(groupId);
    setShowManageMembersModal(true);
  };

  const handleRemoveMemberFromGroup = async (groupId: number, personId: string) => {
    try {
      await removeGroupMember(groupId, parseInt(personId));
      await refreshGroups();
    } catch (err) {
      console.error('Failed to remove member:', err);
      alert('Failed to remove member from group');
    }
  };

  const handleSaveGroup = async (data: Omit<Group, 'groupID'>, id?: number) => {
    try {
      if (id !== undefined) {
        await updateGroup(id, data);
      } else {
        await addGroup(data);
      }
      setShowCreateGroupModal(false);
      await refreshGroups();
    } catch (err) {
      console.error('Failed to save group:', err);
      alert('Failed to save group');
    }
  };

  return (
    <div className="people-groups">
      <div className="page-header">
        <h1>People & Groups</h1>
        <button
          className="btn-primary"
          onClick={() => {
            if (activeTab === 'people') handleAddPerson();
            else handleAddGroup();
          }}
        >
          + {activeTab === 'people' ? 'Add Person' : 'Create Group'}
        </button>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'people' ? 'active' : ''}`}
          onClick={() => setActiveTab('people')}
        >
          People
        </button>
        <button
          className={`tab ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          Groups
        </button>
      </div>

      {activeTab === 'people' ? (
        <div className="content-section">
          {people.length === 0 ? (
            <div className="empty-state">
              <p>No people added yet. Add your first contact!</p>
            </div>
          ) : (
            <div className="people-grid">
              {people.map((person) => (
                <div key={person.personID} className="person-card">
                  <h3>{person.firstName} {person.lastName}</h3>
                  <div className="card-actions">
                    <button className="btn-secondary" onClick={() => handleEditPerson(person)}>Edit</button>
                    <button className="btn-danger" onClick={() => handleDeletePerson(person.personID.toString())}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="content-section">
          {groups.length === 0 ? (
            <div className="empty-state">
              <p>No groups created yet. Create your first group!</p>
            </div>
          ) : (
            <div className="groups-list">
              {groups.map((group) => {
                const groupWithMembers = group as Group & { members?: any[] };
                return (
                  <div key={group.groupID} className="group-card">
                    <div className="group-header">
                      <h3>{group.groupName}</h3>
                      {Array.isArray(groupWithMembers.members) && (
                        <span className="member-count">{groupWithMembers.members.length} members</span>
                      )}
                    </div>
                    <div className="members">
                      <strong>Members:</strong>
                      <ul>
                        {Array.isArray(groupWithMembers.members) ? groupWithMembers.members.map((member: any) => (
                          <li key={member.personID}>{member.firstName} {member.lastName}</li>
                        )) : null}
                      </ul>
                      <div style={{display:'flex',gap:'0.5em',marginTop:'0.5em'}}>
                        <button className="btn-secondary btn-add-member" onClick={() => handleAddMember(group.groupID)}>
                          + Add Member
                        </button>
                        <button className="btn-secondary" onClick={() => handleManageMembers(group.groupID)}>Manage Members</button>
                      </div>
                    </div>
                    <div className="card-actions">
                      <button className="btn-secondary" onClick={() => handleEditGroup(group)}>Edit</button>
                      <button className="btn-danger" onClick={() => handleDeleteGroup(group.groupID.toString())}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Person Modal */}
      {showCreatePersonModal && (
        <CreatePersonModal
          isOpen={showCreatePersonModal}
          onClose={() => setShowCreatePersonModal(false)}
          onSave={handleSavePerson}
          initialPerson={editingPerson}
        />
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <CreateGroupModal
          isOpen={showCreateGroupModal}
          onClose={() => setShowCreateGroupModal(false)}
          onSave={handleSaveGroup}
          initialGroup={editingGroup as any}
        />
      )}
      {/* Manage Members Modal */}
      {showManageMembersModal && manageGroupId && (
        <ManageMembersModal
          isOpen={showManageMembersModal}
          onClose={() => { setShowManageMembersModal(false); setManageGroupId(null); }}
          groupMembers={(groups.find(g => g.groupID === manageGroupId) as Group & { members?: Person[] })?.members || []}
          onRemove={(personId: string) => {
            handleRemoveMemberFromGroup(manageGroupId, personId);
          }}
        />
      )}
      {/* Add Member Modal */}
      {showAddMemberModal && addMemberGroupId && (
        <AddMemberModal
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          people={people}
          groupMembers={(groups.find(g => g.groupID === addMemberGroupId) as Group & { members?: Person[] })?.members || []}
          onAdd={handleAddMemberToGroup}
        />
      )}
    </div>
  );
}

export default PeopleAndGroups;