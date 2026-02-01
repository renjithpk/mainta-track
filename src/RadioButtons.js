import React from "react";
import './RadioButtons.css'; // Import the CSS file

const RadioButtons = ({ view, setView }) => {
  return (
    <div className="radio-buttons-container">
      <p className="radio-buttons-description">Select the view:</p>
      <label className="radio-button">
        <input type="radio" value="maintenance" checked={view === "maintenance"} onChange={() => setView("maintenance")} />
        Maintenance Sheet
      </label>
      <label className="radio-button">
        <input type="radio" value="transaction" checked={view === "transaction"} onChange={() => setView("transaction")} />
        Transactions Sheet
      </label>
      <label className="radio-button">
        <input type="radio" value="result" checked={view === "result"} onChange={() => setView("result")} />
        Result Sheet
      </label>
      <label className="radio-button">
        <input type="radio" value="watercharges" checked={view === "watercharges"} onChange={() => setView("watercharges")} />
        Water Charges
      </label>
    </div>
  );
};

export default RadioButtons;