// src/components/trips/TripTicketPrint.jsx
// Renders a formal, printable trip ticket — one copy can be given to
// the driver, another to the requesting staff member, per standard
// government audit/monitoring practice.
//
// Usage: render off-screen or in a modal, then call window.print()
// scoped to this component via the print stylesheet below.

export default function TripTicketPrint({ ticket, copyLabel = "Driver's Copy" }) {
  if (!ticket) return null;

  const passengerCount = ticket.passengers?.length || 0;

  return (
    <div className="trip-ticket-print bg-white text-black p-8 max-w-2xl mx-auto" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .trip-ticket-print, .trip-ticket-print * { visibility: visible; }
          .trip-ticket-print { position: absolute; top: 0; left: 0; width: 100%; margin: 0; padding: 24px; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="text-center border-b-2 border-black pb-3 mb-4">
        <p className="text-xs">Republic of the Philippines</p>
        <p className="font-bold text-sm">BUKIDNON STATE UNIVERSITY</p>
        <p className="text-xs">Physical Plant and Maintenance Unit — Motorpool Section</p>
        <p className="font-bold text-base mt-2 tracking-wide">TRIP TICKET</p>
        <p className="text-xs mt-1 inline-block bg-gray-200 px-2 py-0.5 rounded">{copyLabel}</p>
      </div>

      {/* Ticket meta */}
      <div className="flex justify-between text-xs mb-4">
        <span>Ticket No: <strong>{ticket.id?.slice(-8).toUpperCase()}</strong></span>
        <span>Status: <strong className="uppercase">{ticket.status}</strong></span>
      </div>

      {/* Requestor info */}
      <table className="w-full text-sm mb-4 border-collapse">
        <tbody>
          <tr>
            <td className="py-1 pr-3 text-gray-600 w-40 align-top">Requested By:</td>
            <td className="py-1 font-medium">{ticket.requestorName}</td>
          </tr>
          <tr>
            <td className="py-1 pr-3 text-gray-600 align-top">Office/Department:</td>
            <td className="py-1">{ticket.requestorDept}</td>
          </tr>
          <tr>
            <td className="py-1 pr-3 text-gray-600 align-top">Destination:</td>
            <td className="py-1 font-medium">{ticket.destination}</td>
          </tr>
          <tr>
            <td className="py-1 pr-3 text-gray-600 align-top">Purpose:</td>
            <td className="py-1">{ticket.purpose}</td>
          </tr>
          <tr>
            <td className="py-1 pr-3 text-gray-600 align-top">Date of Travel:</td>
            <td className="py-1">{ticket.dateTravel}</td>
          </tr>
          <tr>
            <td className="py-1 pr-3 text-gray-600 align-top">Time Departure / Return:</td>
            <td className="py-1">{ticket.timeDepart || "—"} to {ticket.timeReturn || "—"}</td>
          </tr>
          <tr>
            <td className="py-1 pr-3 text-gray-600 align-top">Number of Passengers:</td>
            <td className="py-1 font-medium">{passengerCount}</td>
          </tr>
          <tr>
            <td className="py-1 pr-3 text-gray-600 align-top">Number of Vehicles:</td>
            <td className="py-1 font-medium">{ticket.numberOfVehicles || ticket.assignments?.length || 1}</td>
          </tr>
        </tbody>
      </table>

      {/* Passenger list */}
      {passengerCount > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold uppercase mb-1 border-b border-gray-300 pb-1">Authorized Passengers</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-1 w-8">#</th>
                <th className="text-left py-1">Name</th>
                <th className="text-left py-1">Designation</th>
              </tr>
            </thead>
            <tbody>
              {ticket.passengers.map((p, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1">{i + 1}</td>
                  <td className="py-1">{p.name}</td>
                  <td className="py-1">{p.designation || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Vehicle / Driver assignments */}
      <div className="mb-4">
        <p className="text-xs font-bold uppercase mb-1 border-b border-gray-300 pb-1">Vehicle(s) & Driver(s) Assigned</p>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-1 w-8">#</th>
              <th className="text-left py-1">Plate No.</th>
              <th className="text-left py-1">Vehicle</th>
              <th className="text-left py-1">Driver</th>
            </tr>
          </thead>
          <tbody>
            {(ticket.assignments && ticket.assignments.length > 0) ? (
              ticket.assignments.map((a, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1">{i + 1}</td>
                  <td className="py-1 font-mono">{a.plateNumber}</td>
                  <td className="py-1">{a.vehicleModel}</td>
                  <td className="py-1">{a.driverName || "—"}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4} className="py-2 text-center text-gray-400">Not yet assigned</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Odometer readings (if completed) */}
      {ticket.status === "completed" && (
        <table className="w-full text-sm mb-4">
          <tbody>
            <tr>
              <td className="py-1 pr-3 text-gray-600 w-40">Start Odometer:</td>
              <td className="py-1">{ticket.startKM?.toLocaleString()} km</td>
            </tr>
            <tr>
              <td className="py-1 pr-3 text-gray-600">End Odometer:</td>
              <td className="py-1">{ticket.endKM?.toLocaleString()} km</td>
            </tr>
            <tr>
              <td className="py-1 pr-3 text-gray-600">Distance Traveled:</td>
              <td className="py-1 font-medium">{ticket.fuelConsumed?.toLocaleString()} km</td>
            </tr>
          </tbody>
        </table>
      )}

      {ticket.remarks && (
        <div className="mb-4 text-sm">
          <p className="text-gray-600 text-xs font-bold uppercase mb-1">Remarks</p>
          <p>{ticket.remarks}</p>
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-8 mt-10 text-xs">
        <div className="text-center">
          <div className="border-t border-black pt-1 mt-10">
            {ticket.requestorName}
            <p className="text-gray-500">Requesting Party</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-1 mt-10">
            {ticket.assignments?.[0]?.driverName || "_______________________"}
            <p className="text-gray-500">Driver</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-1 mt-10">
            &nbsp;
            <p className="text-gray-500">Motorpool Section-in-Charge</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-1 mt-10">
            &nbsp;
            <p className="text-gray-500">PPMU Head (Approved By)</p>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-gray-400 mt-8">
        Generated by BukSU Motorpool Fleet Management System — {new Date().toLocaleDateString("en-PH")}
      </p>
    </div>
  );
}
