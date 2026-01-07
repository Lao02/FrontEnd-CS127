import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Entry, Person, Group } from '../types'
import { peopleApi, groupsApi, entriesApi, paymentsApi, apiRequest } from '../services/api'

interface AppContextType {
  // Data
  entries: Entry[]
  people: Person[]
  groups: Group[]
  
  // Loading states
  loading: boolean
  error: string | null
  
  // Entry operations
  addEntry: (formData: FormData) => Promise<void>
  updateEntry: (id: string, formData: FormData) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  getEntry: (id: string) => Entry | undefined
  getEntryById: (id: string) => Promise<Entry>
  getAllEntries: () => Promise<Entry[]>
  deleteAllPaidEntries: () => Promise<void>
  refreshEntries: () => Promise<void>
  
  // Person operations
  addPerson: (person: Omit<Person, 'personID'>) => Promise<void>
  updatePerson: (id: number, person: Partial<Person>) => Promise<void>
  deletePerson: (id: number) => Promise<void>
  refreshPeople: () => Promise<void>
  
  // Group operations
  addGroup: (group: Omit<Group, 'groupID'>) => Promise<void>
  updateGroup: (id: number, group: Partial<Group>) => Promise<void>
  deleteGroup: (id: number) => Promise<void>
  refreshGroups: () => Promise<void>
  addGroupMember: (groupID: number, personID: number) => Promise<void>
  removeGroupMember: (groupID: number, personID: number) => Promise<void>
  
