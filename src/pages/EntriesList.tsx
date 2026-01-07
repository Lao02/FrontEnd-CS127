import React, { useState, useEffect } from 'react';
import { Entry, Person, Group } from '../types';
import { entryMockService } from '../services/entryMockService';
import { paymentMockService } from '../services/paymentMockService';
import CreatePaymentModal from '../components/CreatePaymentModal';
import CreateEntryModal from '../components/CreateEntryModal';
import { personMockService } from '../services/personMockService';
import { groupMockService } from '../services/groupMockService';
import './EntriesList.css';

const EntriesList: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [payments, setPayments] = useState<{ [entryId: string]: any[] }>({});

  useEffect(() => {
    entryMockService.getAll().then(setEntries);
    personMockService.getAll().then(setPeople);
    groupMockService.getAll().then(setGroups);
  }, []);

  const refreshGroups = async () => {
    setGroups(await groupMockService.getAll());
  };

  // Load payments for all entries
  useEffect(() => {
    const fetchPayments = async () => {
      const allPayments: { [entryId: string]: any[] } = {};
      for (const entry of entries) {
        allPayments[entry.id] = await paymentMockService.getByEntryId(entry.id);
      }
      setPayments(allPayments);
    };
    if (entries.length > 0) fetchPayments();
  }, [entries]);

  const handleAdd = () => {
    setEditingEntry(null);
    setModalOpen(true);
  };

  const handleEdit = (entry: Entry) => {
    setEditingEntry(entry);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    await entryMockService.delete(id);
    setEntries(await entryMockService.getAll());
  };

  const handleSave = async (data: Omit<Entry, 'id' | 'referenceId' | 'createdAt' | 'updatedAt'>, id?: string) => {
    if (id) {
      await entryMockService.update(id, data);
    } else {
      await entryMockService.create(data);
    }
    setEntries(await entryMockService.getAll());
    setModalOpen(false);
  };

  const handleAddPayment = (entryId: string) => {
    setCurrentEntryId(entryId);
    setEditingPayment(null);
    setPaymentModalOpen(true);
  };

  const handleEditPayment = (payment: any, entryId: string) => {
    setCurrentEntryId(entryId);
    setEditingPayment(payment);
    setPaymentModalOpen(true);
  };

  const handleDeletePayment = async (paymentId: number, entryId: string) => {
    await paymentMockService.delete(paymentId);
    setPayments({
      ...payments,
      [entryId]: await paymentMockService.getByEntryId(entryId),
    });
  };

  const handleSavePayment = async (data: any, id?: number) => {
    if (!currentEntryId) return;
    if (id) {
      await paymentMockService.update(id, data);
    } else {
      await paymentMockService.create(data);
    }
    setPayments({
      ...payments,
      [currentEntryId]: await paymentMockService.getByEntryId(currentEntryId),
    });
    setPaymentModalOpen(false);
  };

  return (
    <div className="entries-list-container">
      <h1>Entries</h1>
      <button onClick={handleAdd}>Add Entry</button>
      <ul className="entries-list">
        {entries.map(entry => (
          <li key={entry.id} className="entry-item">
            <span>{entry.entryName}</span>
            <button onClick={() => handleEdit(entry)}>Edit</button>
            <button onClick={() => handleDelete(entry.id)}>Delete</button>
            <div className="payments-section">
              <h4>Payments</h4>
              <button onClick={() => handleAddPayment(entry.id)}>Add Payment</button>
              <ul className="payments-list">
                {(payments[entry.id] || []).map(payment => (
                  <li key={payment.id} className="payment-item">
                    <span>{payment.paymentAmount} on {new Date(payment.paymentDate).toLocaleDateString()}</span>
                    <button onClick={() => handleEditPayment(payment, entry.id)}>Edit</button>
                    <button onClick={() => handleDeletePayment(payment.id, entry.id)}>Delete</button>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
      <CreateEntryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialEntry={editingEntry}
        people={people}
        groups={groups}
        onGroupsUpdated={refreshGroups}
      />
      <CreatePaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSave={handleSavePayment}
        initialPayment={editingPayment}
        people={people}
        entryId={currentEntryId || ''}
      />
    </div>
  );
};

export default EntriesList;
