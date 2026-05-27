export interface Icd10Item {
  code: string
  name: string
}

export async function fetchICD10(query: string): Promise<Icd10Item[]> {
  const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(query)}&maxList=8`
  const data = await fetch(url).then((r) => r.json())
  const items = (data[3] || []) as [string, string][]
  return items.slice(0, 8).map(([code, name]) => ({ code, name }))
}

export async function fetchRxNorm(query: string): Promise<string[]> {
  const url = `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(query)}`
  const data = await fetch(url).then((r) => r.json())
  const names: string[] = []
  const seen = new Set<string>()
  for (const g of data.drugGroup?.conceptGroup || []) {
    for (const p of g.conceptProperties || []) {
      if (!seen.has(p.name)) {
        seen.add(p.name)
        names.push(p.name)
      }
      if (names.length >= 8) break
    }
    if (names.length >= 8) break
  }
  return names
}
