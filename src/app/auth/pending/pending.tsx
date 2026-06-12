export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⏳</span>
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Cuenta pendiente de aprobación</h1>
        <p className="text-slate-500 text-sm">
          Tu cuenta fue creada correctamente. El administrador va a revisar tu solicitud y te habilitará el acceso en breve.
        </p>
      </div>
    </div>
  )
}