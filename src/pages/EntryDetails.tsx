import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Entry, Person, Group, Payment, PaymentAllocation, InstallmentStatus } from '../types';
import { personMockService } from '../services/personMockService';
import { groupMockService } from '../services/groupMockService';
import { entryMockService } from '../services/entryMockService';
import { paymentMockService } from '../services/paymentMockService';
import CreateEntryModal from '../components/CreateEntryModal';
import CreatePaymentModal from '../components/CreatePaymentModal';
import CreatePaymentAllocationModal from '../components/CreatePaymentAllocationModal';
import './EntryDetails.css';

function EntryDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  // Payment Allocation (for group entries)
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [editingAlloc, setEditingAlloc] = useState<PaymentAllocation | null>(null);
  const [allocLoading, setAllocLoading] = useState(false);
  const [currentTermNumber, setCurrentTermNumber] = useState<number | undefined>(undefined);

  // Installment term payment/skip handlers
  const handleAddInstallmentPayment = async (termIdx: number) => {
    if (!entry || !entry.installmentDetails) return;
    // Open payment modal with term number and suggested amount
    setCurrentTermNumber(termIdx + 1); // termNumber is 1-indexed
    setEditingPayment(null);
    setShowPaymentModal(true);
  };

  const handleSkipInstallmentTerm = async (termIdx: number) => {
    if (!entry || !entry.installmentDetails) return;
    const updatedTerms = entry.installmentDetails.terms.map((t: typeof entry.installmentDetails.terms[0], i: number) =>
      i === termIdx
        ? {
            ...t,
            skipped: true,
            status: InstallmentStatus.SKIPPED,
          }
        : t
    );
    const updatedEntry = {
      ...entry,
      installmentDetails: {
        ...entry.installmentDetails,
        terms: updatedTerms,
      },
    };
    await entryMockService.update(entry.id, updatedEntry);
    setEntry(updatedEntry);
    setModalSuccess('Term ' + (termIdx + 1) + ' skipped.');
    setTimeout(() => setModalSuccess(null), 1500);
  };

  useEffect(() => {
    if (id) {
      entryMockService.getById(id).then((e: Entry | undefined) => setEntry(e ?? null));
      paymentMockService.getByEntryId(id).then((p: Payment[]) => setPayments(p));
    }
    personMockService.getAll().then(setPeople);
    groupMockService.getAll().then(setGroups);
  }, [id]);

  // Payment handlers
  const handleAddPayment = () => {
    setEditingPayment(null);
    setCurrentTermNumber(undefined); // Clear term number for general payments
    setShowPaymentModal(true);
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setCurrentTermNumber(payment.termNumber); // Preserve term number if editing installment payment
    setShowPaymentModal(true);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    setPaymentLoading(true);
    setModalError(null);
    try {
      // Get the payment details before deleting to check if it's linked to a term
      const payments = await paymentMockService.getByEntryId(id!);
      const paymentToDelete = payments.find(p => p.id === paymentId);
      
      await paymentMockService.delete(paymentId);
      if (id) setPayments(await paymentMockService.getByEntryId(id));
      
      // If payment was for a specific term, revert that term to unpaid
      if (paymentToDelete?.termNumber && entry?.installmentDetails) {
        const termIdx = paymentToDelete.termNumber - 1; // Convert to 0-indexed
        
        // Determine what the status should be after removing payment
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const termDueDate = new Date(entry.installmentDetails.terms[termIdx].dueDate);
        termDueDate.setHours(0, 0, 0, 0);
        
        let newStatus = InstallmentStatus.UNPAID;
        if (today.getTime() === termDueDate.getTime()) {
          newStatus = InstallmentStatus.UNPAID;
        } else if (today > termDueDate) {
          newStatus = InstallmentStatus.DELINQUENT;
        } else if (today < termDueDate) {
          const installmentStartDate = new Date(entry.installmentDetails.startDate);
          installmentStartDate.setHours(0, 0, 0, 0);
          if (today < installmentStartDate) {
            newStatus = InstallmentStatus.NOT_STARTED;
          } else {
            newStatus = InstallmentStatus.NOT_STARTED; // Before due date
          }
        }
        
        const updatedTerms = entry.installmentDetails.terms.map((t, i) =>
          i === termIdx
            ? {
                ...t,
                paymentDate: undefined,
                status: newStatus,
              }
            : t
        );
        const entryWithRevertedTerm = {
          ...entry,
          installmentDetails: {
            ...entry.installmentDetails,
            terms: updatedTerms,
          },
        };
        await entryMockService.update(id!, entryWithRevertedTerm);
        setEntry(entryWithRevertedTerm);
      } else {
        // For non-installment payments, refresh entry to recalculate amountRemaining and status
        if (id) {
          const updatedEntry = await entryMockService.getById(id);
          setEntry(updatedEntry ?? null);
        }
      }
      
      setModalSuccess('Payment deleted successfully!');
      setTimeout(() => setModalSuccess(null), 1500);
    } catch (err) {
      setModalError('Failed to delete payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSavePayment = async (payment: Omit<Payment, 'id' | 'entryId' | 'createdAt' | 'updatedAt'>, pid?: string) => {
    setModalError(null);
    setPaymentLoading(true);
    try {
      if (pid) {
        await paymentMockService.update(pid, payment);
        setModalSuccess('Payment updated successfully!');
      } else {
        if (id) await paymentMockService.create({ ...payment, entryId: id });
        setModalSuccess('Payment added successfully!');
      }
      if (id) {
        // Refresh payments list
        setPayments(await paymentMockService.getByEntryId(id));
        
        // If payment is for a specific term, mark that term as paid
        if (payment.termNumber && entry?.installmentDetails) {
          const termIdx = payment.termNumber - 1; // Convert to 0-indexed
          const updatedTerms = entry.installmentDetails.terms.map((t, i) =>
            i === termIdx
              ? {
                  ...t,
                  paymentDate: payment.paymentDate,
                  status: InstallmentStatus.PAID,
                }
              : t
          );
          const entryWithPaidTerm = {
            ...entry,
            installmentDetails: {
              ...entry.installmentDetails,
              terms: updatedTerms,
            },
          };
          await entryMockService.update(id, entryWithPaidTerm);
          setEntry(entryWithPaidTerm);
        } else {
          // Refresh entry to get updated amountRemaining and status (for non-installment payments)
          const updatedEntry = await entryMockService.getById(id);
          setEntry(updatedEntry ?? null);
        }
      }
      setShowPaymentModal(false);
      setCurrentTermNumber(undefined); // Clear term number
      setTimeout(() => setModalSuccess(null), 1500);
    } catch (err) {
      setModalError('Failed to save payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Payment Allocation handlers (simulate in-memory)
  const handleAddAlloc = () => {
    setEditingAlloc(null);
    setShowAllocModal(true);
  };
  const handleEditAlloc = (alloc: PaymentAllocation) => {
    setEditingAlloc(alloc);
    setShowAllocModal(true);
  };
  const handleDeleteAlloc = async (allocId: string) => {
    if (!window.confirm('Are you sure you want to delete this allocation?')) return;
    setAllocLoading(true);
    setModalError(null);
    try {
      if (entry && entry.paymentAllocations) {
        const updatedEntry = {
          ...entry,
          paymentAllocations: entry.paymentAllocations.filter((a: PaymentAllocation) => a.id !== allocId),
        };
        setEntry(updatedEntry ?? null);
        setModalSuccess('Allocation deleted successfully!');
        setTimeout(() => setModalSuccess(null), 1500);
      }
    } catch (err) {
      setModalError('Failed to delete allocation');
    } finally {
      setAllocLoading(false);
    }
  };
  const handleSaveAlloc: (
    allocation: Omit<PaymentAllocation, 'id' | 'createdAt' | 'updatedAt'>,
    id?: string
  ) => void = async (alloc, allocId) => {
    setModalError(null);
    setAllocLoading(true);
    try {
      if (entry) {
        let updatedAllocations: PaymentAllocation[] = entry.paymentAllocations ? [...entry.paymentAllocations] : [];
        if (allocId) {
          // Edit
          updatedAllocations = updatedAllocations.map((a: PaymentAllocation) => a.id === allocId ? { ...a, ...alloc, id: allocId } : a);
          setModalSuccess('Allocation updated successfully!');
        } else {
          // Add
          const now = new Date();
          updatedAllocations.push({ ...alloc, id: Date.now().toString(), createdAt: now, updatedAt: now });
          setModalSuccess('Allocation added successfully!');
        }
        setEntry({ ...entry, paymentAllocations: updatedAllocations });
        setShowAllocModal(false);
        setTimeout(() => setModalSuccess(null), 1500);
      }
    } catch (err) {
      setModalError('Failed to save allocation');
    } finally {
      setAllocLoading(false);
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
      await entryMockService.delete(entry.id);
      setModalSuccess('Entry deleted successfully!');
      setTimeout(() => navigate('/'), 1000);
    } catch (err: any) {
      setModalError('Failed to delete entry');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveEdit = async (updated: Omit<Entry, 'id' | 'referenceId' | 'createdAt' | 'updatedAt'>) => {
    setModalError(null);
    try {
      await entryMockService.update(entry.id, updated);
      const updatedEntry = await entryMockService.getById(entry.id);
      setEntry(updatedEntry ?? null);
      setShowEditModal(false);
      setModalSuccess('Entry updated successfully!');
      setTimeout(() => setModalSuccess(null), 1500);
    } catch (err: any) {
      setModalError('Failed to update entry');
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
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEdit}
          initialEntry={entry}
          people={people}
          groups={groups}
          onGroupsUpdated={async () => setGroups(await groupMockService.getAll())}
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
            <span>{entry.lender}</span>
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
          {entry.notes && (
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <label>Notes:</label>
              <span>{entry.notes}</span>
            </div>
          )}
        </div>
      </section>

      {/* Payment Details Section */}
      <section className="details-section">
        <div className="section-header">
          <h2>Payment Details</h2>
          {entry.transactionType !== 'Installment Expense' && (
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
                <th>Notes</th>
                <th>Actions</th>
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
                  <td>{payment.notes}</td>
                  <td>
                    <button className="btn-secondary" onClick={() => handleEditPayment(payment)}>Edit</button>
                    <button className="btn-danger" onClick={() => handleDeletePayment(payment.id)} disabled={paymentLoading}>Delete</button>
                  </td>
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
            onClose={() => setShowPaymentModal(false)}
            onSave={handleSavePayment}
            initialPayment={editingPayment}
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
            <button className="btn-primary" onClick={handleAddAlloc}>+ Add Allocation</button>
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
                      <td><span className={`status-badge status-${status.toLowerCase()}`}>{status}</span></td>
                      <td>
                        <button className="btn-secondary" onClick={() => handleEditAlloc(alloc)}>Edit</button>
                        <button className="btn-danger" onClick={() => handleDeleteAlloc(alloc.id)} disabled={allocLoading}>Delete</button>
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