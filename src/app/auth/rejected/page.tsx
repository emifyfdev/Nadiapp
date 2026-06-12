export default function RejectedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🚫</span>
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Acceso denegado</h1>
        <p className="text-slate-500 text-sm">
          Tu cuenta no fue aprobada. Si creés que es un error, contactá al administrador.
        </p>
      </div>
    </div>
  )
}
