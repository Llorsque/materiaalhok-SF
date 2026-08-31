import { useState } from "react";
import { LoanFlow } from "../user/LoanFlow";
import { fmt } from "../../utils/format";

// Externe verhuur (v1.12.0). Vraagt eerst de huurder-info uit en laat
// daarna dezelfde LoanFlow lopen als voor interne bonnen — maar dan met
// `user` weggelaten en een `createBonOverride` die het external-blok in de
// payload plakt. De bedragen (huurprijs, borg) worden pas in de
// bevestigstap gevraagd, zodat de admin de bedragen kan afstemmen op het
// gekozen materiaal.
//
// Een externe bon is per besluit altijd een reservering; direct uitlenen
// bestaat niet voor externen. Er is dus geen loan-vs-reservation keuze.
export function ExternalBonFlow({ eq, materialsLoading, materialsError, refreshMaterials, sets, bons, refreshBons, setBonsError, onCancel, onDone }) {
  const [org, setOrg] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  // Bedragen leven hier zodat ze bij re-render van LoanFlow's confirm-step
  // vers zijn wanneer createBonOverride wordt aangeroepen. Ze worden pas
  // in de bevestigstap ingevuld via een input in confirmExtras.
  const [rentalPrice, setRentalPrice] = useState("0");
  const [deposit, setDeposit] = useState("0");
  const [flowStarted, setFlowStarted] = useState(false);
  const [formError, setFormError] = useState(null);

  const parseAmount = (s) => {
    if (typeof s !== "string") return NaN;
    const t = s.replace(",", ".").trim();
    if (t === "") return 0;
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
  };

  const rentalPriceNum = parseAmount(rentalPrice);
  const depositNum = parseAmount(deposit);
  const rentalPriceInvalid = !Number.isFinite(rentalPriceNum) || rentalPriceNum < 0;
  const depositInvalid = !Number.isFinite(depositNum) || depositNum < 0;

  const startFlow = () => {
    const orgTrim = org.trim();
    const emailTrim = email.trim();
    if (!orgTrim) { setFormError("Organisatienaam is verplicht."); return; }
    if (!emailTrim) { setFormError("E-mailadres is verplicht."); return; }
    setFormError(null);
    setFlowStarted(true);
  };

  if (flowStarted) {
    // Wordt bij elke render opnieuw opgebouwd — zo capteert de override
    // de laatste bedragen-invoer uit de bevestigstap.
    const externalPayload = {
      org: org.trim(),
      contact: contact.trim() || null,
      phone: phone.trim() || null,
      email: email.trim(),
      rental_price: Number.isFinite(rentalPriceNum) ? rentalPriceNum : 0,
      deposit: Number.isFinite(depositNum) ? depositNum : 0,
    };
    const confirmExtras = (
      <>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-purple-200">
          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Externe reservering</p>
          <p className="mt-1 text-base font-bold text-gray-900">{externalPayload.org}</p>
          {externalPayload.contact && <p className="text-sm text-gray-600">{externalPayload.contact}</p>}
          <p className="text-sm text-gray-600">{externalPayload.email}</p>
          {externalPayload.phone && <p className="text-sm text-gray-600">{externalPayload.phone}</p>}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Bedragen</h3>
            <p className="text-xs text-gray-500">Bepaal nu wat je in rekening brengt. Laat op 0 staan als er geen bedrag geldt.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Huurprijs (€)</label>
              <input
                type="text"
                inputMode="decimal"
                className={`w-full px-4 py-2.5 rounded-xl border bg-gray-50 text-sm focus:outline-none focus:ring-2 ${rentalPriceInvalid ? "border-red-300 focus:ring-red-500" : "border-gray-200 focus:ring-purple-500"}`}
                value={rentalPrice}
                onChange={(e) => setRentalPrice(e.target.value)}
              />
              {rentalPriceInvalid && <p className="mt-1 text-xs text-red-600">Vul een geldig bedrag in (0 of hoger).</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Borg (€)</label>
              <input
                type="text"
                inputMode="decimal"
                className={`w-full px-4 py-2.5 rounded-xl border bg-gray-50 text-sm focus:outline-none focus:ring-2 ${depositInvalid ? "border-red-300 focus:ring-red-500" : "border-gray-200 focus:ring-purple-500"}`}
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
              />
              {depositInvalid && <p className="mt-1 text-xs text-red-600">Vul een geldig bedrag in (0 of hoger).</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-purple-50 rounded-xl px-3 py-2">
              <p className="text-xs text-purple-700">Huurprijs</p>
              <p className="font-semibold text-gray-900">{fmt(Number.isFinite(rentalPriceNum) ? rentalPriceNum : 0)}</p>
            </div>
            <div className="bg-purple-50 rounded-xl px-3 py-2">
              <p className="text-xs text-purple-700">Borg</p>
              <p className="font-semibold text-gray-900">{fmt(Number.isFinite(depositNum) ? depositNum : 0)}</p>
            </div>
          </div>
          {Number.isFinite(rentalPriceNum) && rentalPriceNum > 0 && <p className="text-xs text-gray-500">Betaalstatus wordt "open" bij aanmaken.</p>}
        </div>
      </>
    );

    return <LoanFlow
      eq={eq}
      materialsLoading={materialsLoading}
      materialsError={materialsError}
      refreshMaterials={refreshMaterials}
      sets={sets}
      bons={bons}
      refreshBons={refreshBons}
      setBonsError={setBonsError}
      user={undefined}
      isReservation={true}
      createBonOverride={(base) => ({ ...base, external: externalPayload })}
      confirmExtras={confirmExtras}
      onCancel={() => setFlowStarted(false)}
      onDone={onDone}
    />;
  }

  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 pb-24">
    <div className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-xl mx-auto px-5 py-4 flex items-center justify-between">
        <button onClick={onCancel} className="flex items-center gap-2 text-blue-600 text-sm font-medium">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          Terug
        </button>
        <h2 className="text-lg font-bold text-gray-900">Nieuwe externe verhuur</h2>
        <div className="w-16"/>
      </div>
    </div>

    <div className="max-w-xl mx-auto px-5 py-6 space-y-5">
      <div className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-3 text-sm text-purple-900">
        Externe verhuur is altijd een reservering. Vul eerst de huurder in.
        Periode, materiaal en bedragen komen daarna.
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Huurder</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Organisatie *</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Bijv. Voetbalclub De Bal"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contactpersoon</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Naam contactpersoon"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefoon</label>
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="06-..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
            <input
              type="email"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="naam@organisatie.nl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
      </div>

      {formError && <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-800">
        {formError}
      </div>}

      <button
        onClick={startFlow}
        className="w-full py-4 rounded-2xl bg-purple-500 text-white font-bold text-base hover:bg-purple-600 shadow-lg"
      >
        Kies periode en materiaal {"\u2192"}
      </button>
    </div>
  </div>;
}
