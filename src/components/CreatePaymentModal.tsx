import React, { useState } from 'react';
import { Payment, Person } from '../types';
import './CreatePaymentModal.css';

interface CreatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>, id?: number) => void;
  initialPayment?: Payment | null;
  people: Person[];
  entryId: string;
  termNumber?: number; // For installment entries - which term this payment is for
  suggestedAmount?: number; // For installment entries - amount per term
  suggestedDate?: Date; // For installment entries - due date of the term
  lockedPayee?: Person; // For group expense - locked payee from allocation
  maxPaymentAmount?: number; // For group expense - max amount from allocation
  defaultPayee?: Person; // For non-group expense - default to borrower
}

const CreatePaymentModal: React.FC<CreatePaymentModalProps> = ({ isOpen, onClose, onSave, initialPayment, people, entryId, termNumber, suggestedAmount, suggestedDate, lockedPayee, maxPaymentAmount, defaultPayee }) => {
  const [personId, setPersonId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialPayment) {
      setPersonId(initialPayment.payee.personID.toString());
      setPaymentAmount(initialPayment.paymentAmount.toString());
      // Handle date properly to avoid timezone offset
      if (initialPayment.paymentDate) {
        const d = new Date(initialPayment.paymentDate);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setPaymentDate(`${year}-${month}-${day}`);
      } else {
        setPaymentDate(new Date().toISOString().slice(0, 10));
      }
      setNotes(initialPayment.notes || '');
      setProof(null);
    } else {
      setPersonId(lockedPayee ? lockedPayee.personID.toString() : (defaultPayee ? defaultPayee.personID.toString() : ''));
      setPaymentAmount(suggestedAmount ? suggestedAmount.toString() : '');
      if (suggestedDate) {
        const d = new Date(suggestedDate);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setPaymentDate(`${year}-${month}-${day}`);
      } else {
        setPaymentDate(new Date().toISOString().slice(0, 10));
      }
      setNotes('');
      setProof(null);
    }
    setFormError(null);
  }, [initialPayment, isOpen, suggestedAmount, suggestedDate, lockedPayee, defaultPayee]);

  if (!isOpen) return null;

  const [maxAmount, setMaxAmount] = React.useState<number | null>(null);
  React.useEffect(() => {
    (async () => {
      if (entryId) {
        const entry = await import('../services/entryMockService').then(m => m.entryMockService.getById(entryId));
        if (entry) setMaxAmount(entry.amountRemaining);
      }
    })();
  }, [entryId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!personId) {
      setFormError('Payee is required.');
      return;
    }
    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      setFormError('Amount must be a positive number.');
      return;
    }
    // Use maxPaymentAmount prop if provided (for group expense allocations)
    const effectiveMaxAmount = maxPaymentAmount !== undefined ? maxPaymentAmount : maxAmount;
    if (effectiveMaxAmount !== null && Number(paymentAmount) > effectiveMaxAmount) {
      setFormError('Amount cannot exceed remaining balance (₱' + effectiveMaxAmount.toLocaleString() + ")");
      return;
    }
    const payee = people.find(p => p.personID.toString() === personId);
    if (!payee) {
      setFormError('Payee not found.');
      return;
    }
    onSave({
      entryId,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentAmount: parseFloat(paymentAmount),
      payee,
      termNumber,
      proof: proof ? proof as Blob : undefined,
      notes,
    }, initialPayment?.id);
  };

  React.useEffect(() => {
  }, [people]);
  if (window && window.location && entryId && people.length > 0) {
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialPayment ? 'Edit Payment' : 'Add Payment'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">×</button>
        </div>
        {formError && <div className="error-message">{formError}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Payee *</label>
            <select value={personId} onChange={e => setPersonId(e.target.value)} required disabled={!!lockedPayee || !!initialPayment}>
              <option value="">Select...</option>
              {people.map(p => (
                <option key={p.personID} value={p.personID}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
            {lockedPayee && (
              <small style={{ display: 'block', marginTop: '0.5em', color: '#666', fontStyle: 'italic' }}>
                Payee is locked for this allocation payment
              </small>
            )}
          </div>
          <div className="form-group">
            <label>Payment Date *</label>
            <input
              type="date"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              readOnly={!!termNumber && !!suggestedDate || !!initialPayment}
              required
            />
            {termNumber && suggestedDate && <small>Fixed date for Term {termNumber}</small>}
          </div>
          <div className="form-group">
            <label>Amount *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={paymentAmount}
              max={maxPaymentAmount !== undefined ? maxPaymentAmount.toString() : (maxAmount !== null ? maxAmount.toString() : undefined)}
              readOnly={!!termNumber && !!suggestedAmount}
              disabled={!!initialPayment}
              onChange={e => {
                const effectiveMaxAmount = maxPaymentAmount !== undefined ? maxPaymentAmount : maxAmount;
                if (effectiveMaxAmount !== null && Number(e.target.value) > effectiveMaxAmount) {
                  setPaymentAmount(effectiveMaxAmount.toString());
                } else {
                  setPaymentAmount(e.target.value);
                }
              }}
              required
            />
            {maxPaymentAmount !== undefined && (
              <small style={{ display: 'block', marginTop: '0.3em', color: '#666' }}>
                Maximum amount due: ₱{maxPaymentAmount.toLocaleString()}
              </small>
            )}
            {maxAmount !== null && !termNumber && maxPaymentAmount === undefined && <small>Max: ₱{maxAmount.toLocaleString()}</small>}
            {termNumber && suggestedAmount && <small>Fixed amount for Term {termNumber}</small>}
          </div>
          <div className="form-group">
            <label>Proof (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => setProof(e.target.files?.[0] || null)}
            />
            <small>Photo/s showing the payment (e.g. EWallet screenshot)</small>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            {initialPayment ? (
              <button type="submit" className="btn-primary">Confirm</button>
            ) : (
              <button type="submit" className="btn-primary">Create</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePaymentModal;
