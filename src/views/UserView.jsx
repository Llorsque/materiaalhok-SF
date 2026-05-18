import { useState } from "react";
import { UserHome } from "./user/UserHome";
import { LoanFlow } from "./user/LoanFlow";
import { ReturnFlow } from "./user/ReturnFlow";

export function UserView({ eq, materialsLoading, materialsError, refreshMaterials, sets, bons, bonsLoading, bonsError, setBonsError, refreshBons, addLog, branding, onLogout, user }) {
  const [mode, setMode] = useState(null);
  const [isReservation, setIsReservation] = useState(false);
  const [done, setDone] = useState(null);

  const handleModeChange = (newMode, reservation) => {
    setMode(newMode);
    setIsReservation(!!reservation);
  };

  const handleCancel = () => {
    setMode(null);
    setIsReservation(false);
  };

  const handleDone = (result) => {
    setDone(result);
    setMode(null);
    setIsReservation(false);
    setTimeout(() => setDone(null), 4000);
  };

  if (mode === "loan") {
    return <LoanFlow eq={eq} materialsLoading={materialsLoading} materialsError={materialsError} refreshMaterials={refreshMaterials} sets={sets} bons={bons} refreshBons={refreshBons} setBonsError={setBonsError} addLog={addLog} user={user} isReservation={isReservation} onCancel={handleCancel} onDone={handleDone}/>;
  }
  if (mode === "return") {
    return <ReturnFlow eq={eq} materialsLoading={materialsLoading} materialsError={materialsError} refreshMaterials={refreshMaterials} bons={bons} refreshBons={refreshBons} setBonsError={setBonsError} addLog={addLog} user={user} onCancel={handleCancel} onDone={handleDone}/>;
  }
  return <UserHome user={user} branding={branding} bons={bons} bonsLoading={bonsLoading} bonsError={bonsError} refreshBons={refreshBons} onLogout={onLogout} onModeChange={handleModeChange} done={done}/>;
}
