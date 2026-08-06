import { useState } from "react";
import { useNavigate } from "react-router-dom";
import VisitorForm from "../components/VisitorForm";
import { createVisitorApi } from "../services/visitorService";

function AddVisitor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError("");

    try {
      await createVisitorApi(formData);
      navigate("/visitors");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to register visitor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid py-2">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <VisitorForm onSubmit={handleSubmit} loading={loading} error={error} />
        </div>
      </div>
    </div>
  );
}

export default AddVisitor;
