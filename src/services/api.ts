const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `HTTP error! status: ${response.status}`)
  }

  // Handle empty responses (like DELETE)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T
  }

  return response.json()
}

// Import types
import { Person, Group, Entry, Payment } from '../types'

// Helper to map backend personId to frontend personID
const mapPersonFromBackend = (person: any): Person => {
  console.log('Mapping person from backend:', person);
  const mapped = {
    ...person,
    personID: person.personId || person.personID,
  };
  console.log('Mapped person:', mapped);
  return mapped;
}

// PEOPLE API

export const peopleApi = {
  getAll: async (): Promise<Person[]> => {
    const persons = await apiRequest<any[]>('/persons')
    return persons.map(mapPersonFromBackend)
  },

  getById: async (id: number): Promise<Person> => {
    const person = await apiRequest<any>(`/persons/${id}`)
    return mapPersonFromBackend(person)
  },

  create: async (person: Omit<Person, 'personID'>): Promise<Person> => {
    const result = await apiRequest<any>('/persons', {
      method: 'POST',
      body: JSON.stringify(person),
    })
    return mapPersonFromBackend(result)
  },

  update: async (id: number, person: Partial<Person>): Promise<Person> => {
    const result = await apiRequest<any>(`/persons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(person),
    })
    return mapPersonFromBackend(result)
  },

  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/persons/${id}`, {
      method: 'DELETE',
    })
  },
}

// Helper to map backend groupId to frontend groupID
const mapGroupFromBackend = (group: any): Group => ({
  ...group,
  groupID: group.groupId || group.groupID,
})

// GROUPS API

