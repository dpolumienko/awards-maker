import { describe, expect, it } from 'vitest'
import { HOST_SCOPES, KICK_HOST_SCOPES, KICK_VOTER_SCOPES, VOTER_SCOPES, hostScopes, scopeList } from '../server/utils/users'

describe('hostScopes', () => {
  it('tells a host sign-in from a voter one, on both providers', () => {
    expect(hostScopes('twitch', HOST_SCOPES.join(' '))).toBe(true)
    expect(hostScopes('twitch', VOTER_SCOPES.join(' '))).toBe(false)
    expect(hostScopes('kick', KICK_HOST_SCOPES.join(' '))).toBe(true)
    expect(hostScopes('kick', KICK_VOTER_SCOPES.join(' '))).toBe(false)
  })

  it('matches whole scopes: Twitch subscriptions are not Kick channel:read', () => {
    expect(hostScopes('kick', 'user:read:email channel:read:subscriptions')).toBe(false)
  })

  it('treats no account as no host', () => {
    expect(hostScopes('kick', null)).toBe(false)
  })
})

describe('scopeList', () => {
  it('reads Twitch lists and Kick strings alike, and falls back to what was asked', () => {
    expect(scopeList(['a', 'b'], ['x'])).toBe('a b')
    expect(scopeList('user:read channel:read', ['x'])).toBe('user:read channel:read')
    expect(scopeList(undefined, ['user:read'])).toBe('user:read')
  })
})
