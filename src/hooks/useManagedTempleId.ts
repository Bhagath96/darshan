import { useQueryParams } from './useQueryParams'
import { useTemples } from './useTemples'
import { selectCurrentUser } from '@/store/auth/authSlice'
import { useAppSelector } from '@/store/hooks'

/**
 * The temple an admin screen works on: staff always get their own temple; admins get
 * ?temple= from the URL when it names a real temple, otherwise the first temple.
 */
export function useManagedTempleId(): string {
  const user = useAppSelector(selectCurrentUser)
  const temples = useTemples()
  const { get } = useQueryParams()
  if (user?.templeId) return user.templeId
  const asked = get('temple')
  return temples.data.some((x) => x.id === asked) ? asked : (temples.data[0]?.id ?? '')
}
