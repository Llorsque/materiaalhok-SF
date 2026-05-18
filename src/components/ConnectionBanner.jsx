// Toont een laad- of foutbalk bovenaan een scherm dat backend-data gebruikt.
// `resource` bepaalt het label in de loading-indicator ("Materialen laden...",
// "Gebruikers laden...", etc.). De foutboodschap is generiek omdat de oorzaak
// (server bereikbaar of niet) los staat van de resource.

export function ConnectionBanner({ loading, error, onRetry, resource = "Materialen" }) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-4">
        <div className="flex items-start gap-3">
          <span className="text-lg flex-shrink-0">{"\u26a0\ufe0f"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-800">
              Geen verbinding met de server. Zet de laptop in het materiaalhok aan en wacht tot 'ie volledig is opgestart. Probeer daarna opnieuw.
            </p>
            <p className="text-xs text-red-600 mt-1 font-mono break-all">{error}</p>
          </div>
          <button
            onClick={onRetry}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 flex-shrink-0"
          >
            Opnieuw proberen
          </button>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 mb-4 text-sm text-blue-700 flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
        {resource} laden...
      </div>
    );
  }
  return null;
}
