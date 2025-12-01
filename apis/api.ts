import apiBasePath from "@/config/apiPathConfig";

export class ApiError extends Error {
  constructor(public status: number, public data: unknown) {
    super(
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : `Request failed: ${status}`
    );
    this.name = "ApiError";
  }
}

interface ApiRequestConfig {
  internal?: boolean;
}

export async function apiRequest(
  path: string,
  options: RequestInit = {},
  token?: string,
  config: ApiRequestConfig = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const baseUrl = config.internal ? "" : `${apiBasePath}`;
    const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
    if (!res.ok) {
      let errorData: unknown = {};

      try {
        errorData = await res.json();
      } catch {
        errorData = { message: res.statusText };
      }

      throw new ApiError(res.status, errorData);
    }
    return res.json();
  } catch (error) {
    // If it's already an ApiError, throw it as is
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors, timeouts, etc.
    if (error instanceof TypeError) {
      throw new Error("Network error. Please check your connection.");
    }

    // Handle other unexpected errors
    throw new Error(
      error instanceof Error ? error.message : "An unexpected error occurred"
    );
  }
}
