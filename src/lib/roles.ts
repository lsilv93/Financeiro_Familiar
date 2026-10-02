export const ROLE_LABELS = { HUSBAND: "Marido", WIFE: "Mulher", CHILD: "Filho(a)" } as const;
export type RoleKey = keyof typeof ROLE_LABELS;
