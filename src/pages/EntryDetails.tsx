import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Entry, Person, Payment, PaymentAllocation, InstallmentStatus } from '../types';
import { useApp } from '../context/AppContext';
import CreateEntryModal from '../components/CreateEntryModal';
import CreatePaymentModal from '../components/CreatePaymentModal';
import CreatePaymentAllocationModal from '../components/CreatePaymentAllocationModal';
import './EntryDetails.css';

function EntryDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { people, groups, getEntryById, deleteEntry, getPaymentsByEntryId, updateEntry } = useApp();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // Payment Allocation (for group entries)
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [editingAlloc, setEditingAlloc] = useState<PaymentAllocation | null>(null);
  const [currentTermNumber, setCurrentTermNumber] = useState<number | undefined>(undefined);
  const [editingTermNotes, setEditingTermNotes] = useState<{ [key: number]: boolean }>({});
  const [termNotesValues, setTermNotesValues] = useState<{ [key: number]: string }>({});
  const [paymentFromAllocation, setPaymentFromAllocation] = useState<PaymentAllocation | null>(null);

  // Installment term payment/skip handlers
  const handleAddInstallmentPayment = async (termIdx: number) => {
    if (!entry || !entry.installmentDetails) return;
    // Open payment modal with term number and suggested amount
    setCurrentTermNumber(termIdx + 1); // termNumber is 1-indexed
    setShowPaymentModal(true);
  };

  const handleSkipInstallmentTerm = async (termIdx: number) => {
    if (!entry || !entry.installmentDetails) return;
    
    // Mark current term as skipped
    const updatedTerms = entry.installmentDetails.terms.map((t: typeof entry.installmentDetails.terms[0], i: number) =>
      i === termIdx
        ? {
            ...t,
            skipped: true,
            status: InstallmentStatus.SKIPPED,
          }
        : t
    );
    
    // Add a new term at the end
    const lastTerm = updatedTerms[updatedTerms.length - 1];
    const newDueDate = new Date(lastTerm.dueDate);
    
    // Calculate next due date based on payment frequency
    if (entry.installmentDetails.paymentFrequency === 'Monthly') {
      newDueDate.setMonth(newDueDate.getMonth() + 1);
    } else if (entry.installmentDetails.paymentFrequency === 'Weekly') {
      newDueDate.setDate(newDueDate.getDate() + 7);
    }
    newDueDate.setHours(0, 0, 0, 0);
    
    const newTerm = {
      termNumber: updatedTerms.length + 1,
      dueDate: newDueDate,
      status: InstallmentStatus.NOT_STARTED,
      skipped: false,
      delinquent: false,
      notes: '',
    };
    
    updatedTerms.push(newTerm);
    
    const updatedEntry = {
      ...entry,
      installmentDetails: {
        ...entry.installmentDetails,
        terms: updatedTerms,
        paymentTerms: updatedTerms.length, // Update total terms count
      },
    };
    
    // Build FormData with installmentDetails
    const formData = new FormData();
    formData.append('installmentDetails', JSON.stringify(updatedEntry.installmentDetails));
    
    try {
      await updateEntry(entry.id, formData);
      setEntry(updatedEntry);
      setModalSuccess('Term ' + (termIdx + 1) + ' skipped. A new term has been added.');
      setTimeout(() => setModalSuccess(null), 2000);
    } catch (err) {
      setModalError('Failed to skip term');
    }
  };

  const handleSaveTermNotes = async (termIdx: number) => {
    if (!entry || !entry.installmentDetails) return;
    
    const updatedTerms = entry.installmentDetails.terms.map((t, i) =>
      i === termIdx
        ? { ...t, notes: termNotesValues[termIdx] || '' }
        : t
    );
    
    const updatedEntry = {
      ...entry,
      installmentDetails: {
        ...entry.installmentDetails,
        terms: updatedTerms,
      },
    };
    
    // Build FormData
    const formData = new FormData();
    formData.append('installmentDetails', JSON.stringify(updatedEntry.installmentDetails));
    
    try {
      await updateEntry(entry.id, formData);
      setEntry(updatedEntry);
      setEditingTermNotes({ ...editingTermNotes, [termIdx]: false });
      setModalSuccess('Term notes saved successfully.');
      setTimeout(() => setModalSuccess(null), 1500);
    } catch (err) {
      setModalError('Failed to save term notes');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        try {
          const fetchedEntry = await getEntryById(id);
          setEntry(fetchedEntry);
          const fetchedPayments = await getPaymentsByEntryId(id);
          setPayments(fetchedPayments);
        } catch (err) {
          console.error('Failed to load entry or payments:', err);
          setEntry(null);
          setPayments([]);
        }
      }
    };
    loadData();
  }, [id, getEntryById, getPaymentsByEntryId]);

  // Payment handlers
  const handleAddPayment = () => {
    setCurrentTermNumber(undefined); // Clear term number for general payments
    setShowPaymentModal(true);
  };

  const handleSavePayment = async () => {
    setModalError(null);
    try {
      // Payment is handled by CreatePaymentModal using AppContext
      // Just close modal and refresh data
      if (id) {
        // Refresh entry and payments
        const updatedEntry = await getEntryById(id);
        setEntry(updatedEntry);
        const updatedPayments = await getPaymentsByEntryId(id);
        setPayments(updatedPayments);
        setModalSuccess('Payment added successfully!');
      }
      setShowPaymentModal(false);
      setCurrentTermNumber(undefined);
      setPaymentFromAllocation(null);
      setTimeout(() => setModalSuccess(null), 1500);
    } catch (err) {
      setModalError('Failed to refresh after payment');
    }
  };

  // Payment Allocation handlers (simulate in-memory)
  const handlePayFromAllocation = (alloc: PaymentAllocation) => {
    // Store allocation details and open payment modal
    setPaymentFromAllocation(alloc);
    setCurrentTermNumber(undefined);
    setShowPaymentModal(true);
  };

  const handleEditAlloc = (alloc: PaymentAllocation) => {
    setEditingAlloc(alloc);
    setShowAllocModal(true);
  };
  
  const handleSaveAlloc: (
    allocation: Omit<PaymentAllocation, 'id' | 'createdAt' | 'updatedAt'>,
    id?: string
  ) => void = async (alloc, allocId) => {
    setModalError(null);
    try {
      if (entry) {
        let updatedAllocations: PaymentAllocation[] = entry.paymentAllocations ? [...entry.paymentAllocations] : [];
        if (allocId) {
          // Edit - only update description and notes
          updatedAllocations = updatedAllocations.map((a: PaymentAllocation) => 
            a.id === allocId 
              ? { ...a, description: alloc.description, notes: alloc.notes, updatedAt: new Date() } 
              : a
          );
          setModalSuccess('Allocation updated successfully!');
        } else {
          // Add
          const now = new Date();
          updatedAllocations.push({ ...alloc, id: Date.now().toString(), createdAt: now, updatedAt: now });
          setModalSuccess('Allocation added successfully!');
        }
        
        // Update entry with new allocations
        const formData = new FormData();
        formData.append('paymentAllocations', JSON.stringify(updatedAllocations));
        await updateEntry(entry.id, formData);
        
        setEntry({ ...entry, paymentAllocations: updatedAllocations });
        setShowAllocModal(false);
        setTimeout(() => setModalSuccess(null), 1500);
      }
    } catch (err) {
      setModalError('Failed to save allocation');
    }
  };

  if (!entry) {
    return (
      <div className="entry-details">
        <p>Loading entry...</p>
      </div>
    );
  }

  const handleEdit = () => {
    setModalError(null);
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    setDeleteLoading(true);
    setModalError(null);
    try {
      if (entry) {
        await deleteEntry(entry.id);
        setModalSuccess('Entry deleted successfully!');
        setTimeout(() => navigate('/'), 1000);
      }
    } catch (err: any) {
      setModalError('Failed to delete entry');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditModalClose = () => {
    setShowEditModal(false);
    // Refresh entry after modal closes
    if (id) {
      getEntryById(id).then((e: Entry) => setEntry(e)).catch(() => setEntry(null));
    }
  };

  return (
    <div className="entry-details">
      <div className="page-header">
        <h1>Entry Details</h1>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleEdit}>Edit</button>
          <button className="btn-danger" onClick={handleDelete} disabled={deleteLoading}>Delete</button>
        </div>
      </div>
      {modalError && <div className="error-message">{modalError}</div>}
      {modalSuccess && <div className="success-message">{modalSuccess}</div>}
      {showEditModal && (
        <CreateEntryModal
          isOpen={showEditModal}
          onClose={handleEditModalClose}
          initialEntry={entry}
          people={people}
          groups={groups}
          hasPayments={payments.length > 0}
          key={entry?.id || 'edit-modal'}
        />
      )}

      {/* Entry Details Section */}
      <section className="details-section">
        <h2>Entry Information</h2>
        <div className="details-grid">
          <div className="detail-item">
            <label>Entry Name:</label>
            <span>{entry.entryName}</span>
          </div>
          <div className="detail-item">
            <label>Transaction Type:</label>
            <span>{entry.transactionType}</span>
          </div>
          <div className="detail-item">
            <label>Borrower:</label>
            <span>
              {typeof entry.borrower === 'object' && 'groupName' in entry.borrower
                ? entry.borrower.groupName
                : typeof entry.borrower === 'object' && 'firstName' in entry.borrower
                  ? `${entry.borrower.firstName} ${entry.borrower.lastName}`
                  : entry.borrower}
            </span>
          </div>
          <div className="detail-item">
            <label>Lender:</label>
            <span>
              {typeof entry.lender === 'object' && 'firstName' in entry.lender
                ? `${entry.lender.firstName} ${entry.lender.lastName}`
                : entry.lender}
            </span>
          </div>
          <div className="detail-item">
            <label>Amount Borrowed:</label>
            <span>₱{entry.amountBorrowed.toLocaleString()}</span>
          </div>
          <div className="detail-item">
            <label>Amount Remaining:</label>
            <span>₱{entry.amountRemaining.toLocaleString()}</span>
          </div>
          <div className="detail-item">
            <label>Status:</label>
            <span className={`status-badge status-${typeof entry.status === 'string' ? entry.status.toLowerCase() : ''}`}>
              {typeof entry.status === 'string' ? entry.status : ''}
            </span>
          </div>
          {entry.dateBorrowed && (
            <div className="detail-item">
              <label>Date Borrowed:</label>
              <span>{new Date(entry.dateBorrowed).toLocaleDateString()}</span>
            </div>
          )}
          {entry.dateFullyPaid && (
            <div className="detail-item">
              <label>Date Fully Paid:</label>
              <span>{new Date(entry.dateFullyPaid).toLocaleDateString()}</span>
            </div>
          )}
          {entry.transactionType === 'Installment Expense' && entry.installmentDetails && (
            <>
              <div className="detail-item">
                <label>Payment Frequency:</label>
                <span>{entry.installmentDetails.paymentFrequency}</span>
              </div>
              <div className="detail-item">
                <label>Payment Terms:</label>
                <span>{entry.installmentDetails.paymentTerms} terms</span>
              </div>
              <div className="detail-item">
                <label>Amount Per Term:</label>
                <span>₱{entry.installmentDetails.paymentAmountPerTerm.toLocaleString()}</span>
              </div>
            </>
          )}
          {entry.transactionType === 'Group Expense' && entry.paymentAllocations && (
            <div className="detail-item">
              <label>Group Members:</label>
              <span>{entry.paymentAllocations.length} members</span>
            </div>
          )}
          {entry.description && (
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <label>Description:</label>
              <span>{entry.description}</span>
            </div>
          )}
          {entry.notes && (
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <label>Notes:</label>
              <span>{entry.notes}</span>
            </div>
          )}
          {entry.proofOfLoan && (
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <label>Proof of Loan:</label>
              <div style={{ marginTop: '0.5em' }}>
                <img 
                  src={URL.createObjectURL(entry.proofOfLoan)} 
                  alt="Proof of loan" 
                  style={{ maxWidth: '400px', maxHeight: '400px', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '4px' }} 
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Payment Details Section */}
      <section className="details-section">
        <div className="section-header">
          <h2>Payment Details</h2>
          {entry.transactionType !== 'Installment Expense' && 
           entry.transactionType !== 'Group Expense' && 
           entry.status !== 'PAID' && (
            <button className="btn-primary" onClick={handleAddPayment}>+ Add Payment</button>
          )}
        </div>
        {payments && payments.length > 0 ? (
          <table className="payments-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Payee</th>
                <th>Amount</th>
                {entry.transactionType === 'Installment Expense' && <th>Term</th>}
                <th>Proof</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment: Payment) => (
                <tr key={payment.id}>
                  <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                  <td>{payment.payee.firstName} {payment.payee.lastName}</td>
                  <td>₱{payment.paymentAmount.toLocaleString()}</td>
                  {entry.transactionType === 'Installment Expense' && (
                    <td>{payment.termNumber ? `Term ${payment.termNumber}` : '-'}</td>
                  )}
                  <td>
                    {payment.proof ? (
                      <img 
                        src={URL.createObjectURL(payment.proof)} 
                        alt="Payment proof" 
                        style={{maxWidth: '80px', 
                          maxHeight: '80px', 
                          objectFit: 'cover', 
                          border: '1px solid #ddd', 
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          const imgWindow = window.open('');
                          if (imgWindow) {
                            imgWindow.document.write(`<img src="${URL.createObjectURL(payment.proof!)}" style="max-width:100%;height:auto;"/>`);
                          }
                        }}
                        title="Click to view full size"
                      />
                    ) : (
                      <span style={{ color: '#999', fontSize: '0.9em' }}>No proof</span>
                    )}
                  </td>
                  <td>{payment.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No payments recorded yet.</p>
        )}
        {showPaymentModal && (
          <CreatePaymentModal
            isOpen={showPaymentModal}
            onClose={handleSavePayment}
            initialPayment={null}
            people={(() => {
              if (!entry) return people;
              if (
                typeof entry.borrower === 'object' &&
                'personID' in entry.borrower &&
                typeof (entry.borrower as any).personID === 'number'
              ) {
                // Single person borrower
                return people.filter((p: Person) => p.personID === (entry.borrower as Person).personID);
              } else if (
                typeof entry.borrower === 'object' &&
                'groupID' in entry.borrower &&
                (entry.borrower as any).members
              ) {
                // Group borrower with members
                return (entry.borrower as any).members;
              }
              return people;
            })()}
            entryId={entry.id}
            termNumber={currentTermNumber}
            suggestedAmount={currentTermNumber && entry.installmentDetails ? entry.installmentDetails.paymentAmountPerTerm : undefined}
            suggestedDate={currentTermNumber && entry.installmentDetails ? entry.installmentDetails.terms[currentTermNumber - 1]?.dueDate : undefined}
            lockedPayee={paymentFromAllocation?.payee}
            maxPaymentAmount={paymentFromAllocation ? (paymentFromAllocation.amount - (paymentFromAllocation.amountPaid || 0)) : undefined}
            defaultPayee={(() => {
              // For non-group expense, default to borrower
              if (entry && typeof entry.borrower === 'object' && 'personID' in entry.borrower) {
                return entry.borrower as Person;
              }
              return undefined;
            })()}
          />
        )}
      </section>

      {/* Installment Details Section - Only if transaction type is Installment */}
      {entry.transactionType === 'Installment Expense' && entry.installmentDetails && (
        <section className="details-section">
          <h2>Installment Details</h2>
          <div className="installment-summary">
            <div className="detail-item">
              <label>Start Date:</label>
              <span>{new Date(entry.installmentDetails.startDate).toLocaleDateString()}</span>
            </div>
            <div className="detail-item">
              <label>Payment Frequency:</label>
              <span>{entry.installmentDetails.paymentFrequency}</span>
            </div>
            <div className="detail-item">
              <label>Total Terms:</label>
              <span>{entry.installmentDetails.paymentTerms}</span>
            </div>
            <div className="detail-item">
              <label>Amount Per Term:</label>
              <span>₱{entry.installmentDetails.paymentAmountPerTerm.toLocaleString()}</span>
            </div>
            <div className="detail-item">
              <label>Progress:</label>
              <div style={{ width: '100%' }}>
                {(() => {
                  const paidCount = entry.installmentDetails.terms.filter(t => t.status === InstallmentStatus.PAID).length;
                  const totalTerms = entry.installmentDetails.paymentTerms;
                  const percentage = totalTerms > 0 ? (paidCount / totalTerms) * 100 : 0;
                  return (
                    <>
                      <div style={{ 
                        width: '100%', 
                        height: '24px', 
                        backgroundColor: '#e0e0e0', 
                        borderRadius: '12px',
                        overflow: 'hidden',
                        marginTop: '0.5em'
                      }}>
                        <div style={{ 
                          width: `${percentage}%`, 
                          height: '100%', 
                          backgroundColor: percentage >= 100 ? '#4caf50' : '#2196f3',
                          transition: 'width 0.3s ease'
                        }}></div>
                      </div>
                      <div style={{ marginTop: '0.3em', fontSize: '0.9em', color: '#666' }}>
                        {paidCount} / {totalTerms} terms paid ({percentage.toFixed(1)}%)
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
          <table className="installment-table">
            <thead>
              <tr>
                <th>Term</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entry.installmentDetails.terms.map((term: typeof entry.installmentDetails.terms[0], idx: number) => {
                // Determine status using InstallmentStatus enum
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Normalize to start of day
                
                const installmentStartDate = new Date(entry.installmentDetails!.startDate);
                installmentStartDate.setHours(0, 0, 0, 0);
                
                const termDueDate = new Date(term.dueDate);
                termDueDate.setHours(0, 0, 0, 0);
                
                let status = term.status;
                
                // Priority order for status calculation:
                // 1. If installment hasn't started yet, all terms are NOT_STARTED
                if (today < installmentStartDate) {
                  status = InstallmentStatus.NOT_STARTED;
                }
                // 2. If term is already marked as paid or skipped, keep that status
                else if (term.status === InstallmentStatus.PAID) {
                  status = InstallmentStatus.PAID;
                } else if (term.status === InstallmentStatus.SKIPPED || term.skipped) {
                  status = InstallmentStatus.SKIPPED;
                }
                // 3. Check if payment was made (has paymentDate)
                else if (term.paymentDate) {
                  status = InstallmentStatus.PAID;
                }
                // 4. If today is before the due date, it's not started yet
                else if (today < termDueDate) {
                  status = InstallmentStatus.NOT_STARTED;
                }
                // 5. If today equals or is after the due date
                else if (today >= termDueDate) {
                  // If it's on the due date or within grace period (same day), it's UNPAID
                  if (today.getTime() === termDueDate.getTime()) {
                    status = InstallmentStatus.UNPAID;
                  }
                  // If past due date, it's DELINQUENT
                  else {
                    status = InstallmentStatus.DELINQUENT;
                  }
                }
                // 6. Default to UNPAID as fallback
                else {
                  status = InstallmentStatus.UNPAID;
                }
                
                return (
                  <tr key={term.termNumber}>
                    <td>{term.termNumber}</td>
                    <td>{new Date(term.dueDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge status-${status.toLowerCase()}`}>
                        {status}
                      </span>
                    </td>
                    <td>
                      {editingTermNotes[idx] ? (
                        <div style={{ display: 'flex', gap: '0.5em', alignItems: 'center' }}>
                          <textarea
                            value={termNotesValues[idx] !== undefined ? termNotesValues[idx] : (term.notes || '')}
                            onChange={(e) => setTermNotesValues({ ...termNotesValues, [idx]: e.target.value })}
                            style={{ flex: 1, minHeight: '60px', padding: '0.5em', fontSize: '0.9em' }}
                            placeholder="Add notes for this term..."
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3em' }}>
                            <button 
                              className="btn-primary" 
                              style={{ padding: '0.3em 0.7em', fontSize: '0.85em' }}
                              onClick={() => handleSaveTermNotes(idx)}
                            >
                              Save
                            </button>
                            <button 
                              className="btn-secondary" 
                              style={{ padding: '0.3em 0.7em', fontSize: '0.85em' }}
                              onClick={() => {
                                setEditingTermNotes({ ...editingTermNotes, [idx]: false });
                                setTermNotesValues({ ...termNotesValues, [idx]: term.notes || '' });
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          style={{ 
                            cursor: 'pointer', 
                            padding: '0.5em',
                            minHeight: '40px',
                            backgroundColor: term.notes ? 'transparent' : '#f9f9f9',
                            borderRadius: '4px',
                            color: term.notes ? 'inherit' : '#999'
                          }}
                          onClick={() => {
                            setEditingTermNotes({ ...editingTermNotes, [idx]: true });
                            setTermNotesValues({ ...termNotesValues, [idx]: term.notes || '' });
                          }}
                          title="Click to edit notes"
                        >
                          {term.notes || 'Click to add notes...'}
                        </div>
                      )}
                    </td>

                    <td>
                      {status === InstallmentStatus.UNPAID && (
                        <>
                          <button className="btn-primary" onClick={() => handleAddInstallmentPayment(idx)}>Add Payment</button>
                          <button className="btn-secondary" onClick={() => handleSkipInstallmentTerm(idx)}>Skip Term</button>
                        </>
                      )}
                      {status === InstallmentStatus.DELINQUENT && (
                        <button className="btn-primary" onClick={() => handleAddInstallmentPayment(idx)}>Pay Now</button>
                      )}
                      {status === InstallmentStatus.SKIPPED && <span>Skipped</span>}
                      {status === InstallmentStatus.PAID && <span>Paid</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Payment Allocation Section - Only if borrower is a Group */}
      {typeof entry.borrower === 'object' && 'members' in entry.borrower && (
        <section className="details-section">
          <div className="section-header">
            <h2>Payment Allocation</h2>
          </div>
          {entry.paymentAllocations && entry.paymentAllocations.length > 0 ? (
            <table className="alloc-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Amount Due</th>
                  <th>Amount Paid</th>
                  <th>Percent</th>
                  <th>Description</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entry.paymentAllocations.map((alloc: PaymentAllocation) => {
                  // Compute allocation status: UNPAID, PARTIALLY_PAID, PAID
                  const paid = alloc.amountPaid || 0;
                  let status = 'UNPAID';
                  if (paid >= alloc.amount) status = 'PAID';
                  else if (paid > 0) status = 'PARTIALLY_PAID';
                  return (
                    <tr key={alloc.id}>
                      <td>{alloc.payee.firstName} {alloc.payee.lastName}</td>
                      <td>₱{alloc.amount.toLocaleString()}</td>
                      <td>₱{paid.toLocaleString()}</td>
                      <td>{alloc.percentageOfTotal}%</td>
                      <td>{alloc.description}</td>
                      <td>{alloc.notes || '-'}</td>
                      <td><span className={`status-badge status-${status.toLowerCase()}`}>{status}</span></td>
                      <td>
                        {status !== 'PAID' && (
                          <button 
                            className="btn-primary" 
                            style={{ marginRight: '0.5em' }}
                            onClick={() => handlePayFromAllocation(alloc)}
                          >
                            Pay
                          </button>
                        )}
                        <button className="btn-secondary" onClick={() => handleEditAlloc(alloc)}>Edit</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p>No allocations yet.</p>
          )}
          {showAllocModal && (
            <CreatePaymentAllocationModal
              isOpen={showAllocModal}
              onClose={() => setShowAllocModal(false)}
              onSave={handleSaveAlloc}
              initialAllocation={editingAlloc}
              people={people}
              entryId={entry.id}
            />
          )}
        </section>
      )}
    </div>
  )
}

export default EntryDetails;