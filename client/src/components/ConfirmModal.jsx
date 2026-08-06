import { useState } from "react";

function ConfirmModal({
  show,
  title,
  message,
  confirmText = "Confirm",
  confirmVariant = "primary",
  requireRemarks = false,
  onConfirm,
  onCancel,
  loading = false,
}) {
  const [remarks, setRemarks] = useState("");

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(remarks);
    setRemarks("");
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header border-bottom">
            <h5 className="modal-title fw-bold">{title}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onCancel}
              disabled={loading}
            ></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body py-3">
              <p className="mb-3">{message}</p>

              {requireRemarks && (
                <div className="mb-2">
                  <label className="form-label small fw-semibold text-muted">
                    Remarks / Reason <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Enter remarks or reason for decision..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    required={requireRemarks}
                  ></textarea>
                </div>
              )}
            </div>

            <div className="modal-footer border-top">
              <button
                type="button"
                className="btn btn-light"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn btn-${confirmVariant} px-4`}
                disabled={loading}
              >
                {loading ? (
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  ></span>
                ) : null}
                {confirmText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