  // Payment operations
  addPayment: (formData: FormData) => Promise<void>
  updatePayment: (paymentId: number, formData: FormData) => Promise<void>
  deletePayment: (paymentId: number) => Promise<void>
  getPaymentsByEntryId: (entryId: string) => Promise<any[]>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load initial data on mount
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Note: No getAll endpoint for entries - entries loaded individually
      let peopleData: Person[] = []
      let groupsData: Group[] = []
      peopleData = await peopleApi.getAll()
      groupsData = await groupsApi.getAll()
      setPeople(peopleData)
      setGroups(groupsData)
      setEntries([]) // Entries loaded individually when needed
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      console.error('Error loading initial data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Entry operations
  const refreshEntries = async () => {
    try {
      const allEntries = await entriesApi.getAll()
      setEntries(allEntries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh entries')
      throw err
    }
  }

  const getAllEntries = async () => {
    try {
      const allEntries = await entriesApi.getAll()
      setEntries(allEntries)
      return allEntries
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get all entries')
      throw err
    }
  }

  const getEntryById = async (id: string) => {
    try {
      const entry = await entriesApi.getById(id)
      // Update in local state if found
      const existingIndex = entries.findIndex(e => e.id === id)
      if (existingIndex >= 0) {
        setEntries(entries.map(e => e.id === id ? entry : e))
      } else {
        setEntries([...entries, entry])
      }
      return entry
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get entry')
      throw err
    }
  }

  const deleteAllPaidEntries = async () => {
    try {
      setError(null)
      await entriesApi.deleteAllPaid()
      // Remove all paid entries from local state
      setEntries(entries.filter(entry => entry.status !== 'PAID'))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete paid entries'
      setError(errorMessage)
      throw err
    }
  }

  const addEntry = async (formData: FormData) => {
    try {
      setError(null)
      const newEntry = await entriesApi.create(formData)
      setEntries([...entries, newEntry])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create entry'
      setError(errorMessage)
      throw err
    }
  }

  const updateEntry = async (id: string, formData: FormData) => {
    try {
      setError(null)
      const updated = await entriesApi.update(id, formData)
      setEntries(entries.map(entry => entry.id === id ? updated : entry))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update entry'
      setError(errorMessage)
      throw err
    }
  }

  const deleteEntry = async (id: string) => {
    try {
      setError(null)
      await entriesApi.delete(id)
      setEntries(entries.filter(entry => entry.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete entry'
      setError(errorMessage)
      throw err
    }
  }

  const getEntry = (id: string) => {
    return entries.find(entry => entry.id === id)
  }

  // Person operations
  const refreshPeople = async () => {
    try {
      const peopleData = await peopleApi.getAll()
      setPeople(peopleData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh people')
      throw err
    }
  }

  const addPerson = async (person: Omit<Person, 'personID'>) => {
    try {
      setError(null)
      const newPerson = await peopleApi.create(person)
      setPeople([...people, newPerson])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create person'
      setError(errorMessage)
      throw err
    }
  }

  const updatePerson = async (id: number, updatedPerson: Partial<Person>) => {
    try {
      setError(null)
      const updated = await peopleApi.update(id, updatedPerson)
      setPeople(people.map(person => person.personID === id ? updated : person))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update person'
      setError(errorMessage)
      throw err
    }
  }

  const deletePerson = async (id: number) => {
    try {
      setError(null)
      await peopleApi.delete(id)
      setPeople(people.filter(person => person.personID !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete person'
      setError(errorMessage)
      throw err
    }
  }

  // Group operations
  const refreshGroups = async () => {
    try {
      const groupsData = await groupsApi.getAll()
      setGroups(groupsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh groups')
      throw err
    }
  }

  const addGroup = async (group: Omit<Group, 'groupID'>) => {
    try {
      setError(null)
      const newGroup = await groupsApi.create(group)
      setGroups([...groups, newGroup])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create group'
      setError(errorMessage)
      throw err
    }
  }

  const updateGroup = async (id: number, updatedGroup: Partial<Group>) => {
    try {
      setError(null)
      const updated = await groupsApi.update(id, updatedGroup)
      setGroups(groups.map(group => group.groupID === id ? updated : group))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update group'
      setError(errorMessage)
      throw err
    }
  }

  const deleteGroup = async (id: number) => {
    try {
      setError(null)
      await groupsApi.delete(id)
      setGroups(groups.filter(group => group.groupID !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete group'
      setError(errorMessage)
      throw err
    }
  }

  const addGroupMember = async (groupID: number, personID: number) => {
    try {
      setError(null)
      // Backend API endpoint for adding group members
      await apiRequest(`/groups/${groupID}/members/${personID}`, {
        method: 'POST',
      })
      // Refresh the group to get updated members list
      await refreshGroups()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add group member'
      setError(errorMessage)
      throw err
    }
  }

  const removeGroupMember = async (groupID: number, personID: number) => {
    try {
      setError(null)
      // Backend API endpoint for removing group members
      await apiRequest(`/groups/${groupID}/members/${personID}`, {
        method: 'DELETE',
      })
      // Refresh the group to get updated members list
      await refreshGroups()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove group member'
      setError(errorMessage)
      throw err
    }
  }

  // Payment operations
  const getPaymentsByEntryId = async (entryId: string) => {
    try {
      const payments = await paymentsApi.getByEntryId(entryId)
      return payments
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get payments')
      throw err
    }
  }

  const addPayment = async (formData: FormData) => {
    try {
      setError(null)
      await paymentsApi.create(formData)
      // Refresh entries to get updated status and amountRemaining from backend
      const entryId = formData.get('entryId') as string
      if (entryId) {
        const entry = entries.find(e => e.id === entryId)
        if (entry) {
          // Fetch updated entry
          const updatedEntry = await entriesApi.getById(entryId)
          setEntries(entries.map(e => e.id === entryId ? updatedEntry : e))
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create payment'
      setError(errorMessage)
      throw err
    }
  }

  const updatePayment = async (_paymentId: number, _formData: FormData) => {
    setError('Payment update not supported by backend. Delete and create new payment instead.')
    throw new Error('Payment update not supported by backend. Delete and create new payment instead.')
  }

  const deletePayment = async (paymentId: number) => {
    try {
      setError(null)
      await paymentsApi.delete(paymentId)
      // Note: Entry update should be handled separately if needed
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete payment'
      setError(errorMessage)
      throw err
    }
  }

  return (
    <AppContext.Provider
      value={{
        entries,
        people,
        groups,
        loading,
        error,
        addEntry,
        updateEntry,
        deleteEntry,
        getEntry,
        getEntryById,
        getAllEntries,
        deleteAllPaidEntries,
        refreshEntries,
        addPerson,
        updatePerson,
        deletePerson,
        refreshPeople,
        addGroup,
        updateGroup,
        deleteGroup,
        refreshGroups,
        addGroupMember,
        removeGroupMember,
        addPayment,
        updatePayment,
        deletePayment,
        getPaymentsByEntryId,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

