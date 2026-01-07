import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Entry, Person, Group } from '../types'
import { peopleApi, groupsApi, entriesApi, paymentsApi } from '../services/api'
import { personMockService } from '../services/personMockService'
import { groupMockService } from '../services/groupMockService'

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
      try {
        peopleData = await peopleApi.getAll()
      } catch (err) {
        // fallback to in-memory mock service when backend unavailable
        peopleData = await personMockService.getAll()
      }
      try {
        groupsData = await groupsApi.getAll()
      } catch (err) {
        groupsData = await groupMockService.getAll()
      }
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
      // Note: No getAll endpoint available, entries are loaded individually
      // This function is kept for consistency but won't do anything
      console.warn('refreshEntries: No getAll endpoint available. Entries loaded individually.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh entries')
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
      try {
        const peopleData = await peopleApi.getAll()
        setPeople(peopleData)
      } catch (err) {
        const peopleData = await personMockService.getAll()
        setPeople(peopleData)
      }
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
      try {
        const groupsData = await groupsApi.getAll()
        setGroups(groupsData)
      } catch (err) {
        const groupsData = await groupMockService.getAll()
        setGroups(groupsData)
      }
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
      // Try backend API first, otherwise use mock service
      let updatedGroup: Group | undefined = undefined
      try {
        // groupsApi may not implement addMember on backend; use any to attempt
        updatedGroup = await (groupsApi as any).addMember(groupID, personID)
      } catch (err) {
        const person = (await personMockService.getById(personID.toString())) as Person | undefined
        if (person) {
          updatedGroup = await groupMockService.addMember(groupID.toString(), person) as Group | undefined
        }
      }
      if (updatedGroup) {
        setGroups(groups.map(group => group.groupID === groupID ? updatedGroup as any : group))
      } else {
        // As a safety, refresh groups
        await refreshGroups()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add group member'
      setError(errorMessage)
      throw err
    }
  }

  const removeGroupMember = async (groupID: number, personID: number) => {
    try {
      setError(null)
      try {
        // try backend
        await (groupsApi as any).removeMember(groupID, personID)
        const updatedGroup = await groupsApi.getById(groupID)
        setGroups(groups.map(group => group.groupID === groupID ? updatedGroup : group))
      } catch (err) {
        // fallback to mock
        await groupMockService.removeMember(groupID.toString(), personID.toString())
        const updatedGroup = await groupMockService.getById(groupID.toString())
        setGroups(groups.map(group => group.groupID === groupID ? (updatedGroup as any) : group))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove group member'
      setError(errorMessage)
      throw err
    }
  }

  // Payment operations
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

