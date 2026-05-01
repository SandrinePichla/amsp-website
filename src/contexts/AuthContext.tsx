import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/supabaseClient'
import type { User, AuthError } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  prenom: string | null
  role: string | null
  disciplines: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [prenom, setPrenom] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [disciplines, setDisciplines] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfil = async (userId: string) => {
    const { data } = await supabase
      .from('profils')
      .select('prenom, role, disciplines')
      .eq('id', userId)
      .single()
    setPrenom(data?.prenom || null)
    setRole(data?.role || null)
    setDisciplines(data?.disciplines || null)
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
      else { setPrenom(null); setRole(null); setDisciplines(null) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string): Promise<{ error: AuthError | Error | null }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error }

    // Vérifier le rôle avant d'autoriser l'accès
    const { data: profil } = await supabase
      .from('profils')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profil?.role === 'en_attente') {
      await supabase.auth.signOut()
      return { error: new Error("Votre compte est en attente de validation par l'administrateur.") }
    }
    if (profil?.role === 'refuse') {
      await supabase.auth.signOut()
      return { error: new Error("Votre demande d'adhésion a été refusée. Contactez-nous pour plus d'informations.") }
    }

    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setPrenom(null)
    setRole(null)
    setDisciplines(null)
  }

  return (
    <AuthContext.Provider value={{ user, prenom, role, disciplines, loading, signIn, signOut }}>
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
