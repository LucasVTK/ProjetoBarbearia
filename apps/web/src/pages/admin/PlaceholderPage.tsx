export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-zinc-500 text-sm">Módulo em construção</p>
        <p className="text-zinc-700 text-xs mt-1">{title}</p>
      </div>
    </div>
  )
}
