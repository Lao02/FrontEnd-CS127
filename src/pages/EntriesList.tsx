import React, { useState, useEffect } from 'react';
import { Entry } from '../types';
import CreatePaymentModal from '../components/CreatePaymentModal';
import CreateEntryModal from '../components/CreateEntryModal';
import { useApp } from '../context/AppContext';
import './EntriesList.css';

const EntriesList: React.FC = () => {
  const { entries, people, groups, getAllEntries, deleteEntry, getPaymentsByEntryId, deletePayment } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [payments, setPayments] = useState<{ [entryId: string]: any[] }>({});

  useEffect(() => {
    getAllEntries();
  }, []);

  // Load payments for all entries
  useEffect(() => {
    const fetchPayments = async () => {
      const allPayments: { [entryId: string]: any[] } = {};
      for (const entry of entries) {
        try {
          allPayments[entry.id] = await getPaymentsByEntryId(entry.id);
        } catch (err) {
          allPayments[entry.id] = [];
        }
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
    await deleteEntry(id);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    // Refresh entries after modal closes
    getAllEntries();
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
    await deletePayment(paymentId);
    // Refresh payments for this entry
    try {
      const updatedPayments = await getPaymentsByEntryId(entryId);
      setPayments({
        ...payments,
        [entryId]: updatedPayments,
      });
    } catch (err) {
      setPayments({
        ...payments,
        [entryId]: [],
      });
    }
    // Also refresh entries to get updated status
    getAllEntries();
  };

  const handleSavePayment = async () => {
    setPaymentModalOpen(false);
    if (!currentEntryId) return;
    // Refresh payments for this entry
    try {
      const updatedPayments = await getPaymentsByEntryId(currentEntryId);
      setPayments({
        ...payments,
        [currentEntryId]: updatedPayments,
      });
    } catch (err) {
      setPayments({
        ...payments,
        [currentEntryId]: [],
      });
    }
    // Also refresh entries to get updated status
    getAllEntries();
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
        onClose={handleModalClose}
        initialEntry={editingEntry}
        people={people}
        groups={groups}
      />
      <CreatePaymentModal
        isOpen={paymentModalOpen}
        onClose={handleSavePayment}
        initialPayment={editingPayment}
        people={people}
        entryId={currentEntryId || ''}
      />
    </div>
  );
};

export default EntriesList;
