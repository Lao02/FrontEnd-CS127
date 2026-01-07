import React, { useState } from 'react';
import { PaymentAllocation, Person } from '../types';
import './CreatePaymentAllocationModal.css';

interface CreatePaymentAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (allocation: Omit<PaymentAllocation, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => void;
  initialAllocation?: PaymentAllocation | null;
  people: Person[];
  entryId: string;
  isEditMode?: boolean;
}

const CreatePaymentAllocationModal: React.FC<CreatePaymentAllocationModalProps> = ({ isOpen, onClose, onSave, initialAllocation, people, entryId }) => {
  const [personId, setPersonId] = useState('');
  const [amount, setAmount] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [percent, setPercent] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialAllocation) {
      setPersonId(initialAllocation.payee.personID.toString());
      setAmount(initialAllocation.amount.toString());
      setAmountPaid((initialAllocation.amountPaid || 0).toString());
      setPercent(initialAllocation.percentageOfTotal.toString());
      setDescription(initialAllocation.description || '');
      setNotes(initialAllocation.notes || '');
    } else {
      setPersonId('');
      setAmount('');
      setAmountPaid('0');
      setPercent('');
      setDescription('');
      setNotes('');
    }
    setFormError(null);
  }, [initialAllocation, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!personId) {
      setFormError('Person is required.');
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setFormError('Amount must be a positive number.');
      return;
    }
    if (amountPaid && (isNaN(Number(amountPaid)) || Number(amountPaid) < 0)) {
      setFormError('Amount paid must be a non-negative number.');
      return;
    }
    if (Number(amountPaid) > Number(amount)) {
      setFormError('Amount paid cannot exceed amount due.');
      return;
    }
    if (!percent || isNaN(Number(percent)) || Number(percent) < 0 || Number(percent) > 100) {
      setFormError('Percent must be between 0 and 100.');
      return;
    }
    const payee = people.find(p => p.personID.toString() === personId);
    if (!payee) {
      setFormError('Person not found.');
      return;
    }
    onSave({
      entryId,
      payee,
      amount: parseFloat(amount),
      amountPaid: parseFloat(amountPaid || '0'),
      percentageOfTotal: parseFloat(percent),
      description,
      notes,
      status: 'UNPAID' as any,
    }, initialAllocation?.id);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialAllocation ? 'Edit Allocation' : 'Add Allocation'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">×</button>
        </div>
        {formError && <div className="error-message">{formError}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Person *</label>
            <select value={personId} onChange={e => setPersonId(e.target.value)} required disabled={!!initialAllocation}>
              <option value="">Select...</option>
              {people.map(p => (
                <option key={p.personID} value={p.personID}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Amount Due *</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required disabled={!!initialAllocation} />
          </div>
          <div className="form-group">
            <label>Amount Paid</label>
            <input type="number" min="0" step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} disabled />
            <small style={{ display: 'block', marginTop: '0.3em', color: '#666', fontStyle: 'italic' }}>
              This is automatically updated when payments are made
            </small>
          </div>
          <div className="form-group">
            <label>Percent *</label>
            <input type="number" min="0" max="100" step="0.01" value={percent} onChange={e => setPercent(e.target.value)} required disabled={!!initialAllocation} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{initialAllocation ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePaymentAllocationModal;
