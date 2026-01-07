import React, { useState, useEffect } from 'react';
import { Entry, TransactionType, Person, Group, PaymentFrequency } from '../types';
import { useApp } from '../context/AppContext';
import './CreateEntryModal.css';

interface CreateEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEntry?: Entry | null;
  people: Person[];
  groups: Group[];
  formRef?: React.RefObject<HTMLFormElement>;
  hasPayments?: boolean;
}

const CreateEntryModal: React.FC<CreateEntryModalProps> = ({ isOpen, onClose, initialEntry, people, groups, formRef, hasPayments = false }) => {
  const { addEntry, updateEntry } = useApp();
  const [entryName, setEntryName] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.STRAIGHT);
  const [borrowerId, setBorrowerId] = useState('');
  const [lenderId, setLenderId] = useState('');
  const [amountBorrowed, setAmountBorrowed] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [dateBorrowed, setDateBorrowed] = useState('');
  const [dateFullyPaid, setDateFullyPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  // Installment fields
  const [startDate, setStartDate] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>(PaymentFrequency.MONTHLY);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [paymentAmountPerTerm, setPaymentAmountPerTerm] = useState('');
  // Group allocation fields
  const [paymentAllocations, setPaymentAllocations] = useState<any[]>([]);
  const [allocationMode, setAllocationMode] = useState<'equal' | 'percent' | 'amount' | ''>('');
  const [allocationWarning, setAllocationWarning] = useState<string | null>(null);

  useEffect(() => {
    if (initialEntry) {
      setEntryName(initialEntry.entryName);
      setTransactionType(initialEntry.transactionType);
      setBorrowerId(initialEntry.borrowerId?.toString() || '');
      setLenderId(initialEntry.lenderId?.toString() || '');
      setAmountBorrowed(initialEntry.amountBorrowed.toString());
      setDescription(initialEntry.description || '');
      setDateBorrowed(initialEntry.dateBorrowed ? new Date(initialEntry.dateBorrowed).toISOString().slice(0, 10) : '');
      setDateFullyPaid(initialEntry.dateFullyPaid ? new Date(initialEntry.dateFullyPaid).toISOString().slice(0, 10) : '');
      setNotes(initialEntry.notes || '');
      // Handle existing image - use imageProofs from backend
      setExistingImageUrl(null);
      setImageFile(null);
      if (initialEntry.startDate) {
        setStartDate(new Date(initialEntry.startDate).toISOString().slice(0, 10));
        setPaymentFrequency(initialEntry.paymentFrequency || PaymentFrequency.MONTHLY);
        setPaymentTerms(initialEntry.paymentTerms?.toString() || '');
        setPaymentAmountPerTerm(initialEntry.paymentAmountPerTerm?.toString() || '');
      }
      if (initialEntry.paymentAllocations) {
        setPaymentAllocations(initialEntry.paymentAllocations);
      }
    } else {
      setEntryName('');
      setTransactionType(TransactionType.STRAIGHT);
      setBorrowerId('');
      setLenderId('');
      setAmountBorrowed('');
      setDescription('');
      setDateBorrowed('');
      setDateFullyPaid('');
      setNotes('');
      setStartDate('');
      setPaymentFrequency(PaymentFrequency.MONTHLY);
      setPaymentTerms('');
      setPaymentAmountPerTerm('');
      setPaymentAllocations([]);
      setImageFile(null);
      setExistingImageUrl(null);
    }
    setFormError(null);
  }, [initialEntry, isOpen]);

  // Auto-clear lender if borrower is changed to match lender (for individual borrowers)
  useEffect(() => {
    if (transactionType !== TransactionType.GROUP && borrowerId && lenderId && borrowerId === lenderId) {
      setLenderId('');
      setFormError('Borrower and lender cannot be the same person. Lender has been cleared.');
      setTimeout(() => setFormError(null), 3000);
    }
  }, [borrowerId, lenderId, transactionType]);

  // Auto-calculate paymentAmountPerTerm when amountBorrowed or paymentTerms change (for installment)
  useEffect(() => {
    if (transactionType === TransactionType.INSTALLMENT && amountBorrowed && paymentTerms) {
      const amt = parseFloat(amountBorrowed);
      const terms = parseInt(paymentTerms);
      if (amt > 0 && terms > 0) {
        setPaymentAmountPerTerm((amt / terms).toFixed(2));
      } else {
        setPaymentAmountPerTerm('');
      }
    }
  }, [amountBorrowed, paymentTerms, transactionType]);

const [groupMembers, setGroupMembers] = useState<Person[]>([]);
useEffect(() => {
  if (transactionType === TransactionType.GROUP && borrowerId) {
    // Find the group from the groups prop (which comes from AppContext)
    const selectedGroup = groups.find(g => g.groupID.toString() === borrowerId);
    if (selectedGroup && 'members' in selectedGroup) {
      setGroupMembers((selectedGroup as any).members || []);
    } else {
      setGroupMembers([]);
    }
  } else {
    setGroupMembers([]);
  }
}, [transactionType, borrowerId, groups]);

  // Allocation logic
  useEffect(() => {
    if (transactionType === TransactionType.GROUP && groupMembers.length && amountBorrowed && allocationMode) {
      const amt = parseFloat(amountBorrowed);
      if (allocationMode === 'equal') {
        // Calculate equal distribution - everyone gets the same amount rounded up
        const memberCount = groupMembers.length;
        const amountPerPerson = Math.ceil((amt / memberCount) * 100) / 100; // Round up to 2 decimals
        
        // Distribute amounts - everyone gets the same amount (base + remainder)
        const allocations = groupMembers.map((m: Person) => {
          const percent = +((amountPerPerson / amt) * 100).toFixed(2);
          
          return {
            groupMemberDto: m,
            groupMemberPersonId: m.personID,
            borrowerGroupId: parseInt(borrowerId), // Will be set from borrowerId (which is groupId for GROUP type)
            groupExpenseEntryId: '', // Will be set by backend
            allocationId: 0, // Temp, backend assigns
            amount: amountPerPerson,
            amountPaid: 0,
            percent: percent,
            paymentAllocationStatus: 'UNPAID' as any,
            description: '',
            notes: '',
          };
        });
        
        setPaymentAllocations(allocations);
        setAllocationWarning(null);
      } else if (allocationMode === 'percent') {
        // Keep user input for percent, but auto compute amount
        setPaymentAllocations(prev => groupMembers.map((m: Person, i: number) => {
          const prevAlloc = prev[i] || { percent: 0, description: '', notes: '' };
          const percent = prevAlloc.percent || 0;
          return {
            groupMemberDto: m,
            groupMemberPersonId: m.personID,
            borrowerGroupId: parseInt(borrowerId),
            groupExpenseEntryId: '',
            allocationId: 0,
            amount: +(amt * (percent / 100)).toFixed(2),
            amountPaid: 0,
            percent: percent,
            paymentAllocationStatus: 'UNPAID' as any,
            description: prevAlloc.description || '',
            notes: prevAlloc.notes || '',
          };
        }));
      } else if (allocationMode === 'amount') {
        // Keep user input for amount, auto compute percent
        setPaymentAllocations(prev => groupMembers.map((m: Person, i: number) => {
          const prevAlloc = prev[i] || { amount: 0, description: '', notes: '' };
          const amount = prevAlloc.amount || 0;
          return {
            groupMemberDto: m,
            groupMemberPersonId: m.personID,
            borrowerGroupId: parseInt(borrowerId),
            groupExpenseEntryId: '',
            allocationId: 0,
            amount: amount,
            amountPaid: 0,
            percent: amt ? +(100 * (amount / amt)).toFixed(2) : 0,
            paymentAllocationStatus: 'UNPAID' as any,
            description: prevAlloc.description || '',
            notes: prevAlloc.notes || '',
          };
        }));
      }
    }
    // eslint-disable-next-line
  }, [allocationMode, groupMembers.length, amountBorrowed, borrowerId]);

  // Allocation validation
  useEffect(() => {
    if (transactionType === TransactionType.GROUP && allocationMode && paymentAllocations.length) {
      const amt = parseFloat(amountBorrowed) || 0;
      if (allocationMode === 'percent') {
        const totalPercent = paymentAllocations.reduce((sum, a) => sum + (+a.percent || 0), 0);
        if (totalPercent < 100) setAllocationWarning('Total percent is less than 100%.');
        else if (totalPercent > 100) setAllocationWarning('Warning: Total percent exceeds 100%.');
        else setAllocationWarning(null);
      } else if (allocationMode === 'amount') {
        const totalAmount = paymentAllocations.reduce((sum, a) => sum + (+a.amount || 0), 0);
        if (totalAmount < amt) setAllocationWarning('Total amount is less than borrowed amount.');
        else if (totalAmount > amt) setAllocationWarning('Warning: Total amount exceeds borrowed amount.');
        else setAllocationWarning(null);
      } else {
        setAllocationWarning(null);
      }
    } else {
      setAllocationWarning(null);
    }
    // eslint-disable-next-line
  }, [paymentAllocations, allocationMode, amountBorrowed]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    // Validation
    if (!entryName.trim()) {
      setFormError('Entry name is required.');
      return;
    }
    if (!borrowerId) {
      setFormError('Borrower is required.');
      return;
    }
    if (!lenderId) {
      setFormError('Lender is required.');
      return;
    }
    // Validate borrower cannot be lender (for person borrowers)
    if (transactionType !== TransactionType.GROUP && borrowerId === lenderId) {
      setFormError('Borrower and lender cannot be the same person.');
      return;
    }
    if (!amountBorrowed.trim() || isNaN(Number(amountBorrowed)) || Number(amountBorrowed) <= 0) {
      setFormError('Amount borrowed must be a positive number.');
      return;
    }
    if (transactionType === TransactionType.INSTALLMENT) {
      if (!startDate) {
        setFormError('Installment start date is required.');
        return;
      }
      if (!paymentTerms || isNaN(Number(paymentTerms)) || Number(paymentTerms) <= 0) {
        setFormError('Payment terms must be a positive number.');
        return;
      }
      if (!paymentAmountPerTerm || isNaN(Number(paymentAmountPerTerm)) || Number(paymentAmountPerTerm) <= 0) {
        setFormError('Payment amount per term must be a positive number.');
        return;
      }
    }

    try {
      // Build FormData for backend
      const formData = new FormData();
      formData.append('entryName', entryName);
      formData.append('description', description);
      formData.append('transactionType', transactionType); // Now matches backend enum directly
      formData.append('lenderId', lenderId);
      formData.append('borrowerId', borrowerId);
      formData.append('amountBorrowed', amountBorrowed);
      formData.append('notes', notes);
      
      if (dateBorrowed) {
        formData.append('dateBorrowed', dateBorrowed);
      }
      
      if (imageFile) {
        formData.append('imageFiles', imageFile);
      }
      
      // For installment expense
      if (transactionType === TransactionType.INSTALLMENT) {
        if (startDate) formData.append('startDate', startDate);
        formData.append('paymentFrequency', paymentFrequency);
        if (paymentTerms) formData.append('paymentTerms', paymentTerms);
        if (paymentAmountPerTerm) formData.append('paymentAmountPerTerm', paymentAmountPerTerm);
      }
      
      // For group expense - need to send borrowerGroupId instead of borrowerId
      if (transactionType === TransactionType.GROUP) {
        // Remove borrowerId for group expense, use borrowerGroupId
        formData.delete('borrowerId');
        formData.append('borrowerGroupId', borrowerId); // borrowerId is actually groupId for GROUP type
        
        // Add allocations if any
        if (paymentAllocations.length > 0) {
          paymentAllocations.forEach((allocation, index) => {
            formData.append(`allocations[${index}].groupMemberPersonId`, allocation.groupMemberPersonId.toString());
            formData.append(`allocations[${index}].amount`, allocation.amount.toString());
            formData.append(`allocations[${index}].percent`, allocation.percent.toString());
            formData.append(`allocations[${index}].description`, allocation.description || '');
            if (allocation.notes) {
              formData.append(`allocations[${index}].notes`, allocation.notes);
            }
          });
        }
      }
      
      if (initialEntry) {
        // Update existing entry
        await updateEntry(initialEntry.id, formData);
      } else {
        // Create new entry
        await addEntry(formData);
      }
      
      // Only close modal if successful (no error thrown)
      onClose();
    } catch (error) {
      // Error is displayed via formError state, don't close modal
      setFormError(error instanceof Error ? error.message : 'Failed to save entry');
    }
  };

  const isEditing = !!initialEntry;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialEntry ? 'Edit Entry' : 'Create Entry'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">×</button>
        </div>
        {formError && <div className="error-message">{formError}</div>}
        <form onSubmit={handleSubmit} ref={formRef}>
          <div className="form-group">
            <label>Entry Name *</label>
            <input type="text" value={entryName} onChange={e => setEntryName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Transaction Type *</label>
            <select value={transactionType} onChange={e => setTransactionType(e.target.value as TransactionType)} disabled={isEditing}>
              <option value={TransactionType.STRAIGHT}>Straight Expense</option>
              <option value={TransactionType.INSTALLMENT}>Installment Expense</option>
              <option value={TransactionType.GROUP}>Group Expense</option>
            </select>
          </div>
          <div className="form-group">
            <label>{transactionType === TransactionType.GROUP ? 'Group Borrower *' : 'Borrower *'}</label>
            {transactionType === TransactionType.GROUP ? (
              <>
                <select value={borrowerId} onChange={e => setBorrowerId(e.target.value)} required disabled={hasPayments}>
                  <option value="">Select group...</option>
                  {groups && groups.length > 0 && groups.map(g => <option key={g.groupID} value={g.groupID}>{g.groupName}</option>)}
                </select>
                {borrowerId && (
                  <div className="group-members-list" style={{ marginTop: '1em', padding: '1em', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                    <strong>Group Members:</strong>
                    <ul style={{ marginTop: '0.5em', paddingLeft: '1.5em' }}>
                      {groupMembers.length > 0 ? groupMembers.map((m: Person) => (
                        <li key={m.personID} style={{ padding: '0.3em 0' }}>
                          {m.firstName} {m.lastName}
                        </li>
                      )) : <li style={{color:'#888'}}>No members in this group.</li>}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <select value={borrowerId} onChange={e => setBorrowerId(e.target.value)} required disabled={hasPayments}>
                <option value="">Select person...</option>
                {people && people.length > 0 && people.map(p => <option key={p.personID} value={p.personID}>{p.firstName} {p.lastName}</option>)}
              </select>
            )}
          </div>
          <div className="form-group">
            <label>Lender *</label>
            <select value={lenderId} onChange={e => setLenderId(e.target.value)} required>
              <option value="">Select person...</option>
              {people && people.length > 0 && people
                .filter(p => {
                  // For individual borrowers, exclude the selected borrower from lender options
                  if (transactionType !== TransactionType.GROUP && borrowerId) {
                    return p.personID.toString() !== borrowerId;
                  }
                  // For group expense, exclude all group members from lender options
                  if (transactionType === TransactionType.GROUP && groupMembers.length > 0) {
                    return !groupMembers.some(m => m.personID.toString() === p.personID.toString());
                  }
                  return true;
                })
                .map(p => <option key={p.personID} value={p.personID}>{p.firstName} {p.lastName}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Amount Borrowed *</label>
            <input type="number" min="0" step="0.01" value={amountBorrowed} onChange={e => setAmountBorrowed(e.target.value)} required disabled={hasPayments} />
          </div>
          <div className="form-group">
            <label>Date Borrowed</label>
            <input type="date" value={dateBorrowed} onChange={e => setDateBorrowed(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Date Fully Paid</label>
            <input type="date" value={dateFullyPaid} onChange={e => setDateFullyPaid(e.target.value)} disabled />
            <small style={{ display: 'block', marginTop: '0.3em', color: '#666', fontStyle: 'italic' }}>
              This field is automatically set when all payments are completed
            </small>
          </div>
          <div className="form-group">
            <label>Proof of Loan (Optional)</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  setImageFile(file);
                  if (existingImageUrl) {
                    URL.revokeObjectURL(existingImageUrl);
                  }
                  setExistingImageUrl(URL.createObjectURL(file));
                }
              }} 
            />
            {existingImageUrl && (
              <div style={{ marginTop: '0.5em' }}>
                <img src={existingImageUrl} alt="Proof of loan" style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain' }} />
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ marginLeft: '0.5em', padding: '0.2em 0.5em', fontSize: '0.9em' }}
                  onClick={() => {
                    setImageFile(null);
                    if (existingImageUrl) {
                      URL.revokeObjectURL(existingImageUrl);
                    }
                    setExistingImageUrl(null);
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          {/* Image file upload removed (unused) */}
          {transactionType === TransactionType.INSTALLMENT && (
            <>
              <div className="form-group">
                <label>Installment Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={hasPayments} />
              </div>
              <div className="form-group">
                <label>Payment Frequency</label>
                <select value={paymentFrequency} onChange={e => setPaymentFrequency(e.target.value as PaymentFrequency)} disabled={hasPayments}>
                  <option value={PaymentFrequency.MONTHLY}>Monthly</option>
                  <option value={PaymentFrequency.WEEKLY}>Weekly</option>
                </select>
              </div>
              <div className="form-group">
                <label>Payment Terms</label>
                <input type="number" min="1" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} disabled={hasPayments} />
              </div>
              <div className="form-group">
                <label>Payment Amount Per Term</label>
                <input type="number" min="0" step="0.01" value={paymentAmountPerTerm} onChange={e => setPaymentAmountPerTerm(e.target.value)} disabled={isEditing} />
              </div>
            </>
          )}
          {transactionType === TransactionType.GROUP && groupMembers.length > 0 && (
            <>
              <div className="form-group">
                <label>Payment Allocation Mode *</label>
                <div className="allocation-modes">
                  <label><input type="radio" name="allocMode" value="equal" checked={allocationMode === 'equal'} onChange={() => setAllocationMode('equal')} disabled={hasPayments} /> Divide Equally</label>
                  <label><input type="radio" name="allocMode" value="percent" checked={allocationMode === 'percent'} onChange={() => setAllocationMode('percent')} disabled={hasPayments} /> Divide by Percent</label>
                  <label><input type="radio" name="allocMode" value="amount" checked={allocationMode === 'amount'} onChange={() => setAllocationMode('amount')} disabled={hasPayments} /> Divide by Amount</label>
                </div>
              </div>
              {allocationMode && (
                <div className="form-group">
                  <label>Payment Allocations</label>
                  <table className="alloc-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Percent</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentAllocations.map((alloc, i) => (
                        <tr key={alloc.groupMemberDto.personID}>
                          <td>{alloc.groupMemberDto.firstName} {alloc.groupMemberDto.lastName}</td>
                          <td><input type="text" value={alloc.description} onChange={e => setPaymentAllocations(p => p.map((a, j) => j === i ? { ...a, description: e.target.value } : a))} disabled={hasPayments} /></td>
                          <td>
                            {allocationMode === 'amount' ? (
                              <input 
                                type="number" 
                                min="0" 
                                step="0.01" 
                                value={alloc.amount} 
                                onChange={e => {
                                  const newAmount = +e.target.value;
                                  const totalAmount = parseFloat(amountBorrowed);
                                  const newPercent = totalAmount > 0 ? +((newAmount / totalAmount) * 100).toFixed(2) : 0;
                                  setPaymentAllocations(p => p.map((a, j) => j === i ? { ...a, amount: newAmount, percent: newPercent } : a));
                                }} 
                                disabled={hasPayments} 
                              />
                            ) : (
                              alloc.amount
                            )}
                          </td>
                          <td>
                            {allocationMode === 'percent' ? (
                              <input 
                                type="number" 
                                min="0" 
                                max="100" 
                                step="0.01" 
                                value={alloc.percent} 
                                onChange={e => {
                                  const newPercent = +e.target.value;
                                  const totalAmount = parseFloat(amountBorrowed);
                                  const newAmount = +(totalAmount * (newPercent / 100)).toFixed(2);
                                  setPaymentAllocations(p => p.map((a, j) => j === i ? { ...a, percent: newPercent, amount: newAmount } : a));
                                }} 
                                disabled={hasPayments} 
                              />
                            ) : (
                              alloc.percent
                            )}
                          </td>
                          <td><input type="text" value={alloc.notes} onChange={e => setPaymentAllocations(p => p.map((a, j) => j === i ? { ...a, notes: e.target.value } : a))} disabled={hasPayments} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {allocationWarning && <div className={allocationWarning.startsWith('Warning') ? 'warning-message' : 'error-message'}>{allocationWarning}</div>}
                </div>
              )}
            </>
          )}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">
              {initialEntry ? 'Confirm' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEntryModal;