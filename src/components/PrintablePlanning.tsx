// Composants partagés entre Planning.tsx et Inscription.tsx
// Capturés par html2canvas pour générer les images téléchargeables

export const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export const PALETTE = [
  { bg: "hsl(0,48%,38%)",    border: "hsl(0,48%,25%)",    text: "#fff" },
  { bg: "hsl(35,48%,38%)",   border: "hsl(35,48%,25%)",   text: "#fff" },
  { bg: "hsl(205,32%,36%)",  border: "hsl(205,32%,23%)",  text: "#fff" },
  { bg: "hsl(18,46%,36%)",   border: "hsl(18,46%,23%)",   text: "#fff" },
  { bg: "hsl(150,28%,30%)",  border: "hsl(150,28%,18%)",  text: "#fff" },
  { bg: "hsl(278,26%,36%)",  border: "hsl(278,26%,23%)",  text: "#fff" },
  { bg: "hsl(22,40%,34%)",   border: "hsl(22,40%,21%)",   text: "#fff" },
  { bg: "hsl(188,30%,30%)",  border: "hsl(188,30%,18%)",  text: "#fff" },
];

export const timeToMinutes = (t: string) => {
  if (!t) return 0;
  const colonMatch = t.match(/^(\d{1,2}):(\d{2})/);
  if (colonMatch) return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
  const hMatch = t.match(/^(\d{1,2})[Hh](\d{0,2})$/);
  if (hMatch) return parseInt(hMatch[1]) * 60 + (parseInt(hMatch[2] || "0") || 0);
  return 0;
};

export interface Cours {
  _id: string;
  jour: string;
  heureDebut: string;
  heureFin: string;
  lieu: string;
  niveau: string;
  ages: string[];
  discipline: { nom: string; nomCourt: string };
}

export interface Tarif {
  _id: string;
  discipline: { nom: string };
  categorie: string;
  jours: string[];
  prixAnnuel: number;
  echeancier: string;
  ordre: number;
}

export interface TarifSpecial {
  _id: string;
  titre: string;
  lignes: string[];
  ordre: number;
}

export const buildColorMap = (cours: Cours[]): Record<string, (typeof PALETTE)[number]> => {
  const names = Array.from(new Set(cours.map((c) => c.discipline?.nom).filter(Boolean)));
  return Object.fromEntries(names.map((name, i) => [name, PALETTE[i % PALETTE.length]]));
};

// ─── PrintableCalendar ────────────────────────────────────────────────────────

export const PrintableCalendar = ({
  cours,
  colorMap,
}: {
  cours: Cours[];
  colorMap: Record<string, (typeof PALETTE)[number]>;
}) => {
  const activeDays = DAYS.filter((day) =>
    cours.some((c) => c.jour?.toLowerCase() === day.toLowerCase())
  );

  const byDay = activeDays.map((day) => ({
    day,
    courses: cours
      .filter((c) => c.jour?.toLowerCase() === day.toLowerCase())
      .sort((a, b) => timeToMinutes(a.heureDebut) - timeToMinutes(b.heureDebut)),
  }));

  const perRow = byDay.length <= 4 ? byDay.length : 3;
  const rows: (typeof byDay)[] = [];
  for (let i = 0; i < byDay.length; i += perRow) {
    rows.push(byDay.slice(i, i + perRow));
  }

  return (
    <div style={{ width: 1060, backgroundColor: "#ffffff", fontFamily: "Arial, 'Helvetica Neue', sans-serif", boxSizing: "border-box" }}>

      <div style={{ backgroundColor: "#4a1515", padding: "26px 40px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 50, height: 50, borderRadius: "50%", border: "1.5px solid rgba(212,160,23,0.55)", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(212,160,23,0.10)" }}>
            <span style={{ fontSize: 17, fontWeight: 900, color: "#d4a017", letterSpacing: -0.5 }}>AM</span>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 8.5, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: 3, textTransform: "uppercase" }}>
              Arts Martiaux &amp; Sports de Paix
            </p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#ffffff", letterSpacing: 0.5, lineHeight: 1.15 }}>
              AMSP
            </p>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#ffffff", letterSpacing: 0.5 }}>
            Planning des cours
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 9.5, color: "rgba(255,255,255,0.45)", letterSpacing: 2, textTransform: "uppercase" }}>
            Horaires · Saison en cours
          </p>
        </div>
        <div style={{ width: 190 }} />
      </div>

      <div style={{ height: 3, background: "linear-gradient(90deg, #4a1515 0%, #d4a017 25%, #d4a017 75%, #4a1515 100%)" }} />

      <div style={{ padding: "24px 32px 18px" }}>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 14, marginBottom: ri < rows.length - 1 ? 14 : 0 }}>
            {row.map(({ day, courses }) => (
              <div key={day} style={{ flex: 1, borderRadius: 10, overflow: "hidden", border: "1px solid #ede5e3", boxShadow: "0 2px 10px rgba(74,21,21,0.08)" }}>
                <div style={{ backgroundColor: "#4a1515", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "#ffffff", letterSpacing: 2.5, textTransform: "uppercase" }}>
                    {day}
                  </p>
                  <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.45)", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "2px 8px", fontWeight: 600 }}>
                    {courses.length} cours
                  </span>
                </div>
                <div style={{ backgroundColor: "#fdfaf9", padding: "10px 10px 6px" }}>
                  {courses.map((c) => {
                    const color = colorMap[c.discipline?.nom] || PALETTE[0];
                    const meta = [c.niveau, c.ages?.join(", ")].filter(Boolean).join(" · ");
                    return (
                      <div key={c._id} style={{ marginBottom: 7, borderRadius: 7, overflow: "hidden", display: "flex", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", border: "1px solid #ede8e5" }}>
                        <div style={{ width: 4, backgroundColor: color.bg, flexShrink: 0 }} />
                        <div style={{ flex: 1, padding: "7px 10px", backgroundColor: "#ffffff", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1a1a1a", lineHeight: 1.25 }}>
                              {c.discipline?.nom}
                            </p>
                            {(meta || c.lieu) && (
                              <p style={{ margin: "3px 0 0", fontSize: 9.5, color: "#7a7068", lineHeight: 1.4 }}>
                                {[meta, c.lieu].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                          <div style={{ textAlign: "right", marginLeft: 10, flexShrink: 0 }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: color.bg, lineHeight: 1 }}>
                              {c.heureDebut}
                            </p>
                            {c.heureFin && (
                              <p style={{ margin: "2px 0 0", fontSize: 9, color: "#9ca3af", lineHeight: 1 }}>
                                {c.heureFin}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {row.length < perRow &&
              Array.from({ length: perRow - row.length }).map((_, i) => (
                <div key={`empty-${i}`} style={{ flex: 1 }} />
              ))}
          </div>
        ))}
      </div>

      <div style={{ margin: "4px 32px 0", paddingTop: 14, borderTop: "1px solid #ede5e3", textAlign: "center" }}>
        {Object.entries(colorMap).map(([name, color]) => (
          <span key={name} style={{ display: "inline-block", margin: "0 4px 5px", border: `1px solid ${color.bg}`, borderRadius: 20, overflow: "hidden" }}>
            <table style={{ borderCollapse: "collapse", height: 26 }}><tbody><tr>
              <td style={{ padding: "0 4px 0 11px", verticalAlign: "middle" }}>
                <span style={{ fontSize: 10, color: color.bg, display: "block" }}>●</span>
              </td>
              <td style={{ padding: "0 11px 0 4px", verticalAlign: "middle" }}>
                <span style={{ fontSize: 10, color: "#374151", fontWeight: 600, display: "block" }}>{name}</span>
              </td>
            </tr></tbody></table>
          </span>
        ))}
      </div>

      <p style={{ margin: "14px 32px 0", paddingBottom: 24, fontSize: 8.5, color: "#9ca3af", textAlign: "center", fontStyle: "italic", lineHeight: 1.65 }}>
        Les horaires sont donnés à titre indicatif, ils peuvent être modifiés en fonction des inscriptions
        et suivant le planning des manifestations prévues et non déplaçables.
      </p>
    </div>
  );
};

// ─── PrintableTarifs ──────────────────────────────────────────────────────────

export const PrintableTarifs = ({
  tarifs,
  tarifsSpeciaux,
  colorMap,
}: {
  tarifs: Tarif[];
  tarifsSpeciaux: TarifSpecial[];
  colorMap: Record<string, (typeof PALETTE)[number]>;
}) => {
  const disciplines = Array.from(new Set(tarifs.map((t) => t.discipline?.nom).filter(Boolean)));

  return (
    <div style={{ width: 900, backgroundColor: "#ffffff", fontFamily: "Arial, 'Helvetica Neue', sans-serif", boxSizing: "border-box" }}>

      <div style={{ backgroundColor: "#4a1515", padding: "26px 40px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 50, height: 50, borderRadius: "50%", border: "1.5px solid rgba(212,160,23,0.55)", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(212,160,23,0.10)" }}>
            <span style={{ fontSize: 17, fontWeight: 900, color: "#d4a017", letterSpacing: -0.5 }}>AM</span>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 8.5, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: 3, textTransform: "uppercase" }}>
              Arts Martiaux &amp; Sports de Paix
            </p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#ffffff", letterSpacing: 0.5, lineHeight: 1.15 }}>
              AMSP
            </p>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#ffffff", letterSpacing: 0.5 }}>
            Tarifs &amp; Cotisations
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 9.5, color: "rgba(255,255,255,0.45)", letterSpacing: 2, textTransform: "uppercase" }}>
            Saison en cours · Adhésion fédération incluse
          </p>
        </div>
        <div style={{ width: 190 }} />
      </div>

      <div style={{ height: 3, background: "linear-gradient(90deg, #4a1515 0%, #d4a017 25%, #d4a017 75%, #4a1515 100%)" }} />

      <div style={{ textAlign: "center", padding: "18px 40px 0" }}>
        <span style={{ display: "inline-block", border: "1.5px solid #b45309", borderRadius: 8, padding: "6px 20px", fontSize: 11, fontWeight: 700, color: "#b45309", letterSpacing: 1.5, textTransform: "uppercase" }}>
          2 séances gratuites avant inscription définitive
        </span>
      </div>

      <div style={{ padding: "18px 40px 0" }}>
        {disciplines.map((disc) => {
          const tarifsDisc = tarifs.filter((t) => t.discipline?.nom === disc);
          const color = colorMap[disc] || PALETTE[0];
          return (
            <div key={disc} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 24, height: 2, borderRadius: 2, backgroundColor: color.bg }} />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: color.bg, letterSpacing: 0.5 }}>{disc}</p>
                <div style={{ flex: 1, height: 1, backgroundColor: "#ede5e3" }} />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {tarifsDisc.map((t) => (
                  <div key={t._id} style={{ flex: "1 1 220px", display: "flex", overflow: "hidden", borderRadius: 8, border: "1px solid #ede8e5", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                    <div style={{ width: 4, flexShrink: 0, backgroundColor: color.bg }} />
                    <div style={{ flex: 1, padding: "10px 14px", backgroundColor: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        {t.categorie && <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{t.categorie}</p>}
                        {t.jours?.length > 0 && <p style={{ margin: "3px 0 0", fontSize: 9.5, color: "#7a7068" }}>📅 {t.jours.join(", ")}</p>}
                        {t.echeancier && <p style={{ margin: "4px 0 0", fontSize: 9, color: "#9ca3af" }}>Chèques : {t.echeancier}</p>}
                      </div>
                      <div style={{ textAlign: "right", marginLeft: 12, flexShrink: 0 }}>
                        <span style={{ fontSize: 24, fontWeight: 900, color: color.bg, lineHeight: 1 }}>{t.prixAnnuel ?? "—"}</span>
                        {t.prixAnnuel && <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 2 }}>€</span>}
                        <p style={{ margin: "2px 0 0", fontSize: 9, color: "#9ca3af" }}>/an</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ margin: "4px 40px 0", borderRadius: 10, border: "1px solid #ede5e3", overflow: "hidden" }}>
        <div style={{ backgroundColor: "#f7f4f3", borderBottom: "1px solid #ede5e3", padding: "10px 18px" }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#1a1a1a" }}>Réductions</p>
        </div>
        <div style={{ display: "flex" }}>
          <div style={{ flex: 1, padding: "12px 18px", borderRight: "1px solid #ede5e3" }}>
            <p style={{ margin: "0 0 6px", fontSize: 9, fontWeight: 700, color: "#7a7068", textTransform: "uppercase", letterSpacing: 1.5 }}>Multi-cours</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <p style={{ margin: 0, fontSize: 11, color: "#374151" }}>Pour 2 cours au choix</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#4a1515" }}>−10%</p>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: 9, color: "#9ca3af" }}>du tarif total</p>
          </div>
          <div style={{ flex: 1, padding: "12px 18px" }}>
            <p style={{ margin: "0 0 6px", fontSize: 9, fontWeight: 700, color: "#7a7068", textTransform: "uppercase", letterSpacing: 1.5 }}>Tarifs famille</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <p style={{ margin: 0, fontSize: 11, color: "#374151" }}>Pour 2 personnes</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#4a1515" }}>−10%</p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <p style={{ margin: 0, fontSize: 11, color: "#374151" }}>Pour 3 personnes</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#4a1515" }}>−20€</p>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: 9, color: "#9ca3af" }}>du tarif total</p>
          </div>
        </div>
      </div>

      {tarifsSpeciaux.length > 0 && (
        <div style={{ margin: "14px 40px 0", borderRadius: 10, border: "1px solid #e8d5b7", backgroundColor: "#fffbf0", padding: "14px 18px" }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 800, color: "#b45309" }}>✦ Tarifs spéciaux</p>
          <div style={{ display: "flex", gap: 24 }}>
            {tarifsSpeciaux.map((ts) => (
              <div key={ts._id} style={{ flex: 1 }}>
                <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{ts.titre}</p>
                {ts.lignes?.map((ligne, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
                    <span style={{ marginTop: 4, width: 5, height: 5, borderRadius: "50%", backgroundColor: "#b45309", flexShrink: 0, display: "inline-block" }} />
                    <p style={{ margin: 0, fontSize: 10.5, color: "#6b7280" }}>{ligne}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ margin: "14px 40px 0", paddingBottom: 24, fontSize: 8.5, color: "#9ca3af", textAlign: "center", fontStyle: "italic", lineHeight: 1.65 }}>
        Tarifs donnés à titre indicatif pour la saison en cours. Sous réserve de modifications.
      </p>
    </div>
  );
};
