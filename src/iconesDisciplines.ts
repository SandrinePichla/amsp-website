import { Sparkles, CircleDot, Shield, Wind, Swords, Hand, Leaf, Waves } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface IconeConfig {
  icone: LucideIcon
  couleur: string
  bg: string
}

export const iconesDisciplines: Record<string, IconeConfig> = {
  Shield: {
    icone: Shield,
    couleur: 'text-red-600',
    bg: 'bg-red-100/60'
  },
  Swords: {
    icone: Swords,
    couleur: 'text-yellow-600',
    bg: 'bg-yellow-100/60'
  },
  Wind: {
    icone: Wind,
    couleur: 'text-teal-600',
    bg: 'bg-teal-100/60'
  },
  Leaf: {
    icone: Leaf,
    couleur: 'text-green-600',
    bg: 'bg-green-100/60'
  },
  Waves: {
    icone: Waves,
    couleur: 'text-purple-600',
    bg: 'bg-purple-100/60'
  },
  Hand: {
    icone: Hand,
    couleur: 'text-blue-600',
    bg: 'bg-blue-100/60'
  },
  CircleDot: {
    icone: CircleDot,
    couleur: 'text-orange-600',
    bg: 'bg-orange-100/60'
  },
  Sparkles: {
    icone: Sparkles,
    couleur: 'text-pink-600',
    bg: 'bg-pink-100/60'
  },
}