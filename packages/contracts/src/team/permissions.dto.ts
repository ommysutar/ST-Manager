export interface PermissionResponseDto {
  key: string;
  label: string;
  category: string;
}

export interface RoleDefinitionResponseDto {
  name: string;
  label: string;
  isSystem: boolean;
  permissions: string[];
}

export interface ListPermissionsResponseDto {
  success: true;
  data: PermissionResponseDto[];
}

export interface ListRolesResponseDto {
  success: true;
  data: RoleDefinitionResponseDto[];
}
