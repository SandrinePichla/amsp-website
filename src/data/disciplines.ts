import { Swords, Hand, Wind, Shield, Sparkles, CircleDot } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Discipline {
  id: string;
  name: string;
  shortName: string;
  icon: LucideIcon;
  description: string;
  schedule: string;
  teacher: string;
  color: string;
}

export const disciplines: Discipline[] = [
  {
    id: "karate",
    name: "Karaté Shotokan",
    shortName: "Karaté",
    icon: Hand,
    description:
      "Art martial japonais traditionnel axé sur les techniques de frappe, coups de pied, et blocages. Le Shotokan se caractérise par ses positions profondes et ses mouvements puissants.",
    schedule: "Mardi & Jeudi — 18h30 à 20h00",
    teacher: "Sensei à confirmer",
    color: "hsl(0 72% 50%)",
  },
  {
    id: "viet-vo-dao",
    name: "Viet Vo Dao",
    shortName: "Viet Vo Dao",
    icon: Swords,
    description:
      "Art martial vietnamien complet combinant techniques de main, de pied, projections et travail aux armes traditionnelles. Un art riche et spectaculaire.",
    schedule: "Lundi & Mercredi — 19h00 à 20h30",
    teacher: "Maître à confirmer",
    color: "hsl(43 80% 55%)",
  },
  {
    id: "tai-chi",
    name: "Tai Chi Chuan",
    shortName: "Tai Chi",
    icon: Wind,
    description:
      "Art martial interne chinois pratiqué pour ses bienfaits sur la santé et la méditation. Mouvements lents et fluides qui développent l'équilibre et la sérénité.",
    schedule: "Mercredi & Vendredi — 10h00 à 11h30",
    teacher: "Professeur à confirmer",
    color: "hsl(180 60% 45%)",
  },
  {
    id: "aikido",
    name: "Aïkido",
    shortName: "Aïkido",
    icon: Shield,
    description:
      "Art martial japonais défensif fondé sur l'utilisation de l'énergie de l'adversaire. Techniques de projection et d'immobilisation sans opposition directe.",
    schedule: "Mardi & Vendredi — 20h00 à 21h30",
    teacher: "Sensei à confirmer",
    color: "hsl(220 70% 55%)",
  },
  {
    id: "wutao-qigong",
    name: "Wutao — Qi Gong — Tai Chi Chuan",
    shortName: "Wutao / Qi Gong",
    icon: Sparkles,
    description:
      "Pratiques énergétiques combinant le Wutao (danse du corps en mouvement), le Qi Gong (travail de l'énergie vitale) et le Tai Chi Chuan pour un bien-être global.",
    schedule: "Samedi — 9h30 à 11h00",
    teacher: "Professeur à confirmer",
    color: "hsl(280 60% 55%)",
  },
  {
    id: "epee",
    name: "Épée",
    shortName: "Épée",
    icon: CircleDot,
    description:
      "Pratique de l'escrime à l'épée, discipline d'adresse et de stratégie. Développe la précision, la vitesse et la concentration.",
    schedule: "Samedi — 11h00 à 12h30",
    teacher: "Maître d'armes à confirmer",
    color: "hsl(45 90% 50%)",
  },
];
