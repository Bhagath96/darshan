import type { UserRole } from '@/types'

/**
 * Demo accounts shown on the login page. They mirror src/api/data/users.json;
 * plain-text passwords are acceptable only because this is a mock.
 */
export const DEMO_ACCOUNTS: ReadonlyArray<{
  username: string
  password: string
  role: UserRole
  note: string
}> = [
  { username: 'devotee', password: 'devotee123', role: 'DEVOTEE', note: 'Anil Kumar' },
  { username: 'lakshmi', password: 'lakshmi123', role: 'DEVOTEE', note: 'Lakshmi Nair' },
  { username: 'staff', password: 'staff123', role: 'STAFF', note: 'Sree Krishna Temple' },
  { username: 'admin', password: 'admin123', role: 'ADMIN', note: 'All temples' },
]
