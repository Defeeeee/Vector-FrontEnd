"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL;

export async function login(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    const response = await fetch(`${AUTH_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.detail || "Invalid credentials" };
    }

    const token = data.access_token;

    if (!token) {
      return { error: "Authentication failed: No token received" };
    }

    // Store JWT in HttpOnly cookie
    (await cookies()).set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day (standard session)
      path: "/",
    });

    if (data.refresh_token) {
        (await cookies()).set("refresh_token", data.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: "/",
        });
    }

  } catch (error) {
    console.error("Login error:", error);
    return { error: "An unexpected error occurred" };
  }

  redirect("/dashboard");
}

export async function register(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const first_name = formData.get("first_name");
  const last_name = formData.get("last_name");

  if (!email || !password || !first_name || !last_name) {
    return { error: "Todos los campos son obligatorios" };
  }

  try {
    const response = await fetch(`${AUTH_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, first_name, last_name }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.detail || "Error en la registración" };
    }

    const token = data.access_token;

    if (token) {
      (await cookies()).set("session_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        path: "/",
      });
    }

    if (data.refresh_token) {
      (await cookies()).set("refresh_token", data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }

    // If we have a token, we could redirect, but let's return success 
    // to show the "Verify Email" message as requested.
    return { success: true };

  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Ocurrió un error inesperado" };
  }
}

export async function recoverPassword(formData: FormData) {
  const email = formData.get("email");

  if (!email) {
    return { error: "Email es requerido" };
  }

  try {
    const response = await fetch(`${AUTH_URL}/recover`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { error: data.detail || "Error enviando correo de recuperación" };
    }

    return { success: true };
  } catch (error) {
    console.error("Recovery error:", error);
    return { error: "Ocurrió un error inesperado" };
  }
}

export async function updatePassword(formData: FormData) {
  const password = formData.get("password");
  const token = await getSessionToken();

  if (!password) {
    return { error: "La contraseña es requerida" };
  }

  if (!token) {
    return { error: "No hay una sesión activa para actualizar la contraseña" };
  }

  try {
    const response = await fetch(`${AUTH_URL}/update-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { error: data.detail || "Error actualizando la contraseña" };
    }

    return { success: true };
  } catch (error) {
    console.error("Update password error:", error);
    return { error: "Ocurrió un error inesperado" };
  }
}

export async function logout(arg?: string | FormData) {
  const redirectTo = typeof arg === "string" ? arg : "/";
  (await cookies()).delete("session_token");
  (await cookies()).delete("refresh_token");
  redirect(redirectTo);
}

export async function getGoogleLoginUrl() {
  try {
    const response = await fetch(`${AUTH_URL}/login/google`);
    const data = await response.json();
    
    if (!response.ok) {
      return { error: data.detail || "Error getting Google login URL" };
    }
    
    return { url: data.url };
  } catch (error) {
    console.error("Google login error:", error);
    return { error: "An unexpected error occurred" };
  }
}

export async function getSessionToken() {
  return (await cookies()).get("session_token")?.value;
}

export async function setSession(token: string, refresh_token?: string, maxAge: number = 60 * 60 * 24) {
  const cookieStore = await cookies();
  
  // Try to get the root domain for cookies
  let domain = undefined;
  if (process.env.NODE_ENV === "production") {
    // We want .fdiaznem.com.ar so it works on all subdomains
    domain = ".fdiaznem.com.ar";
  }
  
  console.log(`Setting session cookie. Domain=${domain} maxAge=${maxAge}`);

  cookieStore.set("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: maxAge,
    path: "/",
    domain: domain,
  });

  if (refresh_token) {
    cookieStore.set("refresh_token", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      domain,
    });
  }
}
