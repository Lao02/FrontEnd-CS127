import React, { useState, useEffect } from 'react';
import { Person } from '../types';
import { useApp } from '../context/AppContext';
import CreatePersonModal from '../components/CreatePersonModal';
import './PeopleList.css';

const PeopleList: React.FC = () => {
  const {people, refreshPeople, deletePerson, addPerson, updatePerson } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  // Load people on mount
  useEffect(() => {
    refreshPeople();
  }, []);

  const handleAdd = () => {
    setEditingPerson(null);
    setModalOpen(true);
  };
  

  const handleEdit = (person: Person) => {
    setEditingPerson(person);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    await deletePerson(id);
  };

  const handleSave = async (data: Omit<Person, 'personID'>, id?: number) => {
  if (id !== undefined) {
    await updatePerson(id, data);
  } else {
    await addPerson(data);
  }
  setModalOpen(false);
};

  return (
    <div className="people-list-container">
      <h1>People</h1>
      <button onClick={handleAdd}>Add Person</button>
      <ul className="people-list">
        {people.map(person => (
          <li key={person.personID} className="person-item">
            <span>{person.firstName} {person.lastName}</span>
            <button onClick={() => handleEdit(person)}>Edit</button>
            <button onClick={() => handleDelete(person.personID)}>Delete</button>
          </li>
        ))}
      </ul>
      <CreatePersonModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialPerson={editingPerson}
      />
    </div>
  );
};

export default PeopleList;
