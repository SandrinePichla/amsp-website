import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import type { User, AuthError } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  prenom: string | null
  role: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [prenom, setPrenom] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfil = async (userId: string) => {
    const { data } = await supabase
      .from('profils')
      .select('prenom, role')
      .eq('id', userId)
      .single()
    setPrenom(data?.prenom || null)
    setRole(data?.role || null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchProfil(u.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchProfil(u.id)
      else { setPrenom(null); setRole(null) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setPrenom(null)
    setRole(null)
  }

  return (
    <AuthContext.Provider value={{ user, prenom, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
