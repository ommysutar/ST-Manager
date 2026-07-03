export interface JwtTokenPayload {
  sub: string;
  email: string;
  role: string;
  type: "access" | "refresh";
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}
