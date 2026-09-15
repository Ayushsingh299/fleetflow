const API_URL = "http://127.0.0.1:8000";

export async function getVehicles() {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}/vehicles/`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch vehicles: ${response.status}`);
  }

  return response.json();
}