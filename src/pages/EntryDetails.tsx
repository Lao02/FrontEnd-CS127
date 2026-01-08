import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Entry, Payment, PaymentAllocation, TransactionType, InstallmentTerm } from '../types';
import { useApp } from '../context/AppContext';
import { installmentTermsApi, paymentAllocationApi } from '../services/api';
import { formatBackendDate } from '../utils/date';
import CreateEntryModal from '../components/CreateEntryModal';
import CreatePaymentModal from '../components/CreatePaymentModal';
import CreatePaymentAllocationModal from '../components/CreatePaymentAllocationModal';
import './EntryDetails.css';

function EntryDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { people, groups, getEntryById, deleteEntry, getPaymentsByEntryId } = useApp();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [installmentTerms, setInstallmentTerms] = useState<InstallmentTerm[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Payment Allocation (for group entries)
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [editingAlloc, setEditingAlloc] = useState<PaymentAllocation | null>(null);
  const [paymentFromAllocation, setPaymentFromAllocation] = useState<PaymentAllocation | null>(null);
  const [paymentForTerm, setPaymentForTerm] = useState<{termId: number; termNumber: number} | null>(null);
  const imageRequestUrl = 'http://localhost:8080/api/images/entry/'
  const paymentProofUrl = 'http://localhost:8080/api/images/payment/' 

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        try {
          const fetchedEntry = await getEntryById(id);
          setEntry(fetchedEntry);
          const fetchedPayments = await getPaymentsByEntryId(id);
          setPayments(fetchedPayments);
          
          // Fetch installment terms if it's an installment expense
          if (fetchedEntry.transactionType === TransactionType.INSTALLMENT) {
            try {
              const terms = await installmentTermsApi.getTermsByEntryId(id);
              setInstallmentTerms(terms);
            } catch (err) {
              console.error('Failed to load installment terms:', err);
              setInstallmentTerms([]);
            }
          }
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
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentFromAllocation(null);
    setPaymentForTerm(null);
  };

  const handlePayForTerm = (termId: number, termNumber: number) => {
    setPaymentForTerm({ termId, termNumber });
    setShowPaymentModal(true);
  };

  const handleSkipTerm = async (termId: number) => {
    if (!window.confirm('Are you sure you want to skip this term? This will create a new term at the end.')) return;
    try {
      await installmentTermsApi.skipTerm(termId);
      // Refresh installment terms
      if (id) {
        const terms = await installmentTermsApi.getTermsByEntryId(id);
        setInstallmentTerms(terms);
        setModalSuccess('Term skipped successfully!');
        setTimeout(() => setModalSuccess(null), 1500);
      }
    } catch (err: any) {
      setModalError(err?.message || 'Failed to skip term');
    }
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
        
        // Refresh installment terms if this is an installment entry
        if (updatedEntry.transactionType === TransactionType.INSTALLMENT) {
          try {
            const terms = await installmentTermsApi.getTermsByEntryId(id);
            setInstallmentTerms(terms);
          } catch (err) {
            console.error('Failed to refresh installment terms:', err);
          }
        }
        
        setModalSuccess('Payment added successfully!');
      }
      setShowPaymentModal(false);
      setPaymentFromAllocation(null);
      setPaymentForTerm(null);
      setTimeout(() => setModalSuccess(null), 1500);
    } catch (err) {
      setModalError('Failed to refresh after payment');
    }
  };

  // Payment Allocation handlers (simulate in-memory)
  const handlePayFromAllocation = (alloc: PaymentAllocation) => {
    // Store allocation details and open payment modal
    setPaymentFromAllocation(alloc);
    setShowPaymentModal(true);
  };

  const handleEditAlloc = (alloc: PaymentAllocation) => {
    setEditingAlloc(alloc);
    setShowAllocModal(true);
  };
  
  const handleCloseAllocModal = () => {
    setShowAllocModal(false);
    setEditingAlloc(null);
  };
  
  const handleSaveAlloc: (
    allocation: Omit<PaymentAllocation, 'allocationId'>,
    id?: number
  ) => void = async (alloc, allocId) => {
    setModalError(null);
    try {
      if (entry && allocId) {
        console.log('Updating allocation:', allocId, alloc.description, alloc.notes);
        
        // Edit - call backend API to update description and notes
        const response = await paymentAllocationApi.updateDescriptionAndNotes(
          allocId,
          alloc.description || '',
          alloc.notes || ''
        );
        
        console.log('Update response:', response);
        
        // Update local state
        const updatedAllocations = entry.paymentAllocations?.map((a: PaymentAllocation) => 
          a.allocationId === allocId 
            ? { ...a, description: alloc.description, notes: alloc.notes } 
            : a
        ) || [];
        
        setEntry({ ...entry, paymentAllocations: updatedAllocations });
        setModalSuccess('Allocation updated successfully!');
        handleCloseAllocModal();
        setTimeout(() => setModalSuccess(null), 1500);
      }
    } catch (err: any) {
      console.error('Failed to update allocation:', err);
      setModalError(err?.message || 'Failed to save allocation');
    }
  };

  if (!entry) {
    return (
      <div className="entry-details">
        <p>{isDeleting ? 'Deleting entry...' : 'Loading entry...'}</p>
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
    setIsDeleting(true);
    setModalError(null);
    
    const entryId = entry?.id;
    if (!entryId) return;
    
    // Navigate first before deleting
    navigate('/payments', { replace: true });
    
    // Then delete in the background
    try {
      await deleteEntry(entryId);
    } catch (err: any) {
      console.error('Failed to delete entry:', err);
      // Even if deletion fails, we've already navigated away
    }
  };

  const handleEditModalClose = () => {
    setShowEditModal(false);
    // Refresh entry after modal closes
    if (id) {
      getEntryById(id).then((e: Entry) => setEntry(e)).catch(() => setEntry(null));
    }
  };

  // Helper function to calculate correct status based on due date
  const getCorrectStatus = (term: InstallmentTerm): string => {
    const backendStatus = term.status;
    
    // 1. Trust the backend status first
    // If backend says UNPAID, PAID, or SKIPPED, we generally want to respect that.
    if (backendStatus === 'PAID' || backendStatus === 'SKIPPED') {
      return backendStatus;
    }
    
    // 2. Optional: Only override 'UNPAID' if it is actually late (DELINQUENT)
    // This allows 'UNPAID' to show for future dates if that is what the backend sent.
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(term.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    // If due date is in the past (after due date) and it's not paid, mark as DELINQUENT
    if (today > dueDate && backendStatus !== 'PAID' && backendStatus !== 'SKIPPED') {
      return 'DELINQUENT';
    }
    
    // Otherwise, return whatever the backend sent (e.g., 'UNPAID')
    return backendStatus;
  };

  return (
    <div className="entry-details">
      <div className="page-header">
        <h1>Entry Details</h1>
        <div className="header-actions">
          <button type="button" className="btn-secondary" onClick={handleEdit}>Edit</button>
          <button type="button" className="btn-danger" onClick={handleDelete} disabled={deleteLoading}>Delete</button>
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
            <span>{entry.borrowerName || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <label>Lender:</label>
            <span>{entry.lenderName || 'N/A'}</span>
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
              <span>{formatBackendDate(entry.dateBorrowed)}</span>
            </div>
          )}
          {entry.dateFullyPaid && (
            <div className="detail-item">
              <label>Date Fully Paid:</label>
              <span>{formatBackendDate(entry.dateFullyPaid)}</span>
            </div>
          )}
          {entry.transactionType === TransactionType.INSTALLMENT && entry.paymentFrequency && (
            <>
              <div className="detail-item">
                <label>Payment Frequency:</label>
                <span>{entry.paymentFrequency}</span>
              </div>
              <div className="detail-item">
                <label>Payment Terms:</label>
                <span>{entry.paymentTerms} terms</span>
              </div>
              <div className="detail-item">
                <label>Amount Per Term:</label>
                <span>₱{entry.paymentAmountPerTerm?.toLocaleString()}</span>
              </div>
            </>
          )}
          {entry.transactionType === TransactionType.GROUP && entry.paymentAllocations && (
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
          {entry.imageProofs && entry.imageProofs.length > 0 && (
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <label>Proof of Loan:</label>
              <div style={{ marginTop: '0.5em', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {entry.imageProofs.map(proof => (
                  <img 
                    key={proof.id}
                    src={`${imageRequestUrl}${encodeURIComponent(proof.imageName)}`} 
                    alt={proof.imageName}
                    style={{ maxWidth: '400px', maxHeight: '400px', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '4px' }} 
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Payment Details Section */}
      <section className="details-section">
        <div className="section-header">
          <h2>Payment Details</h2>
          {entry.transactionType !== TransactionType.INSTALLMENT && 
           entry.transactionType !== TransactionType.GROUP && 
           entry.status !== 'PAID' && (
            <button type="button" className="btn-primary" onClick={handleAddPayment}>+ Add Payment</button>
          )}
        </div>
        {payments && payments.length > 0 ? (
          <table className="payments-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Payee</th>
                <th>Amount</th>
                {entry.transactionType === TransactionType.INSTALLMENT && <th>Term</th>}
                <th>Proof</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment: Payment) => (
                <tr key={payment.paymentId}>
                  <td>{formatBackendDate(payment.paymentDate)}</td>
                  <td>{payment.payeeDto.firstName} {payment.payeeDto.lastName}</td>
                  <td>₱{payment.paymentAmount.toLocaleString()}</td>
                  {entry.transactionType === TransactionType.INSTALLMENT && (
                    <td>{payment.termId ? `Term ${payment.termId}` : '-'}</td>
                  )}
                  <td>
                    {payment.imageUrls && payment.imageUrls.length > 0 ? (
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {payment.imageUrls.map((url, idx) => (
                          <img 
                            key={idx}
                            src={`${paymentProofUrl}${encodeURIComponent(url)}`} 
                            alt={`Payment proof ${idx + 1}`}
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
                                imgWindow.document.write(`<img src="${url}" style="max-width:100%;height:auto;"/>`);
                              }
                            }}
                            title="Click to view full size"
                          />
                        ))}
                      </div>
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
            onClose={handleClosePaymentModal}
            onSave={handleSavePayment}
            initialPayment={null}
            people={people}
            entryId={entry.id}
            termNumber={paymentForTerm?.termId}
            suggestedAmount={entry.transactionType === TransactionType.INSTALLMENT ? entry.paymentAmountPerTerm : undefined}
            suggestedDate={undefined}
            lockedPayee={
              paymentFromAllocation?.groupMemberDto || 
              ((entry.transactionType === TransactionType.STRAIGHT || entry.transactionType === TransactionType.INSTALLMENT) && entry.borrowerId 
                ? people.find(p => p.personID === entry.borrowerId) 
                : undefined)
            }
            maxPaymentAmount={paymentFromAllocation ? (paymentFromAllocation.amount - (paymentFromAllocation.amountPaid || 0)) : undefined}
            defaultPayee={undefined}
          />
        )}
      </section>

      {/* Installment Details Section - Only if transaction type is Installment */}
      {entry.transactionType === TransactionType.INSTALLMENT && entry.paymentFrequency && (
        <section className="details-section">
          <h2>Installment Details</h2>
          <div className="installment-summary">
            <div className="detail-item">
              <label>Start Date:</label>
              <span>{entry.startDate ? formatBackendDate(entry.startDate) : 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Payment Frequency:</label>
              <span>{entry.paymentFrequency}</span>
            </div>
            <div className="detail-item">
              <label>Total Terms:</label>
              <span>{entry.paymentTerms}</span>
            </div>
            <div className="detail-item">
              <label>Amount Per Term:</label>
              <span>₱{entry.paymentAmountPerTerm?.toLocaleString()}</span>
            </div>
          </div>
          
          {/* Installment Terms Table */}
          {installmentTerms && installmentTerms.length > 0 && (
            <div style={{ marginTop: '1.5em' }}>
              <h3>Payment Terms Schedule</h3>
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>Term #</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {installmentTerms.map((term: InstallmentTerm) => {
                    // Calculate the correct status based on due date
                    const status = getCorrectStatus(term);
                    const canPay = status === 'UNPAID' || status === 'DELINQUENT';
                    const canSkip = status === 'UNPAID';
                    const noActions = status === 'NOT_STARTED' || status === 'PAID' || status === 'SKIPPED';
                    
                    return (
                      <tr key={term.termId}>
                        <td>Term {term.termNumber}</td>
                        <td>{formatBackendDate(term.dueDate)}</td>
                        <td>
                          <span className={`status-badge status-${status.toLowerCase()}`}>
                            {status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          {canPay && (
                            <button
                              type="button"
                              className="btn-primary"
                              style={{ marginRight: '0.5em' }}
                              onClick={() => handlePayForTerm(term.termId, term.termNumber)}
                            >
                              Pay
                            </button>
                          )}
                          {canSkip && (
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => handleSkipTerm(term.termId)}
                            >
                              Skip
                            </button>
                          )}
                          {noActions && <span style={{ color: '#888' }}>-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Payment Allocation Section - Only if transaction type is Group */}
      {entry.transactionType === TransactionType.GROUP && entry.paymentAllocations && (
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
                  const status = alloc.paymentAllocationStatus || 'UNPAID';
                  return (
                    <tr key={alloc.allocationId}>
                      <td>{alloc.groupMemberDto.firstName} {alloc.groupMemberDto.lastName}</td>
                      <td>₱{alloc.amount.toLocaleString()}</td>
                      <td>₱{paid.toLocaleString()}</td>
                      <td>{alloc.percent}%</td>
                      <td>{alloc.description}</td>
                      <td>{alloc.notes || '-'}</td>
                      <td><span className={`status-badge status-${status.toLowerCase()}`}>{status}</span></td>
                      <td>
                        {status !== 'PAID' && (
                          <button 
                            type="button"
                            className="btn-primary" 
                            style={{ marginRight: '0.5em' }}
                            onClick={() => handlePayFromAllocation(alloc)}
                          >
                            Pay
                          </button>
                        )}
                        <button type="button" className="btn-secondary" onClick={() => handleEditAlloc(alloc)}>Edit</button>
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
              onClose={handleCloseAllocModal}
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