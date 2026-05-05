interface StepCardProps {
  label: string
  value: string | number
  sub?: string
}

export default function StepCard({ label, value, sub }: StepCardProps) {
  return (
    <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-1">
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-3xl font-bold text-indigo-700">{value}</span>
      {sub && <span className="text-sm text-gray-400">{sub}</span>}
    </div>
  )
}
