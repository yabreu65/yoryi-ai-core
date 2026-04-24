export type Permission = string;

export type ActorContext = {
  actorId: string;
  userId: string;
  permissions: Permission[];
  roles?: string[];
};