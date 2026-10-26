import { describe, expect, it } from 'vitest'
import { authApi, resetDb } from '@/api'
import { issueToken } from '@/api/session'
import { actAs } from '../utils/api'

const devotee = { username: 'devotee', password: 'devotee123', portal: 'devotee' } as const

describe('authApi.login', () => {
  it('logs in with a demo user and never returns the password', async () => {
    const session = await authApi.login(devotee)
    expect(session.user).toMatchObject({ username: 'devotee', role: 'DEVOTEE', name: 'Anil Kumar' })
    expect(session.user).not.toHaveProperty('password')
    expect(session.token).toMatch(/^mock\./)
  })

  it('ignores case and spaces in the username', async () => {
    await expect(
      authApi.login({ username: '  ADMIN ', password: 'admin123', portal: 'staff' }),
    ).resolves.toMatchObject({
      user: { role: 'ADMIN' },
    })
  })

  it('gives the same message for an unknown user and a wrong password', async () => {
    await expect(authApi.login({ ...devotee, password: 'nope' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Incorrect username or password.',
    })
    await expect(authApi.login({ ...devotee, username: 'nobody' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Incorrect username or password.',
    })
  })

  it('keeps devotees and staff on their own login page', async () => {
    await expect(
      authApi.login({ username: 'staff', password: 'staff123', portal: 'devotee' }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: expect.stringContaining('use the staff login'),
    })
    await expect(authApi.login({ ...devotee, portal: 'staff' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: expect.stringContaining('use the devotee login'),
    })
  })

  it('does not reveal the account type when the password is wrong', async () => {
    await expect(
      authApi.login({ username: 'admin', password: 'x', portal: 'devotee' }),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })
})

describe('authApi.me', () => {
  it('restores the user behind a token', async () => {
    const { token } = await authApi.login({
      username: 'staff',
      password: 'staff123',
      portal: 'staff',
    })
    await expect(authApi.me(token)).resolves.toMatchObject({
      username: 'staff',
      templeId: 'tm-krishna',
    })
  })

  it('rejects a malformed or expired token', async () => {
    await expect(authApi.me('garbage')).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    const old = issueToken('u-devotee-1', Date.now() - 8 * 24 * 60 * 60 * 1000)
    await expect(authApi.me(old)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})

describe('authApi.register', () => {
  const signUp = {
    name: 'Meera Menon',
    phone: '+91 97450 11223',
    username: 'Meera_m',
    password: 'temple2026',
  }

  it('creates a devotee account, logs it in and survives a reload of the mock server', async () => {
    const session = await authApi.register(signUp)
    expect(session.user).toMatchObject({
      username: 'meera_m',
      phone: '9745011223',
      role: 'DEVOTEE',
      templeId: null,
    })

    resetDb() // what a page reload does
    await expect(
      authApi.login({ username: 'meera_m', password: 'temple2026', portal: 'devotee' }),
    ).resolves.toBeTruthy()
    await expect(authApi.me(session.token)).resolves.toMatchObject({ name: 'Meera Menon' })
  })

  it('refuses a username or mobile number that is already used', async () => {
    await expect(authApi.register({ ...signUp, username: 'devotee' })).rejects.toMatchObject({
      code: 'CONFLICT',
    })
    await expect(authApi.register({ ...signUp, phone: '9847012345' })).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })

  it.each([
    ['a weak password', { password: 'short1' }],
    ['a password without digits', { password: 'onlyletters' }],
    ['a bad username', { username: 'no spaces!' }],
    ['a bad phone', { phone: '12345' }],
    ['a name with digits', { name: 'R2D2' }],
  ])('rejects %s', async (_label, change) => {
    await expect(authApi.register({ ...signUp, ...change })).rejects.toMatchObject({
      code: 'VALIDATION',
    })
  })
})

describe('authApi.updateProfile and changePassword', () => {
  it('updates name and phone for the logged-in user', async () => {
    actAs('devotee')
    await expect(
      authApi.updateProfile({ name: '  Anil   K ', phone: '9847099999' }),
    ).resolves.toMatchObject({
      name: 'Anil K',
      phone: '9847099999',
    })
  })

  it("won't take another account's phone number", async () => {
    actAs('devotee')
    await expect(
      authApi.updateProfile({ name: 'Anil', phone: '9995012345' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('needs a login', async () => {
    await expect(authApi.updateProfile({ name: 'X Y', phone: '9847099999' })).rejects.toMatchObject(
      {
        code: 'UNAUTHORIZED',
      },
    )
  })

  it('changes the password only when the current one is right', async () => {
    actAs('devotee')
    await expect(
      authApi.changePassword({ currentPassword: 'wrong', newPassword: 'newpass123' }),
    ).rejects.toMatchObject({ code: 'VALIDATION' })
    await authApi.changePassword({ currentPassword: 'devotee123', newPassword: 'newpass123' })
    await expect(authApi.login(devotee)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    await expect(authApi.login({ ...devotee, password: 'newpass123' })).resolves.toBeTruthy()
  })
})
