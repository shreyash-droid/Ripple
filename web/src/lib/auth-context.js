import { createContext, useContext } from 'react'

/* The context and its hook, kept apart from the provider component that fills
   it in (components/AuthProvider.jsx). Same reason the rest of lib/ has no
   JSX: a module that exports both a component and a plain function opts the
   whole file out of fast refresh. */

export const AuthContext = createContext(null)

/** { user, token, signedIn, signIn, signOut } */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