export const groupsApi = {
  getAll: async (): Promise<Group[]> => {
    const groups = await apiRequest<any[]>('/groups')
    return groups.map(mapGroupFromBackend)
  },

  getById: async (id: number): Promise<Group> => {
    const group = await apiRequest<any>(`/groups/${id}`)
    return mapGroupFromBackend(group)
  },

  create: async (group: Omit<Group, 'groupID'>): Promise<Group> => {
    const result = await apiRequest<any>('/groups', {
      method: 'POST',
      body: JSON.stringify(group),
    })
    return mapGroupFromBackend(result)
  },

  update: async (id: number, group: Partial<Group>): Promise<Group> => {
    const result = await apiRequest<any>(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(group),
    })
    return mapGroupFromBackend(result)
  },

  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/groups/${id}`, {
      method: 'DELETE',
    })
  },
}

// Helper to map Entry from backend (fixes nested person/group IDs)
const mapEntryFromBackend = (entry: any): Entry => {
  console.log('Mapping entry from backend:', entry)
  const mapped: any = { ...entry }
  
  // Map payment allocations if present
  if (entry.paymentAllocations && Array.isArray(entry.paymentAllocations)) {
    mapped.paymentAllocations = entry.paymentAllocations.map((allocation: any) => ({
      ...allocation,
      groupMemberDto: allocation.groupMemberDto ? mapPersonFromBackend(allocation.groupMemberDto) : allocation.groupMemberDto
    }))
  }
  
  // Map payments if present
  if (entry.payments && Array.isArray(entry.payments)) {
    mapped.payments = entry.payments.map((payment: any) => ({
      ...payment,
      payeeDto: payment.payeeDto ? mapPersonFromBackend(payment.payeeDto) : payment.payeeDto
    }))
  }
  
  console.log('Mapped entry:', mapped)
  return mapped
}

// ENTRIES API

export const entriesApi = {
  getAll: async (): Promise<Entry[]> => {
    try {
      console.log('Fetching all entries...')
      const grouped = await apiRequest<{ [key: string]: any[] }>('/entry/all')
      console.log('Received grouped entries:', grouped)
      const flattened = Object.values(grouped).flat()
      console.log('Flattened entries count:', flattened.length)
      const mapped = flattened.map(mapEntryFromBackend)
      console.log('Mapped entries:', mapped)
      return mapped
    } catch (error) {
      console.error('Error fetching entries:', error)
      throw error
    }
  },

  getById: async (id: string): Promise<Entry> => {
    const entry = await apiRequest<any>(`/entry/${id}`)
    return mapEntryFromBackend(entry)
  },


  createStraight: async (formData: FormData): Promise<Entry> => {
    const url = `${API_BASE_URL}/entry/straight`
    const response = await fetch(url, {
      method: 'POST',
      body: formData, 
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.message || `HTTP error! status: ${response.status}`)
    }
    return response.json()
  },

  createInstallment: async (formData: FormData): Promise<Entry> => {
    const url = `${API_BASE_URL}/entry/installment`
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.message || `HTTP error! status: ${response.status}`)
    }
    return response.json()
  },

  createGroupExpense: async (formData: FormData): Promise<Entry> => {
    const url = `${API_BASE_URL}/entry/group-expense`
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.message || `HTTP error! status: ${response.status}`)
    }
    return response.json()
  },

  createGroupExpenseWithAllocations: async (formData: FormData): Promise<Entry> => {
    const url = `${API_BASE_URL}/entry/group-expense-with-allocations`
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.message || `HTTP error! status: ${response.status}`)
    }
    return response.json()
  },

  create: async (formData: FormData): Promise<Entry> => {
    const transactionType = formData.get('transactionType') as string
    if (transactionType === 'INSTALLMENT') {
      return entriesApi.createInstallment(formData)
    } else if (transactionType === 'GROUP') {
      return entriesApi.createGroupExpenseWithAllocations(formData)
    } else {
      return entriesApi.createStraight(formData)
    }
  },

  update: async (id: string, formData: FormData): Promise<Entry> => {
    const url = `${API_BASE_URL}/entry/${id}`
    const response = await fetch(url, {
      method: 'PUT',
      body: formData,
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.message || `HTTP error! status: ${response.status}`)
    }
    return response.json()
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest<void>(`/entry/${id}`, {
      method: 'DELETE',
    })
  },

  // Delete all paid entries
  deleteAllPaid: async (): Promise<void> => {
    return apiRequest<void>('/entry/paid', {
      method: 'DELETE',
    })
  },
}

// PAYMENTS API

export const paymentsApi = {
  getAll: async (): Promise<Payment[]> => {
    return apiRequest<Payment[]>('/payments/all')
  },

  getById: async (paymentId: number): Promise<Payment> => {
    return apiRequest<Payment>(`/payments/${paymentId}`)
  },

  getByEntryId: async (entryId: string): Promise<Payment[]> => {
    return apiRequest<Payment[]>(`/payments/entry/${entryId}`)
  },

  getByPayeeId: async (payeeId: number): Promise<Payment[]> => {
    return apiRequest<Payment[]>(`/payments/by/${payeeId}`)
  },

  create: async (formData: FormData): Promise<Payment> => {
    const url = `${API_BASE_URL}/payments`
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.message || `HTTP error! status: ${response.status}`)
    }
    return response.json()
  },

  update: async (_paymentId: number, _payment: Partial<Payment>): Promise<Payment> => {
    console.warn('Payment update not implemented in backend')
    throw new Error('Payment update not supported. Delete and create new payment instead.')
  },

  delete: async (paymentId: number): Promise<void> => {
    return apiRequest<void>(`/payments/${paymentId}`, {
      method: 'DELETE',
    })
  },

  deleteAllPayments: async (): Promise<void> => {
    return apiRequest<void>('/payments/all', {
      method: 'DELETE',
    })
  },

  deleteByPayee: async (personId: number): Promise<void> => {
    return apiRequest<void>(`/payments/by/${personId}`, {
      method: 'DELETE',
    })
  },

  deleteByEntry: async (entryId: string): Promise<void> => {
    return apiRequest<void>(`/payments/entry/${entryId}`, {
      method: 'DELETE',
    })
  },

  // Get payments for specific allocation
  getPaymentsForAllocation: async (entryId: string, memberPersonId: number): Promise<Payment[]> => {
    return apiRequest<Payment[]>(`/payments/allocation/${entryId}/${memberPersonId}`)
  },
}
