export type LoginType = {
  id: string;
  isAdmin: boolean;
  /** Expiration time in seconds since 1.1.1970 */
  exp: number;
};
