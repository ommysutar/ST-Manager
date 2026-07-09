export interface AuthUserDto {
  id: string;
  email: string;
  role: string;
  fullName?: string | null;
  studioId?: string | null;
  status?: string;
}
