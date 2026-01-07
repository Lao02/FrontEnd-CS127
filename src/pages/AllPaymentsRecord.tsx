import { Link } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { personMockService } from '../services/personMockService';
import { groupMockService } from '../services/groupMockService';
import { entryMockService } from '../services/entryMockService';
import CreateEntryModal from '../components/CreateEntryModal';
import './AllPaymentsRecord.css';



import { Entry, Person, Group } from '../types';
function AllPaymentsRecord() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortKey, setSortKey] = useState<'entryName' | 'transactionType' | 'amountBorrowed' | 'amountRemaining' | 'status'>('entryName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    entryMockService.getAll().then((data: Entry[]) => setEntries(data));
    personMockService.getAll().then((data: Person[]) => setPeople(data));
    groupMockService.getAll().then((data: Group[]) => setGroups(data));
  }, []);

  const handleCreateEntry = async (entry: Omit<Entry, 'id' | 'referenceId' | 'createdAt' | 'updatedAt'>) => {
    setModalLoading(true);
    setModalError(null);
    try {
      await entryMockService.create(entry);
      setEntries(await entryMockService.getAll());
      setShowCreateModal(false);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to create entry');
    } finally {
      setModalLoading(false);
    }
  };

  const refreshGroups = async () => {
    setGroups(await groupMockService.getAll());
  };

  const handleDeleteAllPaidRecords = async () => {
    const paidEntries = entries.filter(e => e.status === 'PAID');
    
    if (paidEntries.length === 0) {
      alert('No paid records found to delete.');
      return;
    }

    const confirmMessage = `Are you sure you want to delete all ${paidEntries.length} paid record${paidEntries.length > 1 ? 's' : ''}?\n\nThis action cannot be undone.\n\nPaid entries to be deleted:\n${paidEntries.slice(0, 5).map(e => `- ${e.entryName}`).join('\n')}${paidEntries.length > 5 ? `\n... and ${paidEntries.length - 5} more` : ''}`;
    
    if (!window.confirm(confirmMessage)) return;

    setModalLoading(true);
    setModalError(null);

    try {
      // Delete all paid entries
      for (const entry of paidEntries) {
        await entryMockService.delete(entry.id);
      }
      
      // Refresh entries list
      const updatedEntries = await entryMockService.getAll();
      setEntries(updatedEntries);
      
      alert(`Successfully deleted ${paidEntries.length} paid record${paidEntries.length > 1 ? 's' : ''}.`);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to delete paid records');
    } finally {
      setModalLoading(false);
    }
  };

  // Filter, search, and sort logic
  const filteredEntries = useMemo(() => {
    let filtered = entries;
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(e =>
        e.entryName.toLowerCase().includes(s) ||
        (typeof e.borrower === 'object' && 'firstName' in e.borrower && `${e.borrower.firstName} ${e.borrower.lastName}`.toLowerCase().includes(s)) ||
        (typeof e.borrower === 'object' && 'groupName' in e.borrower && e.borrower.groupName.toLowerCase().includes(s)) ||
        (typeof e.lender === 'object' && 'firstName' in e.lender && `${e.lender.firstName} ${e.lender.lastName}`.toLowerCase().includes(s))
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(e => e.status === statusFilter);
    }
    if (typeFilter) {
      filtered = filtered.filter(e => e.transactionType === typeFilter);
    }
    filtered = [...filtered].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      switch (sortKey) {
        case 'entryName':
          aVal = a.entryName;
          bVal = b.entryName;
          break;
        case 'transactionType':
          aVal = a.transactionType;
          bVal = b.transactionType;
          break;
        case 'amountBorrowed':
          aVal = a.amountBorrowed;
          bVal = b.amountBorrowed;
          break;
        case 'amountRemaining':
          aVal = a.amountRemaining;
          bVal = b.amountRemaining;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          break;
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
    return filtered;
  }, [entries, search, statusFilter, typeFilter, sortKey, sortDir]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="payments-record pro-ui">
      <div className="page-header pro-header">
        <div>
          <h1>All Payments Record</h1>
          <p className="subtitle">Track, search, and manage all your payment entries in one place.</p>
        </div>
        <div style={{ display: 'flex', gap: '1em' }}>
          <button 
            className="btn-danger" 
            style={{ 
              backgroundColor: '#dc3545',
              color: 'white',
              padding: '0.7em 1.5em',
              fontSize: '0.95em'
            }}
            onClick={handleDeleteAllPaidRecords}
            disabled={modalLoading || entries.filter(e => e.status === 'PAID').length === 0}
          >
            <span style={{ marginRight: '0.5em' }}>🗑️</span> Clear Paid Records
          </button>
          <button className="btn-primary pro-create-btn" onClick={() => setShowCreateModal(true)}>
            <span className="plus-icon">＋</span> New Entry
          </button>
        </div>
      </div>

      <div className="filters-bar pro-filters">
        <input
          type="text"
          placeholder="Search by name, borrower, lender..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PAID">Paid</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="Straight Expense">Straight</option>
          <option value="Installment Expense">Installment</option>
          <option value="Group Expense">Group</option>
        </select>
      </div>

      {modalLoading ? (
        <div className="loading-overlay"><div className="spinner"></div></div>
      ) : filteredEntries.length === 0 ? (
        <div className="empty-state pro-empty">
          <img src="/empty-state.svg" alt="No entries" className="empty-illustration" />
          <p>No entries found.<br/>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="entries-table pro-table-wrapper">
          <table className="pro-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('entryName')} className="sortable">Entry Name</th>
                <th onClick={() => handleSort('transactionType')} className="sortable">Type</th>
                <th>Borrower</th>
                <th onClick={() => handleSort('amountBorrowed')} className="sortable">Amount</th>
                <th onClick={() => handleSort('amountRemaining')} className="sortable">Remaining</th>
                <th onClick={() => handleSort('status')} className="sortable">Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="pro-row">
                  <td><span className="entry-name">{entry.entryName}</span></td>
                  <td><span className={`type-badge type-${entry.transactionType.replace(/\s/g, '').toLowerCase()}`}>{entry.transactionType}</span></td>
                  <td>
                    {'groupName' in entry.borrower
                      ? <span className="borrower-group">{entry.borrower.groupName}</span>
                      : 'firstName' in entry.borrower
                        ? <span className="borrower-person">{entry.borrower.firstName} {entry.borrower.lastName}</span>
                        : ''}
                  </td>
                  <td><span className="amount">₱{entry.amountBorrowed.toLocaleString()}</span></td>
                  <td><span className="amount-remaining">₱{entry.amountRemaining.toLocaleString()}</span></td>
                  <td>
                    <span className={`status-badge status-${entry.status.toLowerCase()}`}>{entry.status}</span>
                  </td>
                  <td>
                    <Link to={`/entry/${entry.id}`} className="btn-link pro-view-btn">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateEntryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateEntry}
        people={people}
        groups={groups}
        onGroupsUpdated={refreshGroups}
      />
      {modalError && (
        <div className="modal-overlay"><div className="modal-content error-message">{modalError}</div></div>
      )}
    </div>
  );
}

export default AllPaymentsRecord

