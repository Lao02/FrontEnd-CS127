const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

async function apiRequest<T>(
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

// PEOPLE API

export const peopleApi = {
  getAll: async (): Promise<Person[]> => {
    return apiRequest<Person[]>('/persons')
  },

  getById: async (id: number): Promise<Person> => {
    return apiRequest<Person>(`/persons/${id}`)
  },

  create: async (person: Omit<Person, 'personID'>): Promise<Person> => {
    return apiRequest<Person>('/persons', {
      method: 'POST',
      body: JSON.stringify(person),
    })
  },

  update: async (id: number, person: Partial<Person>): Promise<Person> => {
    return apiRequest<Person>(`/persons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(person),
    })
  },

  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/persons/${id}`, {
      method: 'DELETE',
    })
  },
}

// GROUPS API

export const groupsApi = {
  getAll: async (): Promise<Group[]> => {
    return apiRequest<Group[]>('/groups')
  },

  getById: async (id: number): Promise<Group> => {
    return apiRequest<Group>(`/groups/${id}`)
  },

  create: async (group: Omit<Group, 'groupID'>): Promise<Group> => {
    return apiRequest<Group>('/groups', {
      method: 'POST',
      body: JSON.stringify(group),
    })
  },

  update: async (id: number, group: Partial<Group>): Promise<Group> => {
    return apiRequest<Group>(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(group),
    })
  },

  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/groups/${id}`, {
      method: 'DELETE',
    })
  },
}

// ENTRIES API

export const entriesApi = {
  getAll: async (): Promise<Entry[]> => {
    const grouped = await apiRequest<{ [key: string]: Entry[] }>('/entry/all')
    // Flatten the grouped object into a single array
    return Object.values(grouped).flat()
  },

  getById: async (id: string): Promise<Entry> => {
    return apiRequest<Entry>(`/entry/${id}`)
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
    if (transactionType === 'Installment Expense') {
      return entriesApi.createInstallment(formData)
    } else if (transactionType === 'Group Expense') {
      return entriesApi.createGroupExpense(formData)
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
